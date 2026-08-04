// ============================================================
// AUTH ROUTER — email/password + sessions (Sequence 3, 2026-06-05)
//
// Replaces the WorkOS-backed router. Adds login / register / logout
// as tRPC mutations that set/clear req.session.userId. The existing
// me / updateTimezone / admin user-management procedures are kept.
//
// First account created (or any matching SEED_SUPER_ADMIN_EMAIL)
// becomes sysadmin so the app can be bootstrapped with no seed step.
// ============================================================

import crypto from 'node:crypto';
import { z } from 'zod';
import { eq, and, isNull, sql } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure, protectedProcedure } from '../trpc.js';
import { users, userManagers } from '../db/schema/core.js';
import { jobTitles } from '../db/schema/jobTitles.js';
import { departments } from '../db/schema/departments.js';
import { passwordResetTokens } from '../db/schema/passwordResetTokens.js';
import { okrNodes } from '../db/schema/okr.js';
import { requireAdmin } from '../services/permissions.js';
import { legacyFieldsFor, effectiveLevelOf, type AccessLevel } from '../services/access.js';
import { hashPassword, verifyPassword, mintToken } from '../auth.js';
import { sendEmail } from '../services/email.js';
import { env } from '../env.js';

export const authRouter = router({
  // Current user — or null if unauthenticated.
  me: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.user) return null;
    const dbUser = await ctx.db.query.users.findFirst({
      where: eq(users.id, ctx.user.id),
      columns: { id: true, name: true, email: true, role: true, accessLevel: true, isBeta: true, isHrAccess: true, leaderBadge: true, timezone: true, avatarUrl: true },
    });
    if (!dbUser) return null;
    // While a sysadmin is previewing another level, report the PREVIEWED level
    // as accessLevel so every client-side check behaves as that level would.
    // realAccessLevel keeps the stored value for the "stop previewing" banner.
    const effective = await effectiveLevelOf(ctx.db, dbUser.id, ctx.req.session?.previewLevel);
    return {
      ...dbUser,
      accessLevel: effective ?? dbUser.accessLevel,
      realAccessLevel: dbUser.accessLevel,
      previewing: (effective ?? dbUser.accessLevel) !== dbUser.accessLevel,
    };
  }),

  // ── Register a new account (email/password) ────────────────
  // The first account, or one matching SEED_SUPER_ADMIN_EMAIL, becomes
  // sysadmin. Sets the session so the user is logged in immediately.
  register: publicProcedure
    .input(z.object({
      email: z.string().email(),
      password: z.string().min(8, 'Password must be at least 8 characters'),
      name: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const email = input.email.toLowerCase();
      const existing = await ctx.db.query.users.findFirst({ where: eq(users.email, email) });
      if (existing) throw new TRPCError({ code: 'CONFLICT', message: 'An account with that email already exists. Try signing in.' });

      const countRes = await ctx.db.select({ c: sql<number>`count(*)` }).from(users);
      const isFirstUser = Number(countRes[0]?.c ?? 0) === 0;
      const seedEmail = env.SEED_SUPER_ADMIN_EMAIL;
      const role = (isFirstUser || (!!seedEmail && email === seedEmail)) ? 'sysadmin' : 'user';

      const passwordHash = await hashPassword(input.password);
      const [u] = await ctx.db.insert(users).values({
        sub: `local:${email}`,            // local identity id (replaces WorkOS sub)
        email,
        name: input.name ?? null,
        role,
        passwordHash,
        lastLoginAt: new Date(),
      }).returning();

      ctx.req.session.userId = u.id;
      return { success: true, role, token: mintToken(u.id) };
    }),

  // ── Log in ─────────────────────────────────────────────────
  login: publicProcedure
    .input(z.object({ email: z.string().email(), password: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const email = input.email.toLowerCase();
      const u = await ctx.db.query.users.findFirst({ where: eq(users.email, email) });
      const bad = () => new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid email or password' });
      if (!u || !u.passwordHash || !u.isActive) throw bad();
      const ok = await verifyPassword(input.password, u.passwordHash);
      if (!ok) throw bad();

      ctx.req.session.userId = u.id;
      await ctx.db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, u.id));
      return { success: true, token: mintToken(u.id) };
    }),

  // ── Log out ────────────────────────────────────────────────
  logout: publicProcedure.mutation(async ({ ctx }) => {
    await new Promise<void>((resolve) => {
      ctx.req.session.destroy(() => resolve());
    });
    ctx.res.clearCookie('tmpl.sid');
    return { success: true };
  }),

  // ── Update own profile (display name + avatar) ──────────
  updateProfile: protectedProcedure
    .input(z.object({ name: z.string().max(255).optional(), avatarUrl: z.string().nullable().optional() }))
    .mutation(async ({ ctx, input }) => {
      // Display name is part of the HR-owned person record as of 2026-08-03.
      // The profile picture is not — everyone sets their own.
      if (input.name !== undefined) {
        const me = await ctx.db.query.users.findFirst({
          where: eq(users.id, ctx.user.id), columns: { accessLevel: true },
        });
        const lvl = me?.accessLevel ?? 'user';
        if (lvl !== 'hr' && lvl !== 'sysadmin') {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Your name is maintained by HR. Contact them to change it.',
          });
        }
      }
      const updates: Record<string, unknown> = {};
      if (input.name !== undefined) updates.name = input.name.trim() || null;
      if (input.avatarUrl !== undefined) updates.avatarUrl = input.avatarUrl || null;
      if (Object.keys(updates).length === 0) return { success: true };
      await ctx.db.update(users).set({ ...updates, updatedAt: new Date() }).where(eq(users.id, ctx.user.id));
      return { success: true };
    }),

  // ── Forgot password: request a reset email ────────────────
  // Public. Always returns success — never reveals whether an email is
  // registered (prevents account enumeration). If the account exists, is
  // active, and has a password set, a single-use 1-hour token is emailed.
  requestPasswordReset: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ ctx, input }) => {
      const email = input.email.toLowerCase().trim();
      const u = await ctx.db.query.users.findFirst({ where: eq(users.email, email) });
      if (u && u.isActive && u.passwordHash) {
        // Raw token goes only in the email link; we store its SHA-256 hash.
        const rawToken = crypto.randomBytes(32).toString('base64url');
        const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        // Invalidate any earlier unused tokens for this user.
        await ctx.db.update(passwordResetTokens)
          .set({ usedAt: new Date() })
          .where(and(eq(passwordResetTokens.userId, u.id), isNull(passwordResetTokens.usedAt)));
        await ctx.db.insert(passwordResetTokens).values({ userId: u.id, tokenHash, expiresAt });

        // Build an absolute link from the incoming request's origin so it
        // works on any deployment (dev / prod) without an env var.
        const h = ctx.req.headers;
        const origin = (h.origin as string)
          || (h.referer ? new URL(h.referer as string).origin : `https://${h.host}`);
        const link = `${origin}/reset-password?token=${rawToken}`;

        await sendEmail({
          to: u.email,
          subject: 'Reset your AI Engagement password',
          templateId: 'password_reset',
          html: `<p>Hi ${u.name ?? 'there'},</p>
<p>We received a request to reset your AI Engagement password. Click the button below to choose a new one. This link expires in <strong>1 hour</strong> and can be used once.</p>
<p><a href="${link}" style="display:inline-block;padding:10px 18px;background:#2E89B8;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">Reset your password</a></p>
<p style="color:#667;font-size:13px;">Or paste this link into your browser:<br>${link}</p>
<p style="color:#667;font-size:13px;">If you didn't request this, you can safely ignore this email — your password won't change.</p>`,
        });
      }
      // Uniform response regardless of whether the account exists.
      return { success: true };
    }),

  // ── Forgot password: complete the reset with a token ──────
  // Public. Validates the token (hash match, unused, unexpired), sets the
  // new password, and burns the token.
  resetPassword: publicProcedure
    .input(z.object({
      token: z.string().min(1),
      newPassword: z.string().min(8, 'Password must be at least 8 characters'),
    }))
    .mutation(async ({ ctx, input }) => {
      const tokenHash = crypto.createHash('sha256').update(input.token).digest('hex');
      const invalid = () => new TRPCError({
        code: 'BAD_REQUEST',
        message: 'This reset link is invalid or has expired. Please request a new one.',
      });
      const row = await ctx.db.query.passwordResetTokens.findFirst({
        where: and(eq(passwordResetTokens.tokenHash, tokenHash), isNull(passwordResetTokens.usedAt)),
      });
      if (!row) throw invalid();
      if (row.expiresAt.getTime() < Date.now()) throw invalid();

      await ctx.db.update(users)
        .set({ passwordHash: await hashPassword(input.newPassword), updatedAt: new Date() })
        .where(eq(users.id, row.userId));
      await ctx.db.update(passwordResetTokens)
        .set({ usedAt: new Date() })
        .where(eq(passwordResetTokens.id, row.id));

      return { success: true };
    }),

  // ── Change own password ────────────────────────────────────
  changePassword: protectedProcedure
    .input(z.object({ currentPassword: z.string().min(1), newPassword: z.string().min(8) }))
    .mutation(async ({ ctx, input }) => {
      const u = await ctx.db.query.users.findFirst({ where: eq(users.id, ctx.user.id) });
      if (!u || !u.passwordHash) throw new TRPCError({ code: 'BAD_REQUEST', message: 'No password set for this account' });
      const ok = await verifyPassword(input.currentPassword, u.passwordHash);
      if (!ok) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Current password is incorrect' });
      await ctx.db.update(users)
        .set({ passwordHash: await hashPassword(input.newPassword), updatedAt: new Date() })
        .where(eq(users.id, ctx.user.id));
      return { success: true };
    }),

  // Update own timezone — called from frontend on app load.
  updateTimezone: protectedProcedure
    .input(z.object({ timezone: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.update(users)
        .set({ timezone: input.timezone, lastActiveAt: new Date() })
        .where(eq(users.id, ctx.user.id));
      return { success: true };
    }),

  // Admin: list all users (password hashes never exposed).
  listUsers: protectedProcedure
    .use(requireAdmin)
    .query(async ({ ctx }) => {
      const [rows, mgrRows] = await Promise.all([
        ctx.db.query.users.findMany({
          columns: {
            id: true, sub: true, externalId: true, name: true, email: true, title: true, role: true, accessLevel: true,
            jobTitleId: true, departmentId: true, managerId: true, leaderBadge: true,
            location: true, businessUnit: true, eltLeader: true, hireYear: true, hireMonth: true, hireDay: true,
            connectionType: true, isActive: true, isBeta: true, isHrAccess: true, timezone: true, archivedAt: true,
            lastActiveAt: true, lastLoginAt: true,
          },
        }),
        ctx.db.select({ userId: userManagers.userId, managerId: userManagers.managerId }).from(userManagers),
      ]);
      const byUser = new Map<string, string[]>();
      for (const m of mgrRows) {
        const arr = byUser.get(m.userId) ?? [];
        arr.push(m.managerId);
        byUser.set(m.userId, arr);
      }
      return rows.map((u) => ({ ...u, managerIds: byUser.get(u.id) ?? (u.managerId ? [u.managerId] : []) }));
    }),

  // Admin: update a user's app-level fields.
  updateUser: protectedProcedure
    .use(requireAdmin)
    .input(z.object({
      id: z.string().uuid(),
      name: z.string().nullable().optional(),
      email: z.string().email('Enter a valid email address.').optional(),
      title: z.string().optional(),
      externalId: z.string().nullable().optional(),
      jobTitleId: z.string().uuid().nullable().optional(),
      departmentId: z.string().uuid().nullable().optional(),
      managerId: z.string().uuid().nullable().optional(),
      leaderBadge: z.enum(['ELT', 'SLT', 'ST6']).nullable().optional(),
      isHrAccess: z.boolean().optional(),
      managerIds: z.array(z.string().uuid()).optional(),
      primaryManagerId: z.string().uuid().nullable().optional(),
      location: z.string().nullable().optional(),
      businessUnit: z.string().nullable().optional(),
      eltLeader: z.string().nullable().optional(),
      hireYear: z.number().int().nullable().optional(),
      hireMonth: z.number().int().nullable().optional(),
      hireDay: z.number().int().nullable().optional(),
      role: z.enum(['user', 'manager', 'admin', 'sysadmin']).optional(),
      accessLevel: z.enum(['sysadmin', 'elt', 'slt', 'hr', 'admin', 'manager', 'user']).optional(),
      isActive: z.boolean().optional(),
      isBeta: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Don't let an admin set their own account inactive — the auth layer
      // treats an inactive account as unauthenticated, so this would lock the
      // current user out of their own session ("Not authenticated").
      if (input.id === ctx.user.id && input.isActive === false) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: "You can't set your own account to inactive — you'd be locked out of the app." });
      }
      const { id, managerIds, primaryManagerId, ...rest } = input;
      const updates: Record<string, unknown> = { ...rest };
      // Setting the access level rewrites the legacy trio so the two models
      // cannot drift while both are live.
      if (typeof updates.accessLevel === 'string') {
        Object.assign(updates, legacyFieldsFor(updates.accessLevel as AccessLevel));
      }
      // Manager set: unify legacy single managerId with the new managerIds[] +
      // primaryManagerId. users.managerId stays the PRIMARY (drives the tree).
      let managerSet: string[] | undefined;
      let primaryManager: string | null | undefined;
      if (managerIds !== undefined) {
        managerSet = Array.from(new Set(managerIds));
        primaryManager = primaryManagerId ?? managerSet[0] ?? null;
        if (primaryManager && !managerSet.includes(primaryManager)) managerSet.push(primaryManager);
      } else if ('managerId' in rest) {
        // Inline "Manager" dropdown = set the PRIMARY manager. Preserve any
        // additional managers already on the person; only "—" (null) clears them.
        const mid = (rest.managerId as string | null) ?? null;
        primaryManager = mid;
        if (mid === null) {
          managerSet = [];
        } else {
          const existing = await ctx.db.select({ m: userManagers.managerId }).from(userManagers).where(eq(userManagers.userId, id));
          const setIds = new Set(existing.map((r) => r.m));
          setIds.add(mid);
          managerSet = Array.from(setIds);
        }
      }
      if (managerSet !== undefined) updates.managerId = primaryManager ?? null;
      // Email is unique per exact string — normalize and reject a collision with a different employee.
      if (typeof updates.email === 'string') {
        const email = updates.email.toLowerCase().trim();
        const clash = await ctx.db.query.users.findFirst({ where: eq(users.email, email) });
        if (clash && clash.id !== id) {
          throw new TRPCError({ code: 'CONFLICT', message: 'Another employee already uses that email.' });
        }
        updates.email = email;
      }
      if (typeof updates.name === 'string') {
        updates.name = updates.name.trim() || null;
      }
      const [user] = await ctx.db.update(users)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(users.id, id))
        .returning();
      if (!user) throw new TRPCError({ code: 'NOT_FOUND' });
      // Keep the one live denormalized copy of an employee's name in sync — the
      // OKR owner display label. Everything else (org tree, PIPs, reviews,
      // coaching, people pickers) resolves the employee live by id, so it
      // reflects edits automatically. Historical survey submissions keep the
      // name captured at submission time and are intentionally NOT rewritten.
      if ('name' in updates) {
        await ctx.db.update(okrNodes).set({ owner: user.name }).where(eq(okrNodes.ownerUserId, id));
      }
      if (managerSet !== undefined) {
        await ctx.db.delete(userManagers).where(eq(userManagers.userId, id));
        if (managerSet.length) {
          await ctx.db.insert(userManagers).values(managerSet.map((mId) => ({ userId: id, managerId: mId })));
        }
      }
      return user;
    }),

  // Admin: permanently delete an employee (hard delete). The org-tree self-link
  // (users.managerId) and most child records (reviews, coaching, PIPs, surveys,
  // OKR ownership) are ON DELETE SET NULL / CASCADE, so removing someone detaches
  // their reports and clears their own records automatically. A person with
  // retained activity in restrict-only tables (feedback, telemetry, AI logs,
  // audit trails) cannot be hard-deleted — Postgres raises a FK violation, which
  // we surface as a friendly "set them Inactive instead" message so live history
  // is never silently destroyed.
  // Archive / restore an employee. The safe counterpart to deleteUser: the person
  // drops out of the working directory and every headcount, but their reviews,
  // coaching plans, PIPs and survey responses are left untouched. Archiving also
  // clears isActive, so the surfaces that already filter on it (org tree,
  // engagement eligibility, assignment pickers) exclude archived people for free.
  setUserArchived: protectedProcedure
    .use(requireAdmin)
    .input(z.object({ id: z.string().uuid(), archived: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      if (input.id === ctx.user.id) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: "You can't archive your own account." });
      }
      const target = await ctx.db.query.users.findFirst({ where: eq(users.id, input.id) });
      if (!target) throw new TRPCError({ code: 'NOT_FOUND', message: 'Employee not found.' });
      await ctx.db.update(users)
        .set(input.archived
          ? { archivedAt: new Date(), isActive: false, updatedAt: new Date() }
          : { archivedAt: null, isActive: true, updatedAt: new Date() })
        .where(eq(users.id, input.id));
      return { success: true, id: input.id, archived: input.archived };
    }),

  deleteUser: protectedProcedure
    .use(requireAdmin)
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (input.id === ctx.user.id) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: "You can't delete your own account." });
      }
      const target = await ctx.db.query.users.findFirst({ where: eq(users.id, input.id) });
      if (!target) throw new TRPCError({ code: 'NOT_FOUND', message: 'Employee not found.' });
      try {
        await ctx.db.delete(users).where(eq(users.id, input.id));
      } catch (err: any) {
        // Postgres FK violation (restrict FK) — this person has retained activity.
        if (err?.code === '23503' || /foreign key/i.test(err?.message ?? '')) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: `${target.name ?? target.email ?? 'This employee'} has activity records that can't be removed. Set them to Inactive instead.`,
          });
        }
        throw err;
      }
      return { success: true, id: input.id };
    }),

  // Admin: create a new employee (directory record on the users table). The org
  // tree IS the users table (users.managerId), so "add employee" = insert a user.
  // sub follows register()'s local-identity convention. A temp password is
  // optional — omit it and the record is directory-only until an admin sets one
  // via resetUserPassword (the existing recovery path).
  // Bulk CSV import of employees (admin). Columns: email (required), name, role,
  // title, department, manager (email or name), leaderBadge. Two passes so a
  // manager listed later in the file still resolves. Existing users (by email)
  // are updated — but ONLY for columns the CSV actually provides, so partial
  // files never wipe roles/assignments. New users are created as local accounts
  // with no password (they set one via the normal reset flow).
  importUsers: protectedProcedure
    .use(requireAdmin)
    .input(z.object({
      rows: z.array(z.object({
        email: z.string(),
        name: z.string().optional(),
        role: z.string().optional(),
        accesslevel: z.string().optional(),
        accessLevel: z.string().optional(),
        title: z.string().optional(),
        department: z.string().optional(),
        manager: z.string().optional(),
        leaderbadge: z.string().optional(),
        leaderBadge: z.string().optional(),
        team: z.string().optional(),
        location: z.string().optional(),
        businessunit: z.string().optional(),
        businessUnit: z.string().optional(),
        startdate: z.string().optional(),
        startDate: z.string().optional(),
        start_date: z.string().optional(),
      })).max(5000),
    }))
    .mutation(async ({ ctx, input }) => {
      let added = 0; let updated = 0; let skipped = 0; const errors: string[] = [];
      const LEVELS = new Set(['sysadmin', 'elt', 'slt', 'hr', 'admin', 'manager', 'user']);
      // Legacy columns still accepted so existing CSVs keep working: a file with
      // role=manager or leaderBadge=ELT maps onto the new single level. An
      // explicit accessLevel column wins. ST6 is retired and maps to admin.
      const fromLegacy = (role: string, badge: string): string => {
        if (badge === 'ELT') return 'elt';
        if (badge === 'SLT') return 'slt';
        if (badge === 'ST6') return 'admin';
        return LEVELS.has(role) ? role : 'user';
      };

      const [allUsers, allTitles, allDepts] = await Promise.all([
        ctx.db.query.users.findMany(),
        ctx.db.query.jobTitles.findMany(),
        ctx.db.query.departments.findMany(),
      ]);
      const titleId = new Map(allTitles.map((t) => [t.title.trim().toLowerCase(), t.id]));
      const deptId = new Map(allDepts.map((d) => [d.name.trim().toLowerCase(), d.id]));
      const idByEmail = new Map(allUsers.map((u) => [u.email.toLowerCase(), u.id]));
      const idByName = new Map(allUsers.filter((u) => u.name).map((u) => [u.name!.trim().toLowerCase(), u.id]));

      const parseStart = (v?: string): { y: number | null; m: number | null; d: number | null } => {
        const raw = (v ?? '').trim();
        if (!raw) return { y: null, m: null, d: null };
        if (/^\d{4}$/.test(raw)) return { y: Number(raw), m: null, d: null };
        let mm = raw.match(/^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?$/);
        if (mm) return { y: +mm[1], m: +mm[2], d: mm[3] ? +mm[3] : null };
        mm = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (mm) return { y: +mm[3], m: +mm[1], d: +mm[2] };
        const dt = new Date(raw);
        if (!isNaN(dt.getTime())) return { y: dt.getFullYear(), m: dt.getMonth() + 1, d: dt.getDate() };
        return { y: null, m: null, d: null };
      };
      const norm = input.rows.map((r) => {
        const roleRaw = (r.role ?? '').trim().toLowerCase();
        const levelRaw = (r.accessLevel ?? r.accesslevel ?? '').trim().toLowerCase();
        const start = parseStart(r.startDate ?? r.startdate ?? r.start_date);
        const badgeRaw = (r.leaderBadge ?? r.leaderbadge ?? '').trim().toUpperCase();
        const titleRaw = (r.title ?? '').trim();
        const deptRaw = (r.department ?? '').trim();
        return {
          email: (r.email ?? '').trim().toLowerCase(),
          name: r.name?.trim() || '',
          levelProvided: !!(levelRaw || roleRaw || badgeRaw),
          accessLevel: levelRaw && LEVELS.has(levelRaw) ? levelRaw : fromLegacy(roleRaw, badgeRaw),
          titleRaw, jobTitleId: titleRaw ? (titleId.get(titleRaw.toLowerCase()) ?? null) : null,
          deptRaw, departmentId: deptRaw ? (deptId.get(deptRaw.toLowerCase()) ?? null) : null,
          managerRef: r.manager?.trim() || '',

          team: (r.team ?? '').trim() || null,
          location: (r.location ?? '').trim() || null,
          businessUnit: (r.businessUnit ?? r.businessunit ?? '').trim() || null,
          hireYear: start.y, hireMonth: start.m, hireDay: start.d,
          startProvided: !!(r.startDate ?? r.startdate ?? r.start_date)?.trim(),
        };
      });

      // Pass 1 — create/update users (no manager yet).
      for (const r of norm) {
        if (!r.email || !r.email.includes('@')) { skipped++; if (r.email) errors.push(`${r.email}: invalid email`); continue; }
        if (r.titleRaw && !r.jobTitleId) errors.push(`${r.email}: unknown title "${r.titleRaw}"`);
        if (r.deptRaw && !r.departmentId) errors.push(`${r.email}: unknown department "${r.deptRaw}"`);
        try {
          const existingId = idByEmail.get(r.email);
          if (existingId) {
            const upd: Record<string, unknown> = { updatedAt: new Date() };
            if (r.name) upd.name = r.name;
            if (r.levelProvided) Object.assign(upd, { accessLevel: r.accessLevel }, legacyFieldsFor(r.accessLevel as AccessLevel));
            if (r.titleRaw) upd.jobTitleId = r.jobTitleId;
            if (r.deptRaw) upd.departmentId = r.departmentId;
            if (r.team !== null) upd.team = r.team;
            if (r.location !== null) upd.location = r.location;
            if (r.businessUnit !== null) upd.businessUnit = r.businessUnit;
            if (r.startProvided) { upd.hireYear = r.hireYear; upd.hireMonth = r.hireMonth; upd.hireDay = r.hireDay; }
            await ctx.db.update(users).set(upd).where(eq(users.id, existingId));
            updated++;
          } else {
            const [u] = await ctx.db.insert(users).values({
              sub: `local:${r.email}`, email: r.email, name: r.name || null,
              ...legacyFieldsFor(r.accessLevel as AccessLevel),
              accessLevel: r.accessLevel,
              jobTitleId: r.jobTitleId, departmentId: r.departmentId,
              team: r.team, location: r.location, businessUnit: r.businessUnit,
              hireYear: r.hireYear, hireMonth: r.hireMonth, hireDay: r.hireDay,
              isActive: true, passwordHash: null,
            }).returning();
            idByEmail.set(r.email, u.id);
            if (r.name) idByName.set(r.name.toLowerCase(), u.id);
            added++;
          }
        } catch (e) { errors.push(`${r.email}: ${e instanceof Error ? e.message : 'write failed'}`); }
      }

      // Pass 2 — resolve managers by email (preferred) or name.
      for (const r of norm) {
        if (!r.managerRef) continue;
        const uid = idByEmail.get(r.email);
        if (!uid) continue;
        const ref = r.managerRef.toLowerCase();
        const mid = idByEmail.get(ref) ?? idByName.get(ref) ?? null;
        if (!mid) { errors.push(`${r.email}: manager "${r.managerRef}" not found`); continue; }
        if (mid === uid) continue;
        try {
          await ctx.db.update(users).set({ managerId: mid, updatedAt: new Date() }).where(eq(users.id, uid));
          await ctx.db.delete(userManagers).where(eq(userManagers.userId, uid));
          await ctx.db.insert(userManagers).values({ userId: uid, managerId: mid });
        } catch { errors.push(`${r.email}: manager link failed`); }
      }

      return { added, updated, skipped, errors: errors.slice(0, 50) };
    }),

  createUser: protectedProcedure
    .use(requireAdmin)
    .input(z.object({
      email: z.string().email(),
      name: z.string().optional(),
      role: z.enum(['user', 'manager', 'admin', 'sysadmin']).optional(),
      accessLevel: z.enum(['sysadmin', 'elt', 'slt', 'hr', 'admin', 'manager', 'user']).optional(),
      jobTitleId: z.string().uuid().nullable().optional(),
      departmentId: z.string().uuid().nullable().optional(),
      managerId: z.string().uuid().nullable().optional(),
      leaderBadge: z.enum(['ELT', 'SLT', 'ST6']).nullable().optional(),
      isActive: z.boolean().optional(),
      tempPassword: z.string().min(8, 'Temp password must be at least 8 characters').optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const email = input.email.toLowerCase();
      const existing = await ctx.db.query.users.findFirst({ where: eq(users.email, email) });
      if (existing) throw new TRPCError({ code: 'CONFLICT', message: 'An employee with that email already exists.' });
      const [user] = await ctx.db.insert(users).values({
        sub: `local:${email}`,
        email,
        name: input.name?.trim() || null,
        ...legacyFieldsFor((input.accessLevel ?? 'user') as AccessLevel),
        accessLevel: input.accessLevel ?? 'user',
        jobTitleId: input.jobTitleId ?? null,
        departmentId: input.departmentId ?? null,
        managerId: input.managerId ?? null,
        leaderBadge: input.leaderBadge ?? null,
        isActive: input.isActive ?? true,
        passwordHash: input.tempPassword ? await hashPassword(input.tempPassword) : null,
      }).returning();
      if (input.managerId) {
        await ctx.db.insert(userManagers).values({ userId: user.id, managerId: input.managerId });
      }
      return { id: user.id, email: user.email, name: user.name };
    }),

  // Admin: reset ANOTHER user's password (no current password required).
  // This is the recovery path for locked-out users, since there is no
  // email-based "forgot password". Admin/sysadmin only (requireAdmin).
  resetUserPassword: protectedProcedure
    .use(requireAdmin)
    .input(z.object({ userId: z.string().uuid(), newPassword: z.string().min(8) }))
    .mutation(async ({ ctx, input }) => {
      const target = await ctx.db.query.users.findFirst({ where: eq(users.id, input.userId) });
      if (!target) throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
      await ctx.db.update(users)
        .set({ passwordHash: await hashPassword(input.newPassword), updatedAt: new Date() })
        .where(eq(users.id, input.userId));
      return { success: true };
    }),
});

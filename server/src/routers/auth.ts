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
import { passwordResetTokens } from '../db/schema/passwordResetTokens.js';
import { okrNodes } from '../db/schema/okr.js';
import { requireAdmin } from '../services/permissions.js';
import { hashPassword, verifyPassword, mintToken } from '../auth.js';
import { sendEmail } from '../services/email.js';
import { env } from '../env.js';

export const authRouter = router({
  // Current user — or null if unauthenticated.
  me: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.user) return null;
    const dbUser = await ctx.db.query.users.findFirst({
      where: eq(users.id, ctx.user.id),
      columns: { id: true, name: true, email: true, role: true, isBeta: true, isHrAccess: true, leaderBadge: true, timezone: true, avatarUrl: true },
    });
    return dbUser ?? null;
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
            id: true, sub: true, externalId: true, name: true, email: true, title: true, role: true,
            jobTitleId: true, departmentId: true, managerId: true, leaderBadge: true,
            connectionType: true, isActive: true, isBeta: true, isHrAccess: true, timezone: true,
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
      jobTitleId: z.string().uuid().nullable().optional(),
      departmentId: z.string().uuid().nullable().optional(),
      managerId: z.string().uuid().nullable().optional(),
      leaderBadge: z.enum(['ELT', 'SLT', 'ST6']).nullable().optional(),
      isHrAccess: z.boolean().optional(),
      managerIds: z.array(z.string().uuid()).optional(),
      primaryManagerId: z.string().uuid().nullable().optional(),
      role: z.enum(['user', 'manager', 'admin', 'sysadmin']).optional(),
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
  createUser: protectedProcedure
    .use(requireAdmin)
    .input(z.object({
      email: z.string().email(),
      name: z.string().optional(),
      role: z.enum(['user', 'manager', 'admin', 'sysadmin']).optional(),
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
        role: input.role ?? 'user',
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

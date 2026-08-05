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
import { ACCESS_LEVELS } from '../db/schema/accessControl.js';
import { hashPassword, verifyPassword, mintToken } from '../auth.js';
import { sendEmail } from '../services/email.js';
import { defaultPasswordFor, REQUIRE_PASSWORD_CHANGE_ON_FIRST_LOGIN } from '../services/activation.js';
import { env } from '../env.js';

// ── Sign-in throttle (AIE 2026-08-05) ────────────────────────
// The phase-1 first-time password is derived from a person's name, so an
// unthrottled login endpoint is a practical guessing channel rather than a
// theoretical one. In-memory and per-process: it resets on deploy and is not
// shared across instances, which is fine for what it is — a brake on scripted
// guessing, not a security boundary. Replace with a shared store if the app ever
// runs more than one instance.
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_FAILURES = 10;
const loginFailures = new Map<string, { count: number; first: number }>();

function throttleKey(ip: string | undefined): string { return ip || 'unknown'; }

function checkLoginThrottle(ip: string | undefined): void {
  const rec = loginFailures.get(throttleKey(ip));
  if (!rec) return;
  if (Date.now() - rec.first > LOGIN_WINDOW_MS) { loginFailures.delete(throttleKey(ip)); return; }
  if (rec.count >= LOGIN_MAX_FAILURES) {
    throw new TRPCError({
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many failed attempts. Wait a few minutes and try again.',
    });
  }
}

function noteLoginFailure(ip: string | undefined): void {
  const k = throttleKey(ip);
  const rec = loginFailures.get(k);
  if (!rec || Date.now() - rec.first > LOGIN_WINDOW_MS) loginFailures.set(k, { count: 1, first: Date.now() });
  else rec.count++;
  // Keep the map from growing without bound on a long-running process.
  if (loginFailures.size > 5000) {
    const cutoff = Date.now() - LOGIN_WINDOW_MS;
    for (const [key, v] of loginFailures) if (v.first < cutoff) loginFailures.delete(key);
  }
}

// A bcrypt hash of a value nobody will ever submit. Compared against when the
// account does not exist, so a miss costs the same ~100ms as a real check and the
// endpoint stops being an account-existence oracle.
const TIMING_EQUALISER_HASH = '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';

// ── Access level input, single-sourced (AIE 2026-08-05) ───────
// Migration 0102 collapsed seven levels to five, but this router kept its own
// hand-written list of seven in four places (importUsers, createUser,
// updateUser, and the hint text on the Employees page). A value outside
// ACCESS_LEVELS is unknown to both capsFor() and the reach grid, and both fail
// closed — so importing someone as `SLT` or `admin` silently left them with no
// navigation at all. There is now ONE list, and the two retired names are
// TRANSLATED rather than accepted, matching exactly what 0102 did to the rows
// already in the table.
const RETIRED_LEVEL_MAP: Record<string, AccessLevel> = { slt: 'elt', admin: 'sysadmin' };

const accessLevelInput = z.string().transform((raw, ctx) => {
  const v = raw.trim().toLowerCase();
  if ((ACCESS_LEVELS as readonly string[]).includes(v)) return v as AccessLevel;
  const mapped = RETIRED_LEVEL_MAP[v];
  if (mapped) return mapped;
  ctx.addIssue({
    code: z.ZodIssueCode.custom,
    message: `"${raw}" is not an access level. Use one of: ${ACCESS_LEVELS.join(', ')}.`,
  });
  return z.NEVER;
});

/**
 * Same translation for the bulk import path, which must not reject a whole file
 * over one bad cell. Returns the resolved level plus a warning to surface on the
 * row, so a retired value is visible rather than a silent promotion.
 */
export function resolveAccessLevel(raw: string | undefined | null): { level: AccessLevel; warning?: string } {
  const v = (raw ?? '').trim().toLowerCase();
  if (!v) return { level: 'user' };
  if ((ACCESS_LEVELS as readonly string[]).includes(v)) return { level: v as AccessLevel };
  const mapped = RETIRED_LEVEL_MAP[v];
  if (mapped) {
    return { level: mapped, warning: `access level "${raw}" was retired on 2026-08-03 — imported as "${mapped}"` };
  }
  return { level: 'user', warning: `unknown access level "${raw}" — imported as "user"` };
}

export const authRouter = router({
  // Current user — or null if unauthenticated.
  me: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.user) return null;
    const dbUser = await ctx.db.query.users.findFirst({
      where: eq(users.id, ctx.user.id),
      columns: {
        id: true, name: true, email: true, role: true, accessLevel: true, isBeta: true, isHrAccess: true,
        leaderBadge: true, timezone: true, avatarUrl: true,
        // Phase-1 activation: the client routes every page to /set-password
        // while mustChangePassword is true.
        loginEnabled: true, mustChangePassword: true,
      },
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

      const countRes = await ctx.db.select({ c: sql<number>`count(*)` }).from(users);
      const isFirstUser = Number(countRes[0]?.c ?? 0) === 0;

      // ── Self-registration is CLOSED (AIE 2026-08-05) ─────────
      // This was an open publicProcedure with no domain restriction and no
      // approval step, so anyone who reached the app URL could mint themselves a
      // working account — on an app holding assessment scores, PIPs and exit
      // surveys. It also undercut the whole point of sysadmin-controlled
      // activation. Accounts now arrive from the roster import or Core Data ->
      // Employees, and a sysadmin activates them.
      //
      // Two deliberate exceptions: a completely empty database still needs a way
      // to create its first sysadmin, and SELF_REGISTRATION_DOMAIN reopens
      // sign-up for one email domain if that is ever wanted again.
      if (!isFirstUser) {
        const allowedDomain = env.SELF_REGISTRATION_DOMAIN;
        const domain = email.split('@')[1] ?? '';
        if (!allowedDomain || domain !== allowedDomain) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Accounts are created by your administrator. Ask them to switch on your access, then sign in with your name.',
          });
        }
      }

      const existing = await ctx.db.query.users.findFirst({ where: eq(users.email, email) });
      if (existing) throw new TRPCError({ code: 'CONFLICT', message: 'An account with that email already exists. Try signing in.' });

      const seedEmail = env.SEED_SUPER_ADMIN_EMAIL;
      const role = (isFirstUser || (!!seedEmail && email === seedEmail)) ? 'sysadmin' : 'user';

      const passwordHash = await hashPassword(input.password);
      const [u] = await ctx.db.insert(users).values({
        sub: `local:${email}`,            // local identity id (replaces WorkOS sub)
        email,
        name: input.name ?? null,
        role,
        accessLevel: role === 'sysadmin' ? 'sysadmin' : 'user',
        passwordHash,
        // They chose this password themselves, so they can sign in immediately.
        loginEnabled: true,
        mustChangePassword: false,
        lastLoginAt: new Date(),
      }).returning();

      ctx.req.session.userId = u.id;
      return { success: true, role, token: mintToken(u.id) };
    }),

  // ── Log in ─────────────────────────────────────────────────
  // Two ways to identify yourself: `userId`, chosen from the name picker on the
  // sign-in screen (phase 1), or `email` as before — the reset-link flow, the
  // bootstrap account and the REST tests all still use email.
  login: publicProcedure
    .input(z.object({
      email: z.string().email().optional(),
      userId: z.string().uuid().optional(),
      password: z.string().min(1),
    }).refine((v) => !!v.email !== !!v.userId, {
      message: 'Provide either an email address or a selected name, not both.',
    }))
    .mutation(async ({ ctx, input }) => {
      const ip = ctx.req.ip;
      checkLoginThrottle(ip);

      const u = input.userId
        ? await ctx.db.query.users.findFirst({ where: eq(users.id, input.userId) })
        : await ctx.db.query.users.findFirst({ where: eq(users.email, input.email!.toLowerCase()) });

      // One message for every failure mode. Which of these was false is exactly
      // the thing an attacker wants to learn.
      const bad = () => new TRPCError({ code: 'UNAUTHORIZED', message: 'That password is not right. Check it and try again.' });

      // Always spend the same time. Returning early on "no such account" made the
      // miss ~1ms against ~100ms for a real check, which is an existence oracle.
      const ok = await verifyPassword(input.password, u?.passwordHash ?? TIMING_EQUALISER_HASH);
      if (!u || !u.passwordHash || !u.isActive || !ok) { noteLoginFailure(ip); throw bad(); }

      // Phase-1 activation gate, checked AFTER the password so it cannot be used
      // to enumerate who has been activated. A correct password earns an honest
      // explanation; a wrong one learns nothing.
      if (!u.loginEnabled) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Your account is not switched on yet. Ask your administrator to enable your access.',
        });
      }

      loginFailures.delete(throttleKey(ip));
      ctx.req.session.userId = u.id;
      await ctx.db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, u.id));
      return { success: true, token: mintToken(u.id), mustChangePassword: u.mustChangePassword };
    }),

  // ── Sign-in name picker (phase 1, AIE 2026-08-05) ──────────
  // Returns activated accounts whose name matches what the person has typed, so
  // they can find themselves without knowing their email address.
  //
  // A SEARCH, NOT A LIST. The PM asked for a dropdown of active users; returning
  // the whole set from an unauthenticated endpoint would hand the staff directory
  // to anyone who loaded the login page. Three characters minimum, matched as a
  // PREFIX of a name part rather than a substring, and capped at 10.
  //
  // Be clear-eyed about what this is: a brake, not a boundary. Someone patient
  // enough to iterate prefixes can still enumerate activated names, so this
  // endpoint is not what protects the app — the mandatory password change and the
  // server-side gate in trpc.ts are. It returns no email address, so the roster's
  // addresses stay private either way, and the client sends the opaque id back to
  // `login`. Phase 2 (Microsoft sign-in) removes the need for it entirely.
  lookupForSignIn: publicProcedure
    .input(z.object({ query: z.string() }))
    .query(async ({ ctx, input }) => {
      const q = input.query.trim();
      if (q.length < 3) return [];
      const rows = await ctx.db.select({
        id: users.id,
        name: users.name,
        title: users.title,
      }).from(users)
        .where(and(
          eq(users.loginEnabled, true),
          eq(users.isActive, true),
          isNull(users.archivedAt),
          // Start of the name, or the start of any word within it — so "mill"
          // finds "Steven Miller" but "ill" does not.
          sql`(${users.name} ILIKE ${q + '%'} OR ${users.name} ILIKE ${'% ' + q + '%'})`,
        ))
        .orderBy(users.name)
        .limit(10);
      return rows;
    }),

  // ── Admin: switch login access on or off ───────────────────
  // On activation the account is given the derived first-time password and
  // flagged to choose its own. Returns that password so the sysadmin can hand it
  // over — it is derivable from the name anyway, so this reveals nothing new,
  // and having it on screen removes the guesswork.
  setLoginEnabled: protectedProcedure
    .use(requireAdmin)
    .input(z.object({
      userIds: z.array(z.string().uuid()).min(1).max(500),
      enabled: z.boolean(),
      // Re-issue the first-time password even if the person already has one.
      // Off by default so activating someone twice never destroys a password
      // they have chosen.
      resetPassword: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const results: Array<{ id: string; name: string | null; ok: boolean; password?: string; error?: string }> = [];

      for (const id of input.userIds) {
        const u = await ctx.db.query.users.findFirst({ where: eq(users.id, id) });
        if (!u) { results.push({ id, name: null, ok: false, error: 'No such employee.' }); continue; }

        if (!input.enabled) {
          await ctx.db.update(users)
            .set({ loginEnabled: false, updatedAt: new Date() })
            .where(eq(users.id, id));
          results.push({ id, name: u.name, ok: true });
          continue;
        }

        // Only mint a first-time password when there isn't one, unless asked.
        const needsPassword = !u.passwordHash || input.resetPassword === true;
        if (!needsPassword) {
          await ctx.db.update(users)
            .set({ loginEnabled: true, updatedAt: new Date() })
            .where(eq(users.id, id));
          results.push({ id, name: u.name, ok: true });
          continue;
        }

        let password: string;
        try {
          password = defaultPasswordFor(u.name);
        } catch (e) {
          // A name too short to make a safe password. Named failure, no account
          // left half-open.
          results.push({ id, name: u.name, ok: false, error: e instanceof Error ? e.message : 'Could not derive a password.' });
          continue;
        }

        await ctx.db.update(users).set({
          loginEnabled: true,
          passwordHash: await hashPassword(password),
          mustChangePassword: REQUIRE_PASSWORD_CHANGE_ON_FIRST_LOGIN,
          updatedAt: new Date(),
        }).where(eq(users.id, id));
        results.push({ id, name: u.name, ok: true, password });
      }

      const enabled = results.filter((r) => r.ok).length;
      return { results, succeeded: enabled, failed: results.length - enabled };
    }),

  // Everyone a sysadmin could activate: a current employee with no way in yet.
  // Drives the "activate everyone who hasn't been activated" button.
  notYetActivated: protectedProcedure
    .use(requireAdmin)
    .query(async ({ ctx }) => {
      return ctx.db.select({ id: users.id, name: users.name, title: users.title })
        .from(users)
        .where(and(eq(users.loginEnabled, false), eq(users.isActive, true), isNull(users.archivedAt)))
        .orderBy(users.name);
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
      // Keyed on loginEnabled, NOT on "already has a password" (AIE 2026-08-05).
      //
      // The old condition was `u.passwordHash`, which meant the people who most
      // needed a link — every roster row, created without one — were the only ones
      // who could not get it, and got a "we've sent you a link" message anyway.
      // resetPassword downstream never required an existing password, so this one
      // clause was the whole blocker. Now: activated people get a link whether or
      // not they have a password yet, and anyone a sysadmin has not switched on
      // gets nothing, because they are not a user yet.
      if (u && u.isActive && u.loginEnabled) {
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
        .set({
          passwordHash: await hashPassword(input.newPassword),
          // They have chosen their own password, so the first-time prompt is done.
          mustChangePassword: false,
          updatedAt: new Date(),
        })
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
      if (input.newPassword === input.currentPassword) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Choose a password different from your current one.' });
      }
      await ctx.db.update(users)
        .set({
          passwordHash: await hashPassword(input.newPassword),
          // Clears the first-login prompt — this is the route out of /set-password.
          mustChangePassword: false,
          updatedAt: new Date(),
        })
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
            loginEnabled: true, mustChangePassword: true,
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
      accessLevel: accessLevelInput.optional(),
      isActive: z.boolean().optional(),
      isBeta: z.boolean().optional(),
      // loginEnabled is DELIBERATELY not settable here. It goes through
      // setLoginEnabled, which mints the first-time password at the same time.
      // Setting it directly would leave login_enabled true with no password —
      // the person appears in the sign-in picker and can never get in.
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
      // Level resolution is single-sourced through resolveAccessLevel (top of
      // this file), which knows the five real levels and TRANSLATES the two
      // retired ones with a warning on the row. Before 2026-08-05 this block
      // carried its own hand-written set of seven, so a spreadsheet marked `SLT`
      // or `admin` wrote a level the reach grid does not recognise — and the grid
      // fails closed, leaving that person with no navigation at all.
      //
      // Legacy role / leaderBadge columns are still honoured so existing CSVs
      // keep working. An explicit accessLevel column wins. ST6 is retired.
      const fromLegacy = (role: string, badge: string): { level: AccessLevel; warning?: string } => {
        if (badge === 'ELT') return { level: 'elt' };
        if (badge === 'SLT') return { level: 'elt', warning: 'leader badge "SLT" was retired on 2026-08-03 — read as "elt"' };
        if (badge === 'ST6') return { level: 'sysadmin', warning: 'leader badge "ST6" was retired — read as "sysadmin"' };
        return resolveAccessLevel(role);
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
        const resolved = levelRaw ? resolveAccessLevel(levelRaw) : fromLegacy(roleRaw, badgeRaw);
        return {
          email: (r.email ?? '').trim().toLowerCase(),
          name: r.name?.trim() || '',
          levelProvided: !!(levelRaw || roleRaw || badgeRaw),
          accessLevel: resolved.level,
          levelWarning: resolved.warning,
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
        // A retired or unrecognised access level is reported on the row rather
        // than applied silently. Silently promoting someone to sysadmin because a
        // spreadsheet said "admin" is the worse of the two failures.
        if (r.levelWarning) errors.push(`${r.email}: ${r.levelWarning}`);
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
              // A roster row is an employee record, not an invitation: no
              // password and no way in until a sysadmin activates them.
              isActive: true, passwordHash: null, loginEnabled: false,
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
      accessLevel: accessLevelInput.optional(),
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
        // Giving someone a temporary password IS the activation — otherwise the
        // admin hands over a password that cannot be used and the person is
        // invisible to the sign-in picker until a second, undiscoverable step.
        // Somebody else chose it, so they are prompted to replace it.
        loginEnabled: !!input.tempPassword,
        mustChangePassword: input.tempPassword ? REQUIRE_PASSWORD_CHANGE_ON_FIRST_LOGIN : false,
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
        .set({
          passwordHash: await hashPassword(input.newPassword),
          // Somebody else picked this password, so the person is prompted to
          // replace it on their next sign-in — same rule as an activation.
          mustChangePassword: REQUIRE_PASSWORD_CHANGE_ON_FIRST_LOGIN,
          updatedAt: new Date(),
        })
        .where(eq(users.id, input.userId));
      return { success: true };
    }),
});

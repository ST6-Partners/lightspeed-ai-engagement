import { initTRPC, TRPCError } from '@trpc/server';
import type { CreateExpressContextOptions } from '@trpc/server/adapters/express';
import superjson from 'superjson';
import { eq } from 'drizzle-orm';
import { db } from './db.js';
import type { DrizzleClient } from './db.js';
import { users } from './db/schema/core.js';
import { env } from './env.js';
import { verifyToken } from './auth.js';
import { createTelemetryMiddleware } from './services/telemetry.js';

// Shape exposed to procedures — small, stable surface derived from the
// users row, which is the source of truth for both identity and
// app-level state (role, isBeta, timezone).
export interface AppUser {
  id: string;
  sub: string;
  email: string;
  name: string | null;
  role: string;
  isBeta: boolean;
  // Phase-1 activation (AIE 2026-08-05). Both are enforced in
  // protectedProcedure below, not only in the UI.
  loginEnabled: boolean;
  mustChangePassword: boolean;
}

/**
 * The only procedures reachable while must_change_password is set.
 *
 * Everything else is refused server-side. Without this the derived first-time
 * password would be a full API credential: a caller could sign in, ignore the
 * /set-password screen entirely, and read reviews, PIPs and assessments straight
 * off tRPC. The UI redirect in Layout.tsx is a convenience; this is the gate.
 */
const ALLOWED_WHILE_PASSWORD_PENDING = new Set([
  'auth.me',
  'auth.logout',
  'auth.changePassword',
  'auth.updateTimezone',
]);

// Context — available in every tRPC procedure
export const createContext = async ({ req, res }: CreateExpressContextOptions) => {
  // Sequence 3: session-based auth. ctx.user comes from req.session.userId
  // (set by auth.login / auth.register). The WorkOS path is retired.
  let user: AppUser | null = null;
  // Primary path: bearer token (works in Replit's cross-site iframe where
  // the session cookie is blocked as third-party). Checked FIRST so an
  // explicit token always wins over a possibly-stale session cookie.
  // Fallback: session cookie (first-party / new-tab context).
  let userId: string | undefined;
  const authz = req.headers.authorization;
  if (authz?.startsWith('Bearer ')) {
    userId = verifyToken(authz.slice(7)) ?? undefined;
  }
  if (!userId) {
    userId = req.session?.userId;
  }
  if (userId) {
    const dbUser = await db.query.users.findFirst({ where: eq(users.id, userId) });
    if (dbUser && dbUser.isActive) {
      user = {
        id: dbUser.id,
        sub: dbUser.sub,
        email: dbUser.email,
        name: dbUser.name,
        role: dbUser.role,
        isBeta: dbUser.isBeta,
        loginEnabled: dbUser.loginEnabled,
        mustChangePassword: dbUser.mustChangePassword,
      };
    }
  }
  return { req, res, user, db };
};

export type Context = Awaited<ReturnType<typeof createContext>>;

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const router = t.router;
export const middleware = t.middleware;
export const publicProcedure = t.procedure;

// ── Activity tracking (throttled to 1 update per user per 60s) ──
const lastActivityUpdate = new Map<string, number>();
const ACTIVITY_THROTTLE_MS = 60_000;

function touchActivity(userId: string) {
  const now = Date.now();
  const last = lastActivityUpdate.get(userId) ?? 0;
  if (now - last < ACTIVITY_THROTTLE_MS) return;
  lastActivityUpdate.set(userId, now);
  db.update(users)
    .set({ lastActiveAt: new Date() })
    .where(eq(users.id, userId))
    .catch(() => {});
}

// Protected procedure — requires authenticated session
export const protectedProcedure = t.procedure
  .use(async ({ ctx, next, path }) => {
    if (!ctx.user) {
      throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not authenticated' });
    }

    // Sign-in access revoked while they were signed in. Checked here rather than
    // only at login, so switching someone off in Core Data -> Employees takes
    // effect on their very next request instead of whenever their 7-day bearer
    // token happens to expire — which is what the button's tooltip promises.
    if (!ctx.user.loginEnabled) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Your access has been switched off. Contact your administrator.',
      });
    }

    // First sign-in with a password somebody else chose: nothing but the
    // change-password path is reachable until they pick their own.
    if (ctx.user.mustChangePassword && !ALLOWED_WHILE_PASSWORD_PENDING.has(path)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Choose your own password before using the app.',
      });
    }

    touchActivity(ctx.user.id);
    // Narrow ctx.user to non-null for all downstream procedures: the guard
    // above guarantees it, but tRPC's next({ ctx }) would otherwise pass the
    // original AppUser | null type through. Re-passing the narrowed value
    // re-types the context so routers can use ctx.user without null checks.
    return next({ ctx: { ...ctx, user: ctx.user } });
  })
  .use(createTelemetryMiddleware());

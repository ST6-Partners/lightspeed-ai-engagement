-- ============================================================
-- 0107 AIE 2026-08-05 — PHASE-1 LOGIN ACTIVATION
--
-- Adds the two flags the phase-1 activation flow needs (PM, 2026-08-05):
--
--   login_enabled        — may this person sign in at all. Default FALSE: the
--                          roster starts closed and a sysadmin opens accounts
--                          deliberately, one at a time or in bulk.
--   must_change_password — set when a sysadmin activates someone with the
--                          derived first-time password; cleared the moment they
--                          choose their own.
--
-- WHY NOT REUSE is_active. is_active is already read by ~15 surfaces — the org
-- tree, engagement eligibility, assignment pickers, manager rollups, cadence
-- notifications. Defaulting the roster to inactive so that "not yet activated"
-- meant "cannot sign in" would also empty the org chart and every headcount.
-- login_enabled carries only the sign-in meaning. This also separates the two
-- senses of "active" that AQ #2125 flagged as a footgun: is_active continues to
-- mean "a current employee", login_enabled means "has a way in".
--
-- GRANDFATHERING — the important bit. A bare DEFAULT false would lock out every
-- account that can sign in today, including the sysadmin running the deploy.
-- Anyone who already holds a password keeps their access.
--
-- Idempotent: IF NOT EXISTS on both columns, and the backfill is guarded so a
-- replay cannot re-open an account a sysadmin has since switched off.
-- ============================================================

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "login_enabled" boolean;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "must_change_password" boolean;
--> statement-breakpoint

-- Grandfather existing credentials: if you can sign in today, you still can.
-- Runs only where the column is still NULL, so it fires exactly once.
UPDATE "users" SET "login_enabled" = ("password_hash" IS NOT NULL AND "is_active" = true)
WHERE "login_enabled" IS NULL;
--> statement-breakpoint
UPDATE "users" SET "must_change_password" = false WHERE "must_change_password" IS NULL;
--> statement-breakpoint

ALTER TABLE "users" ALTER COLUMN "login_enabled" SET DEFAULT false;
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "login_enabled" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "must_change_password" SET DEFAULT false;
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "must_change_password" SET NOT NULL;
--> statement-breakpoint

-- The sign-in name picker queries exactly this predicate.
CREATE INDEX IF NOT EXISTS "idx_users_login_enabled" ON "users" ("login_enabled");

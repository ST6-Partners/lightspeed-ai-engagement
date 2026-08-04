-- ============================================================
-- AIE 2026-08-03 — single access level + the Reach grid.
--
-- Collapses users.role + users.leader_badge + users.is_hr_access into one
-- users.access_level, and adds access_grants (level x area -> reach).
-- The old columns are LEFT IN PLACE and kept in sync for one release so a
-- rollback needs no data recovery; they are dropped in a later migration.
-- Idempotent throughout (migrate-on-boot may replay).
-- ============================================================

-- 1. New column ------------------------------------------------------------
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "access_level" varchar(16);

-- 2. Backfill from the three legacy fields. Most privileged wins.
--    HR beats admin: the HR tick-box was the wider grant in practice
--    (it opened engagement results and assessments, which admin alone did not).
UPDATE "users" SET "access_level" = CASE
  WHEN "role" = 'sysadmin'       THEN 'sysadmin'
  WHEN "leader_badge" = 'ELT'    THEN 'elt'
  WHEN "leader_badge" = 'SLT'    THEN 'slt'
  WHEN "is_hr_access" = true     THEN 'hr'
  WHEN "role" = 'admin'          THEN 'admin'
  WHEN "role" = 'manager'        THEN 'manager'
  ELSE 'user'
END
WHERE "access_level" IS NULL;

-- 3. ST6 retired. Its sole holder becomes admin (PM ruling, 2026-08-03).
--    Runs before the NOT NULL so any ST6 row is already resolved above.
UPDATE "users" SET "access_level" = 'admin'
WHERE "leader_badge" = 'ST6' AND "access_level" IN ('user', 'manager');
UPDATE "users" SET "leader_badge" = NULL WHERE "leader_badge" = 'ST6';

ALTER TABLE "users" ALTER COLUMN "access_level" SET DEFAULT 'user';
ALTER TABLE "users" ALTER COLUMN "access_level" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "idx_users_access_level" ON "users" ("access_level");

-- 4. The grid --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "access_grants" (
  "id"         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "level"      varchar(16) NOT NULL,
  "area"       varchar(24) NOT NULL,
  "reach"      varchar(12) NOT NULL DEFAULT 'none',
  "updated_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "uq_access_grants_level_area" UNIQUE ("level", "area")
);

-- 5. Seed all 35 cells. Mirrors the grid approved in session 2026-08-03.
--    Documents never carries down_org (config data, not people).
INSERT INTO "access_grants" ("level", "area", "reach") VALUES
  ('sysadmin', 'planning', 'all'),      ('sysadmin', 'engagement', 'all'),
  ('sysadmin', 'insights', 'all'),      ('sysadmin', 'documents', 'all'),
  ('sysadmin', 'assessments', 'all'),
  ('elt', 'planning', 'all'),           ('elt', 'engagement', 'all'),
  ('elt', 'insights', 'all'),           ('elt', 'documents', 'none'),
  ('elt', 'assessments', 'all'),
  ('slt', 'planning', 'down_org'),      ('slt', 'engagement', 'down_org'),
  ('slt', 'insights', 'down_org'),      ('slt', 'documents', 'none'),
  ('slt', 'assessments', 'none'),
  ('hr', 'planning', 'all'),            ('hr', 'engagement', 'all'),
  ('hr', 'insights', 'all'),            ('hr', 'documents', 'all'),
  ('hr', 'assessments', 'all'),
  ('admin', 'planning', 'all'),         ('admin', 'engagement', 'all'),
  ('admin', 'insights', 'all'),         ('admin', 'documents', 'all'),
  ('admin', 'assessments', 'none'),
  ('manager', 'planning', 'down_org'),  ('manager', 'engagement', 'down_org'),
  ('manager', 'insights', 'down_org'),  ('manager', 'documents', 'none'),
  ('manager', 'assessments', 'none'),
  ('user', 'planning', 'down_org'),     ('user', 'engagement', 'down_org'),
  ('user', 'insights', 'none'),         ('user', 'documents', 'none'),
  ('user', 'assessments', 'none')
ON CONFLICT ("level", "area") DO NOTHING;

-- 6. Safety net. Down-org is meaningless on Documents; collapse any that
--    slipped in (e.g. a hand edit before the UI enforced it).
UPDATE "access_grants" SET "reach" = 'none'
WHERE "area" = 'documents' AND "reach" = 'down_org';

-- ============================================================
-- AIE 2026-08-03 — seven access levels collapse to five.
--
-- SLT folds into ELT and Admin folds into Sysadmin; each pair described the
-- same group of people (PM ruling, same session as 0100).
--
-- NOTE this is a PROMOTION for anyone sitting at Admin: sysadmin reaches the
-- employee roster, the Access grid, Database and Backups. Confirmed by the PM
-- before shipping. Anyone who should not have that needs moving to manager or
-- hr by hand afterwards.
--
-- Idempotent.
-- ============================================================

UPDATE "users" SET "access_level" = 'elt'      WHERE "access_level" = 'slt';
UPDATE "users" SET "access_level" = 'sysadmin' WHERE "access_level" = 'admin';

-- SLT no longer draws a badge; ELT is the only tier left on the org chart.
UPDATE "users" SET "leader_badge" = 'ELT' WHERE "access_level" = 'elt' AND "leader_badge" IS DISTINCT FROM 'ELT';
UPDATE "users" SET "leader_badge" = NULL  WHERE "access_level" <> 'elt' AND "leader_badge" IS NOT NULL;

-- Retire the dead grid rows, then reassert the agreed reach for the five that remain.
DELETE FROM "access_grants" WHERE "level" IN ('slt', 'admin');

UPDATE "access_grants" SET "reach" = 'all', "updated_at" = now()
WHERE "level" IN ('sysadmin', 'elt', 'hr');

-- Manager sees their own branch everywhere it means anything; Documents is
-- configuration, so it stays a plain in/out and managers are out.
UPDATE "access_grants" SET "reach" = 'down_org', "updated_at" = now()
WHERE "level" = 'manager' AND "area" IN ('planning', 'engagement', 'insights', 'assessments');
UPDATE "access_grants" SET "reach" = 'none', "updated_at" = now()
WHERE "level" = 'manager' AND "area" = 'documents';

-- A user sees themselves. Documents is now ON for users — they may read Core
-- Data apart from survey questions, assessments and org data, which are
-- excluded per-item in code (services/capabilities.ts), not per-area here.
UPDATE "access_grants" SET "reach" = 'down_org', "updated_at" = now()
WHERE "level" = 'user' AND "area" IN ('planning', 'engagement', 'insights');
UPDATE "access_grants" SET "reach" = 'all', "updated_at" = now()
WHERE "level" = 'user' AND "area" = 'documents';
UPDATE "access_grants" SET "reach" = 'none', "updated_at" = now()
WHERE "level" = 'user' AND "area" = 'assessments';

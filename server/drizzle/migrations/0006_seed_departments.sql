-- Seed the shared departments lookup (the 8 standard software-company functions,
-- parity with the sibling lightspeed-talent-assessment app) and backfill the new
-- department_id FKs from the pre-existing free-text values. Idempotent:
-- ON CONFLICT (name) DO NOTHING; runs exactly once via the Drizzle journal.
INSERT INTO "departments" ("name", "sort_order") VALUES
  ('Engineering',       10),
  ('Product',           20),
  ('Design',            30),
  ('Marketing',         40),
  ('Sales',             50),
  ('Customer Success',  60),
  ('People / HR',       70),
  ('Finance / G&A',     80)
ON CONFLICT ("name") DO NOTHING;
--> statement-breakpoint
-- Backfill job_titles.department_id from the deprecated free-text department
-- (matches the names seeded above; e.g. the 0002 job-title seed used these).
UPDATE "job_titles" jt SET "department_id" = d."id"
  FROM "departments" d WHERE d."name" = jt."department" AND jt."department_id" IS NULL;
--> statement-breakpoint
-- Backfill pips.department_id from the deprecated free-text team where it matches.
UPDATE "pips" p SET "department_id" = d."id"
  FROM "departments" d WHERE d."name" = p."team" AND p."department_id" IS NULL;

-- Add an "Analytics" department (the analytics job titles seeded in 0002 used
-- this function, which isn't one of the 8 standard departments) and backfill the
-- job titles that reference it. Idempotent.
INSERT INTO "departments" ("name", "sort_order") VALUES ('Analytics', 35)
ON CONFLICT ("name") DO NOTHING;
--> statement-breakpoint
UPDATE "job_titles" jt SET "department_id" = d."id"
  FROM "departments" d WHERE d."name" = jt."department" AND jt."department_id" IS NULL;

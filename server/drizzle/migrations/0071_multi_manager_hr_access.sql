-- 0071 Multi-manager + HR access. users.manager_id stays the PRIMARY manager
-- (org tree groups a person under their primary). New user_managers join table
-- holds the full set of managers (incl. primary); users.is_hr_access flags
-- people-team members who get company-wide visibility. Additive + idempotent.
CREATE TABLE IF NOT EXISTS "user_managers" (
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "manager_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "user_managers_pk" PRIMARY KEY ("user_id","manager_id")
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_hr_access" boolean NOT NULL DEFAULT false;
--> statement-breakpoint
INSERT INTO "user_managers" ("user_id","manager_id")
  SELECT id, manager_id FROM "users" WHERE manager_id IS NOT NULL
  ON CONFLICT DO NOTHING;

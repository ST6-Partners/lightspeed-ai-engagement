-- AIE 2026-07-27 — additional department memberships (a person can be on more
-- than one team, e.g. IT + AI). users.department_id stays the PRIMARY; this holds
-- the extras. Idempotent.
CREATE TABLE IF NOT EXISTS "user_departments" (
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "department_id" uuid NOT NULL REFERENCES "departments"("id") ON DELETE CASCADE,
  CONSTRAINT "user_departments_pk" PRIMARY KEY ("user_id","department_id")
);

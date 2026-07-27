-- AIE 2026-07-27 — per-person ELT Leader on the employee record (Org rollup +
-- profile + filter). Idempotent. bf employee-roster-import session.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "elt_leader" varchar(160);

-- AIE 2026-07-28 — one-manager / one-department model. The reporting ladder is
-- derived by walking users.manager_id (see profile.get), so the editable
-- escalation-supervisor columns are redundant and drift-prone; remove them.
-- The multi-team "additional departments" join is dropped (roster is one
-- department per person). Idempotent. Reversible via re-add (0084/0089).
ALTER TABLE "users" DROP COLUMN IF EXISTS "secondary_manager_id";
--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "tertiary_manager_id";
--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "quaternary_manager_id";
--> statement-breakpoint
DROP TABLE IF EXISTS "user_departments";

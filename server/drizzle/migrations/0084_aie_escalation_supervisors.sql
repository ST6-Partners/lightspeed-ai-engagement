-- AIE 2026-07-27 — ordered escalation chain (secondary/tertiary/quaternary
-- supervisor) on the employee record, editable in Admin > Employees. Idempotent.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "secondary_manager_id" uuid;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "tertiary_manager_id" uuid;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "quaternary_manager_id" uuid;

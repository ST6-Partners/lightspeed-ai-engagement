-- AIE 2026-07-27 — self-reported demographic fields (optional, employee-editable
-- on their own Profile). Sensitive PII; nullable; never required. Idempotent.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "dob_year" integer;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "dob_month" integer;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "dob_day" integer;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "gender" varchar(40);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "ethnicity" varchar(80);

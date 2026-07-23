-- AI Engagement (AIE) 2026-07-23 — profile-driven survey + org attributes.
-- Adds admin-managed org-placement + start-date parts to `users`, and snapshot
-- columns to `engagement_survey_responses` so each response freezes the
-- respondent's org attributes (from their PROFILE) at submit time. Responses stay
-- confidential (no respondent id). Fully idempotent (safe under migrate-on-boot).

-- Profile: org placement (admin-managed via employee upload) + start date parts.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "team" varchar(160);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "location" varchar(160);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "business_unit" varchar(160);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "hire_year" integer;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "hire_month" integer;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "hire_day" integer;
--> statement-breakpoint
-- Survey response snapshot of the respondent's profile at submit time.
ALTER TABLE "engagement_survey_responses" ADD COLUMN IF NOT EXISTS "team" varchar(160);
--> statement-breakpoint
ALTER TABLE "engagement_survey_responses" ADD COLUMN IF NOT EXISTS "location" varchar(160);
--> statement-breakpoint
ALTER TABLE "engagement_survey_responses" ADD COLUMN IF NOT EXISTS "business_unit" varchar(160);
--> statement-breakpoint
ALTER TABLE "engagement_survey_responses" ADD COLUMN IF NOT EXISTS "manager_name" varchar(200);
--> statement-breakpoint
ALTER TABLE "engagement_survey_responses" ADD COLUMN IF NOT EXISTS "elt_leader" varchar(200);
--> statement-breakpoint
ALTER TABLE "engagement_survey_responses" ADD COLUMN IF NOT EXISTS "start_year" integer;
--> statement-breakpoint
ALTER TABLE "engagement_survey_responses" ADD COLUMN IF NOT EXISTS "period_id" uuid;

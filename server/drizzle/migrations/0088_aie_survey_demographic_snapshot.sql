-- AIE 2026-07-27 — snapshot self-reported demographics onto each survey response
-- so engagement analytics can slice by gender / ethnicity / age (min-group-size
-- suppression still protects anonymity). Idempotent.
ALTER TABLE "engagement_survey_responses" ADD COLUMN IF NOT EXISTS "gender" varchar(40);
--> statement-breakpoint
ALTER TABLE "engagement_survey_responses" ADD COLUMN IF NOT EXISTS "ethnicity" varchar(80);
--> statement-breakpoint
ALTER TABLE "engagement_survey_responses" ADD COLUMN IF NOT EXISTS "birth_year" integer;

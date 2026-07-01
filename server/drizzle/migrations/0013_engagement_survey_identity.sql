-- Add respondent identity to engagement survey responses so results can be
-- organized by person / job title / department. Names are denormalized text
-- (selected from dropdowns) so aggregation by department is direct and survives
-- lookup changes. Idempotent (ADD COLUMN IF NOT EXISTS).
ALTER TABLE "engagement_survey_responses" ADD COLUMN IF NOT EXISTS "respondent_name" varchar(200);--> statement-breakpoint
ALTER TABLE "engagement_survey_responses" ADD COLUMN IF NOT EXISTS "job_title" varchar(200);--> statement-breakpoint
ALTER TABLE "engagement_survey_responses" ADD COLUMN IF NOT EXISTS "department" varchar(160);

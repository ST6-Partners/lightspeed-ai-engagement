-- AIE 2026-07-23 — snapshot the manager chain on each response for hierarchy
-- roll-up filtering + manager-scoped analytics. Idempotent.
ALTER TABLE "engagement_survey_responses" ADD COLUMN IF NOT EXISTS "manager_path" jsonb DEFAULT '[]'::jsonb;

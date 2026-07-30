-- Archive flag for engagement survey periods (AIE 2026-07-30).
-- Archived surveys stay in the database with all their source rows and metrics
-- intact; they are simply hidden from the survey list, the period pickers and
-- the trend series until restored. Reversible by design — nothing is deleted.
ALTER TABLE "survey_periods" ADD COLUMN IF NOT EXISTS "archived_at" timestamp with time zone;

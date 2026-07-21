-- 0061 Per-question optional comments (manager + peer reviews) and an
-- anonymous option for the manager review. Additive + idempotent.
ALTER TABLE manager_survey_responses ADD COLUMN IF NOT EXISTS comments jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE manager_survey_responses ADD COLUMN IF NOT EXISTS anonymous boolean NOT NULL DEFAULT false;
ALTER TABLE peer_review_responses    ADD COLUMN IF NOT EXISTS comments jsonb NOT NULL DEFAULT '{}'::jsonb;

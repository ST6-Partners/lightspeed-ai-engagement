-- Engagement Survey responses: one row per submission of the periodic
-- engagement survey (15Five "Engage" parity). 66 Likert answers live in the
-- `answers` jsonb; the eNPS 0..10 score + open-text reason are promoted to
-- columns. Confidential — respondent_id is nullable, set null on user delete.
-- Idempotent (mirrors 0010 style).
CREATE TABLE IF NOT EXISTS "engagement_survey_responses" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "respondent_id" uuid REFERENCES "users"("id") ON DELETE set null,
  "answers" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "enps_score" integer,
  "enps_reason" text,
  "status" varchar(16) DEFAULT 'complete' NOT NULL,
  "submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

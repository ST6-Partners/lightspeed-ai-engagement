-- Engagement survey VERSIONS: named variants (e.g. V1 -> Marketing, V2 -> Sales),
-- each selecting a subset of the question bank. Seeds one default version whose
-- questions = the currently-active bank questions, so existing behaviour is
-- preserved. Responses gain version_id. Idempotent.
CREATE TABLE IF NOT EXISTS "engagement_survey_versions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" varchar(120) NOT NULL,
  "is_default" boolean NOT NULL DEFAULT false,
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "engagement_survey_version_questions" (
  "version_id" uuid NOT NULL REFERENCES "engagement_survey_versions"("id") ON DELETE CASCADE,
  "question_id" varchar(64) NOT NULL REFERENCES "engagement_survey_questions"("id") ON DELETE CASCADE,
  "sort_order" integer NOT NULL DEFAULT 0,
  PRIMARY KEY ("version_id","question_id")
);
--> statement-breakpoint
ALTER TABLE "engagement_survey_responses" ADD COLUMN IF NOT EXISTS "version_id" uuid;
--> statement-breakpoint
INSERT INTO "engagement_survey_versions" ("id","name","is_default","sort_order") VALUES
  ('11111111-1111-4111-8111-111111111111','Standard Survey',true,0)
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
INSERT INTO "engagement_survey_version_questions" ("version_id","question_id","sort_order")
  SELECT '11111111-1111-4111-8111-111111111111', "id", "sort_order" FROM "engagement_survey_questions" WHERE "is_active" = true
ON CONFLICT ("version_id","question_id") DO NOTHING;

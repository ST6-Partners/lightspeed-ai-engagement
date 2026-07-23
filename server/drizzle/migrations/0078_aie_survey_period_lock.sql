-- AI Engagement (AIE) 2026-07-23 — survey period window + once-per-period ledger.
-- Adds an admin-managed release/close window + status to survey_periods, and a
-- completion ledger that records WHO finished a period (separate from the
-- confidential answers) to enforce one response per person per period.
-- Idempotent (safe under migrate-on-boot).

ALTER TABLE "survey_periods" ADD COLUMN IF NOT EXISTS "release_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "survey_periods" ADD COLUMN IF NOT EXISTS "close_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "survey_periods" ADD COLUMN IF NOT EXISTS "status" varchar(16) DEFAULT 'draft' NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "engagement_survey_completions" (
  "period_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "completed_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "engagement_survey_completions_period_id_user_id_pk" PRIMARY KEY("period_id","user_id")
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "engagement_survey_completions" ADD CONSTRAINT "engagement_survey_completions_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;

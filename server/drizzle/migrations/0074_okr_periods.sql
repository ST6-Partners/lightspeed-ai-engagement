-- OKR goal-setting periods (AI Engagement, 2026-07-22).
-- Introduces the `okr_periods` cycle table, links `okr_nodes` to a period,
-- seeds a current "2026 Goals" period, and assigns all existing OKRs to it so
-- nothing is orphaned. Fully idempotent (safe under migrate-on-boot re-runs).

CREATE TABLE IF NOT EXISTS "okr_periods" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "label" varchar(120) NOT NULL,
  "start_date" date,
  "end_date" date,
  "status" varchar(16) DEFAULT 'active' NOT NULL,
  "is_current" boolean DEFAULT false NOT NULL,
  "closed_at" timestamp with time zone,
  "scorecard" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "okr_nodes" ADD COLUMN IF NOT EXISTS "period_id" uuid;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "okr_nodes" ADD CONSTRAINT "okr_nodes_period_id_okr_periods_id_fk"
    FOREIGN KEY ("period_id") REFERENCES "public"."okr_periods"("id")
    ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
-- Seed one current goal-setting period only if none exists yet.
INSERT INTO "okr_periods" ("label", "start_date", "end_date", "status", "is_current")
SELECT '2026 Goals', '2026-01-01', '2026-12-31', 'active', true
WHERE NOT EXISTS (SELECT 1 FROM "okr_periods");
--> statement-breakpoint
-- Backfill: every existing OKR node without a period joins the current period.
UPDATE "okr_nodes"
SET "period_id" = (
  SELECT "id" FROM "okr_periods" WHERE "is_current" = true ORDER BY "created_at" ASC LIMIT 1
)
WHERE "period_id" IS NULL;

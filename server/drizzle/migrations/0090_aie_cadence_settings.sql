-- Cadence settings (AI Engagement, 2026-07-27).
-- Singleton row holding the required completion cadence for each activity
-- (9 Box ratings, Priorities, Reviews). Default quarterly (calendar quarter).
-- Admin-adjustable. Fully idempotent (safe under migrate-on-boot re-runs).

CREATE TABLE IF NOT EXISTS "cadence_settings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "ninebox_cadence" varchar(16) NOT NULL DEFAULT 'quarterly',
  "priorities_cadence" varchar(16) NOT NULL DEFAULT 'quarterly',
  "reviews_cadence" varchar(16) NOT NULL DEFAULT 'quarterly',
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- Seed the singleton row only if none exists.
INSERT INTO "cadence_settings" ("ninebox_cadence", "priorities_cadence", "reviews_cadence")
SELECT 'quarterly', 'quarterly', 'quarterly'
WHERE NOT EXISTS (SELECT 1 FROM "cadence_settings");

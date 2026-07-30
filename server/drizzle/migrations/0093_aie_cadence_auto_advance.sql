-- Cadence auto-advance (AI Engagement, 2026-07-27).
-- auto_advance ON (default): the active period follows the calendar. OFF: the
-- active period is pinned to the stored *_active_key until an admin advances it.
ALTER TABLE "cadence_settings" ADD COLUMN IF NOT EXISTS "auto_advance" boolean NOT NULL DEFAULT true;
--> statement-breakpoint
ALTER TABLE "cadence_settings" ADD COLUMN IF NOT EXISTS "ninebox_active_key" varchar(32);
--> statement-breakpoint
ALTER TABLE "cadence_settings" ADD COLUMN IF NOT EXISTS "priorities_active_key" varchar(32);
--> statement-breakpoint
ALTER TABLE "cadence_settings" ADD COLUMN IF NOT EXISTS "reviews_active_key" varchar(32);

-- Period-scoping for priorities (AI Engagement, 2026-07-27).
-- Tag each priority with the cadence period it belongs to so past periods show
-- their own frozen set and the current period stays editable. Backfill existing
-- rows to the year of creation (priorities cadence defaults to annual).
ALTER TABLE "priorities" ADD COLUMN IF NOT EXISTS "period_key" varchar(32);
--> statement-breakpoint
UPDATE "priorities" SET "period_key" = EXTRACT(YEAR FROM "created_at")::text WHERE "period_key" IS NULL;

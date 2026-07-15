-- Completion state for priorities (checkbox in the Weekly Plan for assigned items).
ALTER TABLE "priorities" ADD COLUMN IF NOT EXISTS "done" boolean NOT NULL DEFAULT false;
ALTER TABLE "priorities" ADD COLUMN IF NOT EXISTS "completed_at" timestamp with time zone;

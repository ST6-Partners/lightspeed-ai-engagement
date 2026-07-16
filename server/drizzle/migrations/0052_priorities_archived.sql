-- Archive state for priorities (declutter completed items pre-week-end).
ALTER TABLE "priorities" ADD COLUMN IF NOT EXISTS "archived" boolean NOT NULL DEFAULT false;
ALTER TABLE "priorities" ADD COLUMN IF NOT EXISTS "archived_at" timestamp with time zone;

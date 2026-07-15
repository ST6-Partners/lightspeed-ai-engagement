-- Manager attribution for Org-screen priorities → surfaced in Weekly Plan.
ALTER TABLE "priorities" ADD COLUMN IF NOT EXISTS "assigned_by" uuid;
ALTER TABLE "priorities" ADD COLUMN IF NOT EXISTS "assigned_at" timestamp with time zone;
DO $$ BEGIN
  ALTER TABLE "priorities" ADD CONSTRAINT "priorities_assigned_by_users_id_fk"
    FOREIGN KEY ("assigned_by") REFERENCES "users"("id") ON DELETE set null;
EXCEPTION WHEN duplicate_object THEN null; END $$;

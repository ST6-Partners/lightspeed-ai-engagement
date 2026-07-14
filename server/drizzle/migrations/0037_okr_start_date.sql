-- Add an explicit start/created date to OKRs (defaults to today on create),
-- so archived OKRs still show when they were created. Backfill existing rows
-- from created_at. Idempotent.
ALTER TABLE okr_nodes ADD COLUMN IF NOT EXISTS start_date date;--> statement-breakpoint
UPDATE okr_nodes SET start_date = created_at::date WHERE start_date IS NULL;

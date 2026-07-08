-- 0029 Weekly Check-in pulse. See server/src/db/schema/checkins.ts.
-- Idempotent: CREATE TABLE IF NOT EXISTS. Safe to re-run (migrate-on-boot).

CREATE TABLE IF NOT EXISTS checkin_responses (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  respondent_id   uuid REFERENCES users(id) ON DELETE SET NULL,
  respondent_name varchar(200),
  week_of         date NOT NULL,
  rotation_index  integer NOT NULL,
  best_self       integer,
  sentiment       integer,
  workload        integer,
  driver          jsonb,
  value_item      jsonb,
  enps            integer,
  open_prompt     text,
  open_text       text,
  submitted_at    timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

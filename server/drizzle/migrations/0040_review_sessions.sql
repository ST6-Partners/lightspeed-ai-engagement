-- 0040 Reviews feature — review_sessions container + go-forward/fork columns.
-- The container Brooke's model calls a "review cycle"; named review_sessions
-- because review_cycles is taken by the Org Screen. Additive + idempotent.

CREATE TABLE IF NOT EXISTS review_sessions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  period_label text,
  reviewer_id  uuid REFERENCES users(id) ON DELETE SET NULL,
  status       varchar(24) NOT NULL DEFAULT 'open',  -- open | rearview_complete | plan_drafted | closed
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_review_sessions_employee ON review_sessions (employee_id);

-- Rearview: bind each scoring pass to its container.
ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS session_id uuid REFERENCES review_sessions(id) ON DELETE SET NULL;

-- Go-forward: the plan reads both passes through the session; track carries the fork.
ALTER TABLE coaching_plans
  ADD COLUMN IF NOT EXISTS session_id uuid REFERENCES review_sessions(id) ON DELETE SET NULL;
ALTER TABLE coaching_plans
  ADD COLUMN IF NOT EXISTS track varchar(16) NOT NULL DEFAULT 'coaching';

-- Focus areas: map to a company value OR a performance criterion (polymorphic).
ALTER TABLE coaching_plan_focus_areas
  ADD COLUMN IF NOT EXISTS item_type varchar(16);
ALTER TABLE coaching_plan_focus_areas
  ADD COLUMN IF NOT EXISTS item_id uuid;

-- The fork: a PIP can be linked back to the review session it was forked from.
ALTER TABLE pips
  ADD COLUMN IF NOT EXISTS source_session_id uuid REFERENCES review_sessions(id) ON DELETE SET NULL;

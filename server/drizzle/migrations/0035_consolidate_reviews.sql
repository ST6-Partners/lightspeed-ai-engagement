-- 0034 Consolidate employee reviews into one typed pair (PM decision 2026-07-09).
-- `reviews` + `review_scores` replace the per-instrument value_evaluations/
-- value_evaluation_scores and performance_evaluations/performance_evaluation_scores.
-- The lookups (company_values, performance_criteria) stay separate, so
-- review_scores.item_id is a polymorphic reference (no FK) resolved by reviews.type.
-- The old evaluation tables were never seeded and hold no data — safe to drop.
-- Idempotent.

CREATE TABLE IF NOT EXISTS reviews (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type          varchar(20) NOT NULL,
  employee_id   uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reviewer_id   uuid REFERENCES users(id) ON DELETE SET NULL,
  period_label  text,
  status        varchar(16) NOT NULL DEFAULT 'draft',
  overall_notes text,
  evaluated_at  timestamptz NOT NULL DEFAULT now(),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_reviews_employee_type ON reviews (employee_id, type);

CREATE TABLE IF NOT EXISTS review_scores (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id     uuid NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  item_id       uuid NOT NULL,
  score         integer NOT NULL,
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uniq_review_item UNIQUE (review_id, item_id)
);
CREATE INDEX IF NOT EXISTS idx_review_scores_review ON review_scores (review_id);

-- Retire the superseded per-instrument evaluation tables (empty; never seeded).
DROP TABLE IF EXISTS value_evaluation_scores;
DROP TABLE IF EXISTS value_evaluations;
DROP TABLE IF EXISTS performance_evaluation_scores;
DROP TABLE IF EXISTS performance_evaluations;

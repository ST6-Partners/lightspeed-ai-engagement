-- 0035 Consolidate employee reviews into one typed pair (PM decision 2026-07-09).
-- `reviews` + `review_scores` replace value_evaluations/value_evaluation_scores
-- and performance_evaluations/performance_evaluation_scores. Lookups
-- (company_values, performance_criteria) stay separate, so review_scores.item_id
-- is a polymorphic reference (no FK) resolved by reviews.type.
--
-- coaching_plans (0034) had a FK evaluation_id -> value_evaluations(id); this
-- migration repoints it to reviews(id) before dropping the old tables, so the
-- drop cannot fail on a dependent constraint. Old eval tables were never seeded
-- (no data). Fully idempotent — safe to re-run.

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

-- Repoint coaching_plans.evaluation_id: drop the old FK to value_evaluations
-- (Postgres inline-FK default name, plus a CASCADE fallback on the drop below),
-- then add the FK to reviews. Guarded so re-runs are no-ops.
ALTER TABLE IF EXISTS coaching_plans DROP CONSTRAINT IF EXISTS coaching_plans_evaluation_id_fkey;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'coaching_plans')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'coaching_plans_evaluation_id_reviews_id_fk') THEN
    ALTER TABLE coaching_plans
      ADD CONSTRAINT coaching_plans_evaluation_id_reviews_id_fk
      FOREIGN KEY (evaluation_id) REFERENCES reviews(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Retire the superseded per-instrument evaluation tables (empty; never seeded).
-- CASCADE on value_evaluations is a belt-and-suspenders drop of any residual
-- dependent constraint (e.g. the old coaching FK if the name differed).
DROP TABLE IF EXISTS value_evaluation_scores;
DROP TABLE IF EXISTS value_evaluations CASCADE;
DROP TABLE IF EXISTS performance_evaluation_scores;
DROP TABLE IF EXISTS performance_evaluations CASCADE;

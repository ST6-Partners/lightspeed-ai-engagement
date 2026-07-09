-- 0029 Managed review-period lookup for employee value evaluations. The
-- Reviews form picks a period from this list (dropdown) instead of free text,
-- keeping period names consistent. Idempotent; seeds one starter period.

CREATE TABLE IF NOT EXISTS review_periods (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label      varchar(120) NOT NULL,
  active     boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uniq_review_period_label UNIQUE (label)
);

-- Starter period (guarded so re-runs don't error/duplicate).
INSERT INTO review_periods (label, sort_order)
SELECT '2026 H1', 100
WHERE NOT EXISTS (SELECT 1 FROM review_periods WHERE label = '2026 H1');

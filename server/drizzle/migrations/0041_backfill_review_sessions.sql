-- 0041 Backfill — create a review_session per (employee, period) from existing
-- reviews, then link reviews, coaching_plans, and focus-area item mappings.
-- Idempotent: guarded by IS NOT DISTINCT FROM + NULL checks so re-runs are no-ops.

-- 1. One session per distinct (employee, period) that has reviews.
INSERT INTO review_sessions (employee_id, period_label, status)
SELECT x.employee_id, x.period_label, 'rearview_complete'
FROM (SELECT DISTINCT employee_id, period_label FROM reviews) x
WHERE NOT EXISTS (
  SELECT 1 FROM review_sessions s
  WHERE s.employee_id = x.employee_id
    AND s.period_label IS NOT DISTINCT FROM x.period_label
);

-- 2. Link each review pass to its session.
UPDATE reviews r
SET session_id = s.id
FROM review_sessions s
WHERE r.session_id IS NULL
  AND s.employee_id = r.employee_id
  AND s.period_label IS NOT DISTINCT FROM r.period_label;

-- 3. Link existing coaching plans to the session by employee + period.
UPDATE coaching_plans c
SET session_id = s.id
FROM review_sessions s
WHERE c.session_id IS NULL
  AND s.employee_id = c.employee_id
  AND s.period_label IS NOT DISTINCT FROM c.period_label;

-- 4. Backfill focus-area polymorphic mapping from the legacy value_id.
UPDATE coaching_plan_focus_areas
SET item_type = 'value', item_id = value_id
WHERE item_type IS NULL AND value_id IS NOT NULL;

-- 0045 DEMO SEED — a complete sample review for Brooke Friedman, period '2026 H1',
-- so the Org-screen Review tab person-card executive summary renders end-to-end
-- (Values + Performance scores, review summary, coaching plan). Coaching-only
-- (no PIP). Idempotent and guarded: no-ops if the user/period is missing or a
-- review already exists for the employee+period. DEMO DATA — safe to delete.
DO $$
DECLARE
  v_emp        uuid;
  v_period     text := '2026 H1';
  v_val        uuid;
  v_perf       uuid;
  v_session    uuid;
  v_plan       uuid;
BEGIN
  -- Resolve Brooke by email, then by name.
  SELECT id INTO v_emp FROM users WHERE lower(email) = 'bsf@st6partners.com' ORDER BY created_at LIMIT 1;
  IF v_emp IS NULL THEN
    SELECT id INTO v_emp FROM users WHERE name ILIKE 'Brooke Friedman' ORDER BY created_at LIMIT 1;
  END IF;
  IF v_emp IS NULL THEN RAISE NOTICE 'seed 0045: Brooke not found — skipping'; RETURN; END IF;

  -- Ensure the period exists.
  INSERT INTO review_periods (label, sort_order) VALUES (v_period, 100) ON CONFLICT (label) DO NOTHING;

  -- Idempotency: skip if a review already exists for this employee+period.
  IF EXISTS (SELECT 1 FROM reviews WHERE employee_id = v_emp AND period_label = v_period) THEN
    RAISE NOTICE 'seed 0045: review already exists — skipping'; RETURN;
  END IF;

  -- Ensure there is something to score against (demo fallbacks if lookups are empty).
  IF NOT EXISTS (SELECT 1 FROM company_values WHERE active) THEN
    INSERT INTO company_values (name, pillar, sort_order, active, source) VALUES
      ('Ownership','Character',10,true,'seed'),
      ('Collaboration','Team',20,true,'seed'),
      ('Customer Focus','Craft',30,true,'seed'),
      ('Candor','Character',40,true,'seed'),
      ('Bias to Action','Craft',50,true,'seed');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM performance_criteria WHERE active) THEN
    INSERT INTO performance_criteria (name, definition, sort_order, active, source) VALUES
      ('Quality of Work','Accuracy and craft of output.',10,true,'local'),
      ('Delivery & Reliability','Consistently meets commitments.',20,true,'local'),
      ('Impact','Moves outcomes that matter.',30,true,'local'),
      ('Prioritization','Focuses effort on the highest-value work.',40,true,'local'),
      ('Communication','Clear, timely, well-targeted.',50,true,'local');
  END IF;

  -- Values pass (final): mostly 4s, one 5, one 3.
  INSERT INTO reviews (type, employee_id, reviewer_id, period_label, status, overall_notes, evaluated_at)
  VALUES ('values', v_emp, v_emp, v_period, 'final', 'Strong, values-forward contributor this cycle.', now())
  RETURNING id INTO v_val;
  INSERT INTO review_scores (review_id, item_id, score)
  SELECT v_val, s.id, CASE s.rn WHEN 1 THEN 5 WHEN 5 THEN 3 ELSE 4 END
  FROM (SELECT id, row_number() OVER (ORDER BY sort_order, name) rn FROM company_values WHERE active) s
  WHERE s.rn <= 6;

  -- Performance pass (final): solid with two clear growth edges (2 and 3).
  INSERT INTO reviews (type, employee_id, reviewer_id, period_label, status, overall_notes, evaluated_at)
  VALUES ('performance', v_emp, v_emp, v_period, 'final', 'Solid delivery; a couple of clear growth edges.', now())
  RETURNING id INTO v_perf;
  INSERT INTO review_scores (review_id, item_id, score)
  SELECT v_perf, s.id, CASE s.rn WHEN 4 THEN 2 WHEN 5 THEN 3 ELSE 4 END
  FROM (SELECT id, row_number() OVER (ORDER BY sort_order, name) rn FROM performance_criteria WHERE active) s
  WHERE s.rn <= 6;

  -- Container + link the two passes.
  INSERT INTO review_sessions (employee_id, period_label, reviewer_id, status)
  VALUES (v_emp, v_period, v_emp, 'plan_drafted') RETURNING id INTO v_session;
  UPDATE reviews SET session_id = v_session WHERE id IN (v_val, v_perf);

  -- Go-forward coaching plan (delivered).
  INSERT INTO coaching_plans (employee_id, evaluation_id, session_id, track, author_id, period_label, status, summary_narrative, strengths, ai_generated)
  VALUES (v_emp, v_val, v_session, 'coaching', v_emp, v_period, 'final',
    'This review summarizes Brooke''s 2026 H1 across both the values and performance assessments. She is a dependable, values-forward contributor who raised the bar on collaboration and ownership this cycle. To keep growing, the plan focuses on deepening delivery consistency and sharpening prioritization under load.',
    'Brooke is at her best building trust across teams and driving work to clear outcomes; her ownership and communication stood out this cycle.',
    false)
  RETURNING id INTO v_plan;
  INSERT INTO coaching_plan_focus_areas (plan_id, item_type, title, coaching_note, sort_order) VALUES
    (v_plan, 'criterion', 'Delivery consistency', 'Agree on one concrete commitment-tracking habit and a weekly check-in to hold scope steady.', 10),
    (v_plan, 'criterion', 'Prioritization under load', 'Name the single top outcome each week and defer the rest explicitly.', 20);

  RAISE NOTICE 'seed 0045: seeded sample review for %', v_emp;
END $$;

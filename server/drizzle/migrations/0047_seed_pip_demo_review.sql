-- 0047 DEMO SEED — a PIP-track sample review so the Org-screen Review card shows
-- the "On PIP track" banner variant. Built through the REAL relationships the
-- app uses: reviews + scores -> review_session -> coaching_plan (track='pip')
-- -> pip (source_session_id) with pip_concerns seeded from the weak (<=2) review
-- items and pip_goals from the coaching focus areas. Seeded on a clearly-labelled
-- demo teammate reporting to Brooke Friedman so it's easy to find. Idempotent and
-- guarded. DEMO DATA — safe to delete (remove this user + cascils).
DO $$
DECLARE
  v_mgr     uuid;   -- Brooke (manager + author)
  v_emp     uuid;   -- the demo employee
  v_period  text := '2026 H1';
  v_val     uuid;
  v_perf    uuid;
  v_session uuid;
  v_plan    uuid;
  v_pip     uuid;
BEGIN
  -- Manager/author = Brooke (needed for the reporting line + created_by).
  SELECT id INTO v_mgr FROM users WHERE lower(email) = 'bsf@st6partners.com' ORDER BY created_at LIMIT 1;
  IF v_mgr IS NULL THEN
    SELECT id INTO v_mgr FROM users WHERE name ILIKE 'Brooke Friedman' ORDER BY created_at LIMIT 1;
  END IF;
  IF v_mgr IS NULL THEN RAISE NOTICE 'seed 0046: Brooke not found — skipping'; RETURN; END IF;

  INSERT INTO review_periods (label, sort_order) VALUES (v_period, 100) ON CONFLICT (label) DO NOTHING;

  -- Demo employee (clearly labelled), reporting to Brooke.
  INSERT INTO users (sub, email, name, role, is_active, manager_id)
  VALUES ('demo-pip-sample-riley', 'riley.sample.pipdemo@example.com', 'Riley Sample (PIP demo)', 'user', true, v_mgr)
  ON CONFLICT (email) DO NOTHING;
  SELECT id INTO v_emp FROM users WHERE email = 'riley.sample.pipdemo@example.com';

  -- Idempotency: stop if this demo employee already has a review for the period.
  IF EXISTS (SELECT 1 FROM reviews WHERE employee_id = v_emp AND period_label = v_period) THEN
    RAISE NOTICE 'seed 0046: demo review already exists — skipping'; RETURN;
  END IF;

  -- Fallback lookups if empty (mirrors 0045).
  IF NOT EXISTS (SELECT 1 FROM company_values WHERE active) THEN
    INSERT INTO company_values (name, pillar, sort_order, active, source) VALUES
      ('Ownership','Character',10,true,'seed'),('Collaboration','Team',20,true,'seed'),
      ('Customer Focus','Craft',30,true,'seed'),('Candor','Character',40,true,'seed'),
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

  -- Values pass (final): soft — mostly 2-3.
  INSERT INTO reviews (type, employee_id, reviewer_id, period_label, status, overall_notes, evaluated_at)
  VALUES ('values', v_emp, v_mgr, v_period, 'final', 'Values are present but uneven this cycle.', now())
  RETURNING id INTO v_val;
  INSERT INTO review_scores (review_id, item_id, score)
  SELECT v_val, s.id, CASE s.rn WHEN 3 THEN 2 WHEN 5 THEN 2 ELSE 3 END
  FROM (SELECT id, row_number() OVER (ORDER BY sort_order, name) rn FROM company_values WHERE active) s WHERE s.rn <= 6;

  -- Performance pass (final): below bar — several <=2 (become PIP concerns).
  INSERT INTO reviews (type, employee_id, reviewer_id, period_label, status, overall_notes, evaluated_at)
  VALUES ('performance', v_emp, v_mgr, v_period, 'final', 'Performance is below expectations; moving to a formal plan.', now())
  RETURNING id INTO v_perf;
  INSERT INTO review_scores (review_id, item_id, score, notes)
  SELECT v_perf, s.id,
         CASE s.rn WHEN 3 THEN 1 WHEN 1 THEN 2 WHEN 2 THEN 2 WHEN 4 THEN 2 ELSE 3 END,
         CASE WHEN s.rn IN (1,2,3,4) THEN 'Missed target repeatedly this period.' ELSE NULL END
  FROM (SELECT id, row_number() OVER (ORDER BY sort_order, name) rn FROM performance_criteria WHERE active) s WHERE s.rn <= 6;

  -- Container + link passes.
  INSERT INTO review_sessions (employee_id, period_label, reviewer_id, status)
  VALUES (v_emp, v_period, v_mgr, 'plan_drafted') RETURNING id INTO v_session;
  UPDATE reviews SET session_id = v_session WHERE id IN (v_val, v_perf);

  -- Go-forward coaching plan, forked to the PIP track.
  INSERT INTO coaching_plans (employee_id, evaluation_id, session_id, track, author_id, period_label, status, summary_narrative, strengths, ai_generated)
  VALUES (v_emp, v_val, v_session, 'pip', v_mgr, v_period, 'final',
    'This review summarizes Riley''s 2026 H1 across both the values and performance assessments. Performance has fallen below expectations on delivery, prioritization, and quality for consecutive periods, so the go-forward moves to a formal Performance Improvement Plan with defined outcomes. The coaching plan below still applies alongside it.',
    'Riley collaborates well and is receptive to feedback — a foundation to build the turnaround on.',
    false)
  RETURNING id INTO v_plan;
  INSERT INTO coaching_plan_focus_areas (plan_id, item_type, title, coaching_note, sort_order) VALUES
    (v_plan, 'criterion', 'Delivery & reliability', 'Rebuild a predictable delivery cadence with weekly commitments and check-ins.', 10),
    (v_plan, 'criterion', 'Prioritization', 'Focus on the top outcome each week; escalate trade-offs early.', 20);

  -- The PIP itself, linked to the review session.
  INSERT INTO pips (employee_id, manager_id, source_session_id, duration_days, start_date, midpoint_date, final_review_date,
                    purpose, status, outcome_met, outcome_not_met, created_by)
  VALUES (v_emp, v_mgr, v_session, 30, CURRENT_DATE, CURRENT_DATE + 15, CURRENT_DATE + 30,
    'The goal of this plan is to help you succeed by clarifying where performance must improve, what success looks like, and the support provided.',
    'active',
    'You return to good standing with sustained performance expected going forward.',
    'Further action may follow, up to and including role change or termination, consistent with company policy.',
    v_mgr)
  RETURNING id INTO v_pip;

  -- Concerns seeded from the weak (<=2) performance items — no-surprises trail.
  INSERT INTO pip_concerns (pip_id, sort_order, area, observations, previously_raised)
  SELECT v_pip, row_number() OVER (ORDER BY rs.score, pc.sort_order) - 1,
         pc.name || ' (performance)', rs.notes, 'Raised in the ' || v_period || ' review'
  FROM review_scores rs JOIN performance_criteria pc ON pc.id = rs.item_id
  WHERE rs.review_id = v_perf AND rs.score <= 2
  ORDER BY rs.score, pc.sort_order LIMIT 3;

  -- Goals from the coaching focus areas.
  INSERT INTO pip_goals (pip_id, sort_order, title, success_criteria, status)
  SELECT v_pip, fa.sort_order, fa.title, fa.coaching_note, 'pending'
  FROM coaching_plan_focus_areas fa WHERE fa.plan_id = v_plan;

  -- Standard signatures + check-ins (mirror the app's fork defaults).
  INSERT INTO pip_signatures (pip_id, sort_order, role) VALUES
    (v_pip,0,'employee'),(v_pip,1,'manager'),(v_pip,2,'hr'),(v_pip,3,'reviewer');
  INSERT INTO pip_checkins (pip_id, sort_order, label, attendees) VALUES
    (v_pip,0,'Mid-Point Review','Manager + Employee + HR'),
    (v_pip,1,'Final Review','Manager + Employee + HR');

  RAISE NOTICE 'seed 0046: seeded PIP-track demo review for %', v_emp;
END $$;

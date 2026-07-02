-- 0019 Seed Stage 2 (Assessments + Review) demo data for the same people the
-- Stage 1 seed (0017) placed in the org tree, so both new tabs render with
-- content. Idempotent: guarded by a sentinel in app_settings + per-row guards.
-- References users by seeded email (@lightspeedsystems.com), matching 0017.
DO $$
DECLARE
  e text := '@lightspeedsystems.com';
  emails text[] := ARRAY['hjames','abennett','ahesse','rpassanisi','mdurando',
                         'michael','john','jmorris','tngo','kwilliamson'];
  em text;
  uid uuid;
  i int := 0;
  cyc uuid;
  ccat_overall numeric;
  epp numeric;
  base numeric;
  bonus numeric;
  merit numeric;
  promo boolean;
  incr numeric;
BEGIN
  IF EXISTS (SELECT 1 FROM app_settings WHERE key = 'seed:org_screen_stage2_v1') THEN RETURN; END IF;

  FOREACH em IN ARRAY emails LOOP
    SELECT id INTO uid FROM users WHERE email = em || e;
    IF uid IS NULL THEN CONTINUE; END IF;
    i := i + 1;

    ccat_overall := 34 + (i * 3) % 14;              -- 34..47 (CCAT is /50)
    epp := 62 + (i * 7) % 34;                        -- 62..95

    -- ---- Assessment summary ----
    INSERT INTO assessment_summaries (user_id, ccat_color, epp_color, epp_profile, epp_score)
    VALUES (uid,
      CASE WHEN ccat_overall >= 42 THEN 'green' WHEN ccat_overall >= 37 THEN 'yellow' ELSE 'red' END,
      CASE WHEN epp >= 80 THEN 'green' WHEN epp >= 68 THEN 'yellow' ELSE 'red' END,
      (ARRAY['Driver','Collaborator','Strategist','Builder','Operator'])[1 + (i % 5)],
      epp)
    ON CONFLICT (user_id) DO NOTHING;

    -- ---- CCAT sections (Overall = badge; rest = breakdown bars; /50) ----
    INSERT INTO assessment_ccat_sections (user_id, label, score, sort_order) VALUES
      (uid, 'Overall', ccat_overall, 0),
      (uid, 'Verbal',  8 + (i * 2) % 5, 10),
      (uid, 'Spatial', 7 + (i * 3) % 6, 20),
      (uid, 'Numeric', 9 + (i)     % 4, 30),
      (uid, 'Logic',   8 + (i * 2) % 5, 40);

    -- ---- EPP priority attributes ----
    INSERT INTO assessment_epp_attributes
      (user_id, name, st6_score, epp_score, final_score, weightage, color_hex, sort_order) VALUES
      (uid, 'Achievement Drive', 70 + (i * 3) % 25, 68 + (i * 2) % 25, 72 + (i)     % 20, 25, '#4285f4', 10),
      (uid, 'Resilience',        65 + (i * 4) % 30, 66 + (i * 3) % 25, 70 + (i * 2) % 18, 20, '#34a853', 20),
      (uid, 'Collaboration',     60 + (i * 5) % 35, 62 + (i * 4) % 30, 66 + (i * 3) % 22, 20, '#ffd400', 30),
      (uid, 'Adaptability',      68 + (i * 2) % 25, 64 + (i * 3) % 28, 69 + (i)     % 20, 20, '#ea4335', 40),
      (uid, 'Integrity',         75 + (i)     % 20, 72 + (i * 2) % 22, 78 + (i)     % 15, 15, '#378ADD', 50);

    -- ---- Insight profiles (4 colors, one primary) ----
    INSERT INTO assessment_insight_profiles
      (user_id, color, conscious_score, less_conscious_score, is_primary, sort_order) VALUES
      (uid, 'blue',   40 + (i * 5) % 55, 35 + (i * 4) % 50, (i % 4 = 0), 10),
      (uid, 'green',  45 + (i * 4) % 50, 40 + (i * 3) % 45, (i % 4 = 1), 20),
      (uid, 'yellow', 30 + (i * 6) % 60, 38 + (i * 5) % 50, (i % 4 = 2), 30),
      (uid, 'red',    35 + (i * 3) % 55, 42 + (i * 4) % 45, (i % 4 = 3), 40);

    -- ---- Review cycle (FINAL) + comp inputs (dollars derived at render) ----
    base  := 120000 + i * 7500;
    bonus := 0.15 + (i % 3) * 0.05;                 -- 0.15 / 0.20 / 0.25
    merit := 0.03 + (i % 4) * 0.01;                 -- 0.03 .. 0.06
    promo := (i % 5 = 0);
    incr  := round(base * merit) + (CASE WHEN promo THEN 15000 ELSE 0 END);

    INSERT INTO review_cycles (user_id, label, status, sort_order,
      score_total, score_values, score_performance, rank, rank_of, tier,
      start_base, start_bonus_pct, merit_base_pct, has_promotion, final_salary_increase, final_new_ote)
    VALUES (uid, '2025 H2', 'FINAL', 10,
      3.6 + (i % 5) * 0.2, 3.5 + (i % 4) * 0.25, 3.7 + (i % 3) * 0.2,
      1 + (i % 8), 8, (ARRAY['Exceptional','Strong','Solid','Developing'])[1 + (i % 4)],
      base, bonus, merit, promo, incr, round((base + incr) * (1 + bonus)))
    RETURNING id INTO cyc;

    INSERT INTO review_value_details (cycle_id, name, score, sort_order) VALUES
      (cyc, 'Customer Obsession', 3 + (i)     % 3, 10),
      (cyc, 'Ownership',          3 + (i * 2) % 3, 20),
      (cyc, 'Bias for Action',    2 + (i)     % 4, 30),
      (cyc, 'Deliver Results',    3 + (i)     % 3, 40),
      (cyc, 'Earn Trust',         5 - (i)     % 3, 50);

    -- ---- Second, in-progress cycle for the first few people ----
    IF i <= 4 THEN
      INSERT INTO review_cycles (user_id, label, status, sort_order,
        score_total, score_values, score_performance, rank, rank_of, tier,
        start_base, start_bonus_pct, merit_base_pct, has_promotion, final_salary_increase, final_new_ote)
      VALUES (uid, '2026 H1', 'IN_PROGRESS', 20,
        NULL, NULL, NULL, NULL, NULL, NULL,
        base + incr, bonus, 0.04, false, 0, round((base + incr) * (1 + bonus)))
      RETURNING id INTO cyc;
      INSERT INTO review_value_details (cycle_id, name, score, sort_order) VALUES
        (cyc, 'Customer Obsession', 4, 10),
        (cyc, 'Ownership',          3, 20),
        (cyc, 'Bias for Action',    4, 30);
    END IF;
  END LOOP;

  INSERT INTO app_settings (key, value, description)
  VALUES ('seed:org_screen_stage2_v1', 'true'::jsonb, 'Org screen stage-2 demo seed (assessments + review)');
END $$;

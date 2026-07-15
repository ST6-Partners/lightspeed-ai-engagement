-- 0047_seed_brooke_assessment_by_name.sql
-- Follow-up to 0046. 0046 keyed Brooke's real assessment to the org-chart intern
-- (brooke.friedman@lightspeedsystems.com). But there is a SECOND "Brooke Friedman"
-- user (the real logged-in account, provisioned at first login, dept Operations),
-- and that is the record surfaced on the Organization → Assessments card. This
-- migration attaches the SAME real data to EVERY user named 'Brooke Friedman'
-- that does not already have an assessment, so the card renders regardless of
-- which Brooke node is selected. Idempotent via app_settings sentinel.
DO $$
DECLARE
  uid uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM app_settings WHERE key = 'seed:brooke_assessment_byname_v1') THEN RETURN; END IF;

  FOR uid IN
    SELECT id FROM users
     WHERE name ILIKE 'Brooke Friedman'
       AND id NOT IN (SELECT user_id FROM assessment_summaries)
  LOOP
    INSERT INTO assessment_summaries (user_id, ccat_color, epp_color, epp_profile, epp_score)
    VALUES (uid, 'yellow', 'green', 'Analysis, Planning & Consulting', 84)
    ON CONFLICT (user_id) DO NOTHING;

    INSERT INTO assessment_ccat_sections (user_id, label, score, sort_order) VALUES
      (uid, 'Overall',      37, 0),
      (uid, 'Spatial',      96, 10),
      (uid, 'Verbal',       95, 20),
      (uid, 'Math & Logic', 85, 30);

    INSERT INTO assessment_epp_attributes
      (user_id, name, st6_score, epp_score, final_score, weightage, color_hex, sort_order) VALUES
      (uid, 'Achievement',      89, NULL, NULL, NULL, '#639922', 10),
      (uid, 'Assertiveness',    95, NULL, NULL, NULL, '#639922', 20),
      (uid, 'Competitiveness',  85, NULL, NULL, NULL, '#639922', 30),
      (uid, 'Conscientiousness',96, NULL, NULL, NULL, '#639922', 40),
      (uid, 'Cooperativeness',   1, NULL, NULL, NULL, '#E24B4A', 50),
      (uid, 'Extroversion',     42, NULL, NULL, NULL, '#E24B4A', 60),
      (uid, 'Managerial',       64, NULL, NULL, NULL, '#EF9F27', 70),
      (uid, 'Motivation',       83, NULL, NULL, NULL, '#639922', 80),
      (uid, 'Openness',         86, NULL, NULL, NULL, '#639922', 90),
      (uid, 'Patience',         18, NULL, NULL, NULL, '#E24B4A', 100),
      (uid, 'Self-Confidence',  87, NULL, NULL, NULL, '#639922', 110),
      (uid, 'Stress Tolerance', 21, NULL, NULL, NULL, '#E24B4A', 120);

    INSERT INTO assessment_insight_profiles
      (user_id, color, conscious_score, less_conscious_score, is_primary, sort_order) VALUES
      (uid, 'blue',   59, 79, false, 10),
      (uid, 'green',   9,  3, false, 20),
      (uid, 'yellow', 21, 41, false, 30),
      (uid, 'red',    97, 91, true,  40);
  END LOOP;

  INSERT INTO app_settings (key, value, description)
  VALUES ('seed:brooke_assessment_byname_v1', 'true'::jsonb, 'Attach real Brooke Friedman assessment to all same-named users (0046 follow-up)');
END $$;

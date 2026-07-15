-- 0045_seed_brooke_assessment.sql
-- Loads a REAL assessment record (Brooke Friedman) so the Assessments person
-- card renders with real CCAT / EPP / Insights data instead of only the
-- synthetic 0019 demo people. Keyed by email, matching 0019's pattern.
-- Source: Brooke's uploaded Criteria CCAT, Criteria EPP, and Insights Discovery
-- ("22 Reforming Director") PDFs. Idempotent via an app_settings sentinel.
--
-- Also re-scales the 0019 DEMO CCAT sub-category scores. Stage-2 originally
-- stored CCAT breakdown on a /50 scale; the person card now renders CCAT
-- sub-categories as 0-100 percentiles (matching the reference design and the
-- real Criteria report), so the small demo values are bumped into percentile
-- range to keep every demo card looking right. The 'Overall' row (the raw
-- badge, /50) is left untouched.
DO $$
DECLARE
  uid uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM app_settings WHERE key = 'seed:brooke_assessment_v1') THEN RETURN; END IF;

  -- ---- Re-scale demo CCAT sub-categories to 0-100 percentiles (not Overall) ----
  UPDATE assessment_ccat_sections
     SET score = LEAST(99, round(score * 7 + 25))
   WHERE lower(label) <> 'overall'
     AND user_id IN (
       SELECT id FROM users
        WHERE email = ANY (ARRAY[
          'hjames@lightspeedsystems.com','abennett@lightspeedsystems.com','ahesse@lightspeedsystems.com',
          'rpassanisi@lightspeedsystems.com','mdurando@lightspeedsystems.com','michael@lightspeedsystems.com',
          'john@lightspeedsystems.com','jmorris@lightspeedsystems.com','tngo@lightspeedsystems.com',
          'kwilliamson@lightspeedsystems.com'
        ]) 
     );

  -- ---- Brooke's real record ----
  SELECT id INTO uid FROM users WHERE email = 'brooke.friedman@lightspeedsystems.com';
  IF uid IS NULL THEN RETURN; END IF;

  -- defensive: clear any prior assessment rows for this user
  DELETE FROM assessment_summaries        WHERE user_id = uid;
  DELETE FROM assessment_ccat_sections    WHERE user_id = uid;
  DELETE FROM assessment_epp_attributes   WHERE user_id = uid;
  DELETE FROM assessment_insight_profiles WHERE user_id = uid;

  -- Summary: CCAT badge = raw 37/50 (amber); EPP has no single overall in
  -- Criteria, so the badge uses the MEDIAN of the 12 trait percentiles (84,
  -- green); profile = top job-family match. All adjustable via the admin form.
  INSERT INTO assessment_summaries (user_id, ccat_color, epp_color, epp_profile, epp_score)
  VALUES (uid, 'yellow', 'green', 'Analysis, Planning & Consulting', 84);

  -- CCAT: Overall = raw score /50 (the badge); sub-categories = percentiles.
  INSERT INTO assessment_ccat_sections (user_id, label, score, sort_order) VALUES
    (uid, 'Overall',      37, 0),
    (uid, 'Spatial',      96, 10),
    (uid, 'Verbal',       95, 20),
    (uid, 'Math & Logic', 85, 30);

  -- EPP: all 12 trait percentiles (st6_score = percentile; raw not provided by
  -- Criteria). color_hex banded >=80 green / 50-79 amber / <50 red.
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

  -- Insights Colour Dynamics: conscious + less-conscious per colour. Red is
  -- primary (highest conscious). blue->green->yellow->red render order.
  INSERT INTO assessment_insight_profiles
    (user_id, color, conscious_score, less_conscious_score, is_primary, sort_order) VALUES
    (uid, 'blue',   59, 79, false, 10),
    (uid, 'green',   9,  3, false, 20),
    (uid, 'yellow', 21, 41, false, 30),
    (uid, 'red',    97, 91, true,  40);

  INSERT INTO app_settings (key, value, description)
  VALUES ('seed:brooke_assessment_v1', 'true'::jsonb, 'Real assessment record (Brooke Friedman) + demo CCAT percentile re-scale');
END $$;

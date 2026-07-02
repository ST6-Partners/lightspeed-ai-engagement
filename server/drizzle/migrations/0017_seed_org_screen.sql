-- Seed a demo org hierarchy + tab data so the Org screen renders with content
-- (spec acceptance). Idempotent: guarded by a sentinel in app_settings so it
-- runs exactly once even if replayed. References users by seeded email.
DO $$
DECLARE
  e text := '@lightspeedsystems.com';
BEGIN
  IF EXISTS (SELECT 1 FROM app_settings WHERE key = 'seed:org_screen_v1') THEN RETURN; END IF;

  -- ---- Manager hierarchy (4 levels) ----
  UPDATE users SET manager_id = NULL WHERE email = 'wlawrence'||e;                                   -- CEO root
  UPDATE users SET manager_id = (SELECT id FROM users WHERE email='wlawrence'||e) WHERE email IN ('hjames'||e,'mcanales'||e,'patrick'||e);
  UPDATE users SET manager_id = (SELECT id FROM users WHERE email='hjames'||e)    WHERE email IN ('abennett'||e,'kwilliamson'||e);
  UPDATE users SET manager_id = (SELECT id FROM users WHERE email='mcanales'||e)  WHERE email IN ('jadkins'||e,'ntribo'||e);
  UPDATE users SET manager_id = (SELECT id FROM users WHERE email='abennett'||e)  WHERE email IN ('ahesse'||e,'rpassanisi'||e,'mdurando'||e);
  UPDATE users SET manager_id = (SELECT id FROM users WHERE email='kwilliamson'||e) WHERE email IN ('michael'||e,'john'||e);
  UPDATE users SET manager_id = (SELECT id FROM users WHERE email='jadkins'||e)   WHERE email IN ('jmorris'||e,'fromero'||e,'wing'||e);
  UPDATE users SET manager_id = (SELECT id FROM users WHERE email='ntribo'||e)    WHERE email IN ('tngo'||e,'sgillani'||e);

  -- ---- Leader badges ----
  UPDATE users SET leader_badge = 'ELT' WHERE email IN ('wlawrence'||e,'hjames'||e,'mcanales'||e,'patrick'||e);
  UPDATE users SET leader_badge = 'SLT' WHERE email IN ('abennett'||e,'kwilliamson'||e,'jadkins'||e,'ntribo'||e);

  -- ---- A couple of people as managers/admins so 9 Box rating + admin work ----
  UPDATE users SET role = 'admin'   WHERE email = 'wlawrence'||e;
  UPDATE users SET role = 'manager' WHERE email IN ('hjames'||e,'mcanales'||e,'abennett'||e,'kwilliamson'||e,'jadkins'||e,'ntribo'||e);

  -- ---- OKRs (with ownerUserId) ----
  INSERT INTO okr_nodes (type, title, owner, owner_user_id, status, sort_order)
  SELECT 'objective', 'Grow ARR to $120M', u.name, u.id, 'in_progress', 10 FROM users u WHERE u.email='hjames'||e;
  INSERT INTO okr_nodes (type, title, owner, owner_user_id, status, sort_order)
  SELECT 'objective', 'Ship the AI Engagement platform', u.name, u.id, 'in_progress', 10 FROM users u WHERE u.email='abennett'||e;
  INSERT INTO okr_nodes (parent_id, type, title, status, sort_order)
  SELECT o.id, 'key_result', 'Reach 500 paying orgs', 'in_progress', 10 FROM okr_nodes o WHERE o.title='Grow ARR to $120M';
  INSERT INTO okr_nodes (parent_id, type, title, status, sort_order)
  SELECT o.id, 'key_result', 'Net revenue retention >= 115%', 'not_started', 20 FROM okr_nodes o WHERE o.title='Grow ARR to $120M';
  INSERT INTO okr_nodes (parent_id, type, title, status, sort_order)
  SELECT o.id, 'key_result', 'Launch Org screen to GA', 'complete', 10 FROM okr_nodes o WHERE o.title='Ship the AI Engagement platform';
  INSERT INTO okr_nodes (parent_id, type, title, status, sort_order)
  SELECT o.id, 'key_result', 'Onboard 8 pilot customers', 'in_progress', 20 FROM okr_nodes o WHERE o.title='Ship the AI Engagement platform';

  -- ---- Priorities: two objective-pointers, rest KTBR free-text ----
  INSERT INTO priorities (user_id, item_type, okr_node_id, sort_order)
  SELECT u.id, 'objective', o.id, 10 FROM users u, okr_nodes o WHERE u.email='hjames'||e AND o.title='Grow ARR to $120M';
  INSERT INTO priorities (user_id, item_type, okr_node_id, sort_order)
  SELECT u.id, 'objective', o.id, 10 FROM users u, okr_nodes o WHERE u.email='abennett'||e AND o.title='Ship the AI Engagement platform';
  INSERT INTO priorities (user_id, item_type, ktbr_label, sort_order)
  SELECT u.id, 'ktbr', v.lbl, v.so FROM users u, (VALUES
    ('ahesse'||e,'Close out Q3 security review',10),
    ('ahesse'||e,'Mentor two new engineers',20),
    ('rpassanisi'||e,'Reduce build times by 30%',10),
    ('mdurando'||e,'Ship the reporting API',10),
    ('michael'||e,'Refactor billing service',10),
    ('john'||e,'Hire 3 SDRs',10),
    ('jmorris'||e,'Launch onboarding revamp',10),
    ('tngo'||e,'Design the 9 Box UX',10)
  ) AS v(email,lbl,so) WHERE u.email = v.email;

  -- ---- Engagement snapshots: 3 monthly periods for ~10 people ----
  INSERT INTO engagement_snapshots (user_id, as_of, score, drivers)
  SELECT u.id, d.as_of::date, d.score,
    jsonb_build_array(
      jsonb_build_object('label','Workload','value', d.score - 6),
      jsonb_build_object('label','Growth','value', d.score + 4),
      jsonb_build_object('label','Recognition','value', d.score - 10),
      jsonb_build_object('label','Manager','value', d.score + 2)
    )
  FROM users u, (VALUES
    ('hjames'||e,'2026-05-01',78),('hjames'||e,'2026-06-01',81),('hjames'||e,'2026-07-01',84),
    ('abennett'||e,'2026-05-01',72),('abennett'||e,'2026-06-01',70),('abennett'||e,'2026-07-01',75),
    ('ahesse'||e,'2026-05-01',65),('ahesse'||e,'2026-06-01',60),('ahesse'||e,'2026-07-01',58),
    ('rpassanisi'||e,'2026-05-01',88),('rpassanisi'||e,'2026-06-01',86),('rpassanisi'||e,'2026-07-01',90),
    ('mdurando'||e,'2026-06-01',45),('mdurando'||e,'2026-07-01',42),
    ('michael'||e,'2026-06-01',77),('michael'||e,'2026-07-01',79),
    ('john'||e,'2026-06-01',68),('john'||e,'2026-07-01',71),
    ('jmorris'||e,'2026-07-01',83),
    ('tngo'||e,'2026-07-01',74),
    ('sgillani'||e,'2026-07-01',52)
  ) AS d(email,as_of,score) WHERE u.email = d.email;

  -- ---- 9 Box ratings for ~6 people (leave others unrated) ----
  INSERT INTO nine_box_ratings (user_id, box, rated_by)
  SELECT u.id, v.box, (SELECT id FROM users WHERE email='wlawrence'||e)
  FROM users u, (VALUES
    ('hjames'||e,9),('abennett'||e,8),('ahesse'||e,5),
    ('rpassanisi'||e,6),('mdurando'||e,2),('michael'||e,5)
  ) AS v(email,box) WHERE u.email = v.email;

  INSERT INTO app_settings (key, value, description)
  VALUES ('seed:org_screen_v1', 'true'::jsonb, 'Org screen stage-1 demo seed (hierarchy + tab data)');
END $$;

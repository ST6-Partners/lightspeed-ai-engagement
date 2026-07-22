-- 0070 Seed demo 9 Box ratings so the Top performers / Needs attention rails
-- render with content. Additive + idempotent: guarded by an app_settings sentinel,
-- rates only active users who have NO existing rating (never disturbs real
-- placements), rated_by left NULL. Distributes 27 people evenly across all
-- nine boxes (3 per box) so both rails and every cell have content.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM app_settings WHERE key = 'seed:ninebox_demo_v1') THEN RETURN; END IF;

  INSERT INTO nine_box_ratings (user_id, box, rated_by)
  SELECT u.id, (((u.rn - 1) % 9) + 1)::smallint, NULL
  FROM (
    SELECT id, row_number() OVER (ORDER BY id) AS rn
    FROM users
    WHERE is_active = true
      AND id NOT IN (SELECT user_id FROM nine_box_ratings)
    LIMIT 27
  ) u;

  INSERT INTO app_settings (key, value, description)
  VALUES ('seed:ninebox_demo_v1', 'true'::jsonb, '9 Box demo ratings (sample of 27 users across all boxes)');
END $$;

-- 0021 Bring the leader titles into the controlled vocabulary (job_titles) so
-- they appear in the Title droplist and each leader is linked via job_title_id
-- (0020 only set the free-text users.title, which the droplist does not show).
-- Per request: the CEO title is already in the table, so its level is left
-- untouched; the other five are added at level 'L1'. Idempotent: ON CONFLICT on
-- the unique job_titles.title; safe to re-run.
DO $$
DECLARE
  dom text := '@lightspeedsystems.com';
  rec record;
  tid uuid;
BEGIN
  FOR rec IN
    SELECT * FROM (VALUES
      ('bthomas',      'Chief Executive Officer and President',                       NULL, 10),
      ('korgeldinger', 'President and Chief Financial Officer (CFO)',                 'L1', 20),
      ('dmcmahon',     'Chief Artificial Intelligence Officer',                       'L1', 30),
      ('kchiang',      'Executive Vice President, Finance and Corporate Development',  'L1', 40),
      ('wlawrence',    'Vice President, Operations',                                  'L1', 50),
      ('cmccabe',      'General Manager, International',                              'L1', 60)
    ) AS t(handle, title, lvl, so)
  LOOP
    INSERT INTO job_titles (title, level, sort_order) VALUES (rec.title, rec.lvl, rec.so)
    ON CONFLICT (title) DO UPDATE
      SET level = COALESCE(EXCLUDED.level, job_titles.level),  -- keep CEO's existing level
          is_active = true,
          updated_at = now()
    RETURNING id INTO tid;

    UPDATE users SET job_title_id = tid, updated_at = now()
    WHERE email = rec.handle || dom;
  END LOOP;
END $$;

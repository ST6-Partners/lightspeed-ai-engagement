-- 0020 Seed the Lightspeed leadership team as ELT users with their titles.
-- Employees ARE users (org tree = users.managerId); these are directory records
-- with the free-text `title` column set (the Org tree uses it as the title
-- source when no job_titles lookup is linked). Idempotent via ON CONFLICT(email):
-- re-running refreshes name/title/badge but never downgrades role (wlawrence is
-- seeded as CEO-root/admin in 0017, so role is left untouched on conflict).
-- NOTE: emails follow the 0017 convention (first-initial + last name
-- @lightspeedsystems.com); adjust if the real addresses differ.
DO $$
DECLARE
  dom text := '@lightspeedsystems.com';
  rec record;
BEGIN
  FOR rec IN
    SELECT * FROM (VALUES
      ('bthomas',      'Brian Thomas',      'Chief Executive Officer and President'),
      ('korgeldinger', 'Kirk Orgeldinger',  'President and Chief Financial Officer (CFO)'),
      ('dmcmahon',     'Donal McMahon',     'Chief Artificial Intelligence Officer'),
      ('kchiang',      'Kevin Chiang',      'Executive Vice President, Finance and Corporate Development'),
      ('wlawrence',    'Wes Lawrence',      'Vice President, Operations'),
      ('cmccabe',      'Colin McCabe',      'General Manager, International')
    ) AS t(handle, full_name, title)
  LOOP
    INSERT INTO users (sub, email, name, title, leader_badge, role)
    VALUES ('local:' || rec.handle || dom, rec.handle || dom, rec.full_name, rec.title, 'ELT', 'manager')
    ON CONFLICT (email) DO UPDATE
      SET name = EXCLUDED.name,
          title = EXCLUDED.title,
          leader_badge = 'ELT',
          updated_at = now();
  END LOOP;
END $$;

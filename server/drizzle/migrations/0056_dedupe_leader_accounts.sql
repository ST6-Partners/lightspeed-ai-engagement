-- 0056_dedupe_leader_accounts.sql
-- These 5 leaders each had TWO rows: an old-format inactive copy (first-initial
-- handle, from the 0020 leaders seed) and the real active org-chart account
-- (first.last, from 0023). Delete the old inactive copies so each person has a
-- single ACTIVE record. Safe: only deletes rows that are is_active = false, so
-- the real accounts can never be removed; idempotent. Manager self-links are
-- ON DELETE SET NULL, and the org reporting lines point at the .first.last
-- accounts, not these.
DELETE FROM users
 WHERE lower(email) IN (
    'bthomas@lightspeedsystems.com',
    'korgeldinger@lightspeedsystems.com',
    'dmcmahon@lightspeedsystems.com',
    'kchiang@lightspeedsystems.com',
    'cmccabe@lightspeedsystems.com'
  )
   AND is_active = false;
--> statement-breakpoint
-- Make sure the real accounts are active.
UPDATE users SET is_active = true, updated_at = now()
 WHERE lower(email) IN (
    'brian.thomas@lightspeedsystems.com',
    'kirk.orgeldinger@lightspeedsystems.com',
    'donal.mcmahon@lightspeedsystems.com',
    'kevin.chiang@lightspeedsystems.com',
    'colin.mccabe@lightspeedsystems.com'
  );

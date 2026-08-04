-- ============================================================
-- AIE 2026-08-03 — Brooke Friedman to Sysadmin.
--
-- 0100 retired the ST6 badge and moved its sole holder to admin. Admin
-- cannot reach Admin > Sysadmin > Employees, which is the roster she
-- administers, so the level is corrected here (PM ruling, same session).
--
-- Keyed on the exact ST6 address. There is a SECOND, unrelated
-- "Brooke Friedman" in the roster (brooke.friedman@lightspeedsystems.com,
-- an intern seeded by 0023) — matching on name would promote the wrong
-- person, so this matches on email only.
--
-- Legacy role kept in step with access_level while both columns are live.
-- Idempotent.
-- ============================================================

UPDATE "users"
SET "access_level" = 'sysadmin',
    "role"         = 'sysadmin',
    "leader_badge" = NULL,
    "is_hr_access" = false,
    "updated_at"   = now()
WHERE lower("email") = 'bsf@st6partners.com';

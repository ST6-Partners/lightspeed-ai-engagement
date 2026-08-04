-- ============================================================
-- AIE 2026-08-03 — managers read Core Data.
--
-- 0102 set manager/documents to 'none', which blocked the whole Core Data
-- area at the route guard, so the per-item capabilities never got a chance to
-- run. PM confirmed managers should see the full Core Data tab.
--
-- Item-level exclusions still apply on top of this (services/capabilities.ts);
-- the area grant only decides whether the section opens at all.
-- Idempotent.
-- ============================================================

UPDATE "access_grants" SET "reach" = 'all', "updated_at" = now()
WHERE "level" = 'manager' AND "area" = 'documents';

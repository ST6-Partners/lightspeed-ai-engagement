-- 0058_remove_vacant_seats.sql
-- Remove the '(Vacant)' open-seat placeholder rows (loaded in 0025). They are
-- not real employees and aren't in the org chart; dropping them to avoid
-- confusion. Matches any vacant.N@lightspeedsystems.com seat. Anyone whose
-- manager_id happened to point at a vacant seat is auto-detached (self-FK is
-- ON DELETE SET NULL). Idempotent — deletes nothing once they're gone.
DELETE FROM users WHERE lower(email) LIKE 'vacant.%@lightspeedsystems.com';

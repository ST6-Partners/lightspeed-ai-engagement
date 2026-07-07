-- 0027 Remove the vacant open-req nodes that 0025 added. Per request, vacancies
-- should not populate the employee directory or headcount — the org tree and
-- counts should reflect filled seats (people) only. Idempotent DELETE keyed by
-- the synthetic vacant.* emails 0025 used; nothing references these rows.
DELETE FROM users WHERE email LIKE 'vacant.%@lightspeedsystems.com';

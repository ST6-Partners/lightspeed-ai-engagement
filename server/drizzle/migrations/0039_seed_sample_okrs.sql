-- Sample OKRs demonstrating explicit team (department) + person (owner) tagging.
-- Idempotent via fixed UUIDs + ON CONFLICT DO NOTHING. Owners/teams resolved
-- from live data (departments + active users), so no hardcoded ids. If a
-- department has fewer members than referenced, those rows simply no-op.

-- ── Sales: team objective + per-person key results ──
INSERT INTO okr_nodes (id, type, title, owner, owner_user_id, department_id, status, light, start_date, sort_order, description)
SELECT '6f5a1e00-0000-4000-8000-000000000001', 'objective',
       'Hit $30M new-business ARR in FY26', u.name, u.id, d.id, 'in_progress', 'green', CURRENT_DATE, 2000,
       'Sales team goal — grow new-business ARR, broken into per-rep targets.'
FROM departments d
JOIN LATERAL (SELECT id, name FROM users WHERE department_id = d.id AND is_active ORDER BY name LIMIT 1) u ON true
WHERE d.name = 'Sales'
ON CONFLICT (id) DO NOTHING;--> statement-breakpoint

INSERT INTO okr_nodes (id, parent_id, type, title, owner, owner_user_id, department_id, status, light, start_date, sort_order)
SELECT '6f5a1e00-0000-4000-8000-000000000002', '6f5a1e00-0000-4000-8000-000000000001', 'key_result',
       'Close 40 new logos', u.name, u.id, d.id, 'in_progress', 'yellow', CURRENT_DATE, 10
FROM departments d
JOIN LATERAL (SELECT id, name FROM users WHERE department_id = d.id AND is_active ORDER BY name OFFSET 1 LIMIT 1) u ON true
WHERE d.name = 'Sales'
ON CONFLICT (id) DO NOTHING;--> statement-breakpoint

INSERT INTO okr_nodes (id, parent_id, type, title, owner, owner_user_id, department_id, status, light, start_date, sort_order)
SELECT '6f5a1e00-0000-4000-8000-000000000003', '6f5a1e00-0000-4000-8000-000000000001', 'key_result',
       'Grow expansion ARR to $8M', u.name, u.id, d.id, 'in_progress', 'green', CURRENT_DATE, 20
FROM departments d
JOIN LATERAL (SELECT id, name FROM users WHERE department_id = d.id AND is_active ORDER BY name OFFSET 2 LIMIT 1) u ON true
WHERE d.name = 'Sales'
ON CONFLICT (id) DO NOTHING;--> statement-breakpoint

INSERT INTO okr_nodes (id, parent_id, type, title, owner, owner_user_id, department_id, status, start_date, sort_order)
SELECT '6f5a1e00-0000-4000-8000-000000000004', '6f5a1e00-0000-4000-8000-000000000002', 'task',
       'Stand up outbound sequence for mid-market', u.name, u.id, d.id, 'not_started', CURRENT_DATE, 10
FROM departments d
JOIN LATERAL (SELECT id, name FROM users WHERE department_id = d.id AND is_active ORDER BY name OFFSET 3 LIMIT 1) u ON true
WHERE d.name = 'Sales'
ON CONFLICT (id) DO NOTHING;--> statement-breakpoint

-- ── Marketing: team objective + per-person key results ──
INSERT INTO okr_nodes (id, type, title, owner, owner_user_id, department_id, status, light, start_date, sort_order, description)
SELECT '6f4d4b00-0000-4000-8000-000000000001', 'objective',
       'Generate 5,000 marketing-qualified leads', u.name, u.id, d.id, 'in_progress', 'green', CURRENT_DATE, 2100,
       'Marketing team goal — MQL generation, broken into per-owner programs.'
FROM departments d
JOIN LATERAL (SELECT id, name FROM users WHERE department_id = d.id AND is_active ORDER BY name LIMIT 1) u ON true
WHERE d.name = 'Marketing'
ON CONFLICT (id) DO NOTHING;--> statement-breakpoint

INSERT INTO okr_nodes (id, parent_id, type, title, owner, owner_user_id, department_id, status, light, start_date, sort_order)
SELECT '6f4d4b00-0000-4000-8000-000000000002', '6f4d4b00-0000-4000-8000-000000000001', 'key_result',
       'Launch 3 lifecycle email campaigns', u.name, u.id, d.id, 'in_progress', 'yellow', CURRENT_DATE, 10
FROM departments d
JOIN LATERAL (SELECT id, name FROM users WHERE department_id = d.id AND is_active ORDER BY name OFFSET 1 LIMIT 1) u ON true
WHERE d.name = 'Marketing'
ON CONFLICT (id) DO NOTHING;--> statement-breakpoint

INSERT INTO okr_nodes (id, parent_id, type, title, owner, owner_user_id, department_id, status, light, start_date, sort_order)
SELECT '6f4d4b00-0000-4000-8000-000000000003', '6f4d4b00-0000-4000-8000-000000000001', 'key_result',
       'Grow organic traffic 40%', u.name, u.id, d.id, 'not_started', 'red', CURRENT_DATE, 20
FROM departments d
JOIN LATERAL (SELECT id, name FROM users WHERE department_id = d.id AND is_active ORDER BY name OFFSET 2 LIMIT 1) u ON true
WHERE d.name = 'Marketing'
ON CONFLICT (id) DO NOTHING;

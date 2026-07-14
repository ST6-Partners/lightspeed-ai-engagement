-- Demo data for the weighted-rollup + weekly-plan-checkbox feature. Idempotent
-- (fixed ids + ON CONFLICT). Sets differentiated weights/statuses on the sample
-- OKRs so the rollup shows meaningful, non-round percentages, and seeds the
-- current user's (bsf) weekly plan with OKR-linked to-dos to check off.

-- ── Sales tree: weights + statuses (objective ≈ 63% before any checkbox) ──
UPDATE okr_nodes SET weight = 3, status = 'in_progress', light = 'yellow'
  WHERE id = '6f5a1e00-0000-4000-8000-000000000002';   -- KR: Close 40 new logos (has the task below)
UPDATE okr_nodes SET weight = 1, status = 'complete', light = 'green'
  WHERE id = '6f5a1e00-0000-4000-8000-000000000003';   -- KR: Grow expansion ARR to $8M (done)
UPDATE okr_nodes SET status = 'in_progress', light = 'yellow'
  WHERE id = '6f5a1e00-0000-4000-8000-000000000004';   -- Task: Stand up outbound (→ KR0002 = 50%)
--> statement-breakpoint

-- ── Marketing tree: weights + statuses (objective ≈ 33% before any checkbox) ──
UPDATE okr_nodes SET weight = 2, status = 'in_progress', light = 'yellow'
  WHERE id = '6f4d4b00-0000-4000-8000-000000000002';   -- KR: Launch 3 lifecycle campaigns
UPDATE okr_nodes SET weight = 1, status = 'not_started', light = 'red'
  WHERE id = '6f4d4b00-0000-4000-8000-000000000003';   -- KR: Grow organic traffic 40%
--> statement-breakpoint

-- ── Seed the current user's weekly plan with OKR-linked to-dos ──
-- Links to the Sales task + Marketing KR above; checking them completes those
-- nodes and moves the rollup. Skips if the user already has a plan this week.
INSERT INTO weekly_checkins (user_id, week_start, priorities, status)
SELECT u.id, date_trunc('week', CURRENT_DATE)::date,
  jsonb_build_array(
    jsonb_build_object('text', 'Stand up outbound sequence for mid-market',
      'okrNodeId', '6f5a1e00-0000-4000-8000-000000000004', 'done', false),
    jsonb_build_object('text', 'Grow organic traffic 40%',
      'okrNodeId', '6f4d4b00-0000-4000-8000-000000000003', 'done', false),
    jsonb_build_object('text', 'Prep Q3 board deck', 'okrNodeId', null, 'done', false)
  ),
  'draft'
FROM users u
WHERE u.email = 'bsf@st6partners.com'
ON CONFLICT (user_id, week_start) DO NOTHING;

-- Insights Dashboard (Manager Brief) assignments reach the employee's Weekly Plan
-- (AI Engagement, 2026-08-04).
--
-- There are two ways to assign an action item, and only one of them was fixed on
-- 2026-07-30. Migration 0098 + oneOnOne.actionItemsAdd made manager-assigned items
-- from the 1:1 surface set in_weekly_plan = true. The Insights Dashboard route
-- (actions.create, shipped 2026-07-23) was missed, so it kept inserting rows at the
-- in_weekly_plan = false default: the assignee got a notification but their Weekly
-- Plan never listed the item. The router now sets the flag; this backfills the rows
-- already stranded by it.
--
-- Cutoff is deliberate. 0098's blanket backfill already flipped everything assigned
-- before it ran, so re-running that same UPDATE would also resurrect items an
-- employee has since chosen to remove from their week (the Reviews "→ Weekly Plan"
-- button toggles both ways). Restricting to rows created after 2026-07-30 keeps this
-- to items no one has ever had the chance to act on. Items assigned in the few hours
-- between the 0098 deploy and midnight on 07-30 are left alone; the employee can
-- still pull those in from Reviews.
UPDATE "action_items"
SET "in_weekly_plan" = true
WHERE "created_by" IS NOT NULL
  AND "created_by" <> "employee_id"
  AND "in_weekly_plan" = false
  AND "archived" = false
  AND "done" = false
  AND "created_at" >= '2026-07-31 00:00:00+00';

-- Make the notifications already written by actions.create clickable. They were
-- stored with reference_type 'action_item', which is absent from
-- NotificationBell.linkFor, so clicking one only marked it read and went nowhere.
-- reference_type alone is realigned; `type` is left as-is on historical rows on
-- purpose, because AssignmentNoticeModal fires a popup on UNREAD assignment types
-- and rewriting those would greet people with a stack of popups for old notices.
UPDATE "notifications"
SET "reference_type" = 'assigned_action_item'
WHERE "reference_type" = 'action_item';

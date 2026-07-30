-- Manager-assigned action items surface in the Weekly Plan automatically
-- (AI Engagement, 2026-07-30).
--
-- action_items.in_weekly_plan defaults to false and only the employee could flip
-- it (actionItemsSetInWeeklyPlan), so an action item a manager assigned never
-- appeared in the employee's Weekly Plan box unless they went looking for it in
-- the 1:1 space. Going forward actionItemsAdd sets the flag when the creator is
-- not the employee; this backfills the ones already assigned so the change
-- applies to existing items too, not just new ones.
--
-- Employee-created items are deliberately left alone: for those the flag is the
-- employee's own choice about what to pull into their week.
UPDATE "action_items"
SET "in_weekly_plan" = true
WHERE "created_by" IS NOT NULL
  AND "created_by" <> "employee_id"
  AND "archived" = false
  AND "in_weekly_plan" = false;

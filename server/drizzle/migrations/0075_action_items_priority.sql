-- 0073 Add priority tier to action_items for the Manager Brief actions
-- surface. Additive + idempotent. Existing 1:1 action items default to
-- 'medium' and the 1:1 UI ignores the column.
ALTER TABLE "action_items" ADD COLUMN IF NOT EXISTS "priority" varchar(8) NOT NULL DEFAULT 'medium';

-- Link OKR owners to the Organization directory and clear stale seed names.
-- Legacy seed (0003) wrote free-text owner names with no user FK; this links
-- what it can to real users and clears the rest so they read "Unassigned"
-- instead of surfacing people who aren't in the current org. Idempotent.

-- 1) Backfill owner_user_id from a name match against active users.
UPDATE okr_nodes AS o
SET owner_user_id = u.id
FROM users u
WHERE o.owner_user_id IS NULL
  AND o.owner IS NOT NULL
  AND u.is_active = true
  AND lower(trim(u.name)) = lower(trim(o.owner));--> statement-breakpoint

-- 2) Keep the denormalized display name in sync with the linked user.
UPDATE okr_nodes AS o
SET owner = u.name
FROM users u
WHERE o.owner_user_id = u.id;--> statement-breakpoint

-- 3) Clear owner names that never matched a user (stale/ex-employee seed data).
UPDATE okr_nodes
SET owner = NULL
WHERE owner_user_id IS NULL
  AND owner IS NOT NULL;

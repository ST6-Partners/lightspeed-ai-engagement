-- 0059 Reviews 1:1 hub — pair-scoped talking points, action items, notes.
-- Anchored on employee_id (the report); the manager is resolved via
-- users.manager_id at access time. NOT week-scoped: these persist until
-- completed/archived by hand. Additive + idempotent.

CREATE TABLE IF NOT EXISTS talking_points (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_by   uuid REFERENCES users(id) ON DELETE SET NULL,
  text         text NOT NULL,
  done         boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  archived     boolean NOT NULL DEFAULT false,
  archived_at  timestamptz,
  sort_order   integer NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_talking_points_emp ON talking_points (employee_id);

CREATE TABLE IF NOT EXISTS action_items (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_by     uuid REFERENCES users(id) ON DELETE SET NULL,
  text           text NOT NULL,
  due_date       date,
  in_weekly_plan boolean NOT NULL DEFAULT false,
  done           boolean NOT NULL DEFAULT false,
  completed_at   timestamptz,
  archived       boolean NOT NULL DEFAULT false,
  archived_at    timestamptz,
  sort_order     integer NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_action_items_emp ON action_items (employee_id);

CREATE TABLE IF NOT EXISTS one_on_one_notes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  author_id   uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scope       varchar(8) NOT NULL,               -- 'shared' | 'private'
  body        text NOT NULL DEFAULT '',
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uniq_1on1_note UNIQUE (employee_id, author_id, scope)
);
CREATE INDEX IF NOT EXISTS idx_1on1_notes_emp ON one_on_one_notes (employee_id);

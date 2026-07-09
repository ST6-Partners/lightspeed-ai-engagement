-- 0034 Coaching Plans. A coaching plan is crafted from one employee review
-- (value_evaluations): an AI-drafted, human-editable narrative summary + a
-- strengths section + 1-3 growth focus areas (each optionally tied to a
-- company value). Exported to PDF for the feedback conversation. Idempotent.

CREATE TABLE IF NOT EXISTS coaching_plans (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  evaluation_id     uuid REFERENCES value_evaluations(id) ON DELETE SET NULL,
  author_id         uuid REFERENCES users(id) ON DELETE SET NULL,
  period_label      text,
  status            varchar(16) NOT NULL DEFAULT 'draft',
  summary_narrative text,
  strengths         text,
  ai_generated      boolean NOT NULL DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_coaching_plan_employee ON coaching_plans (employee_id);

CREATE TABLE IF NOT EXISTS coaching_plan_focus_areas (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id      uuid NOT NULL REFERENCES coaching_plans(id) ON DELETE CASCADE,
  value_id     uuid REFERENCES company_values(id) ON DELETE SET NULL,
  title        varchar(200) NOT NULL,
  coaching_note text,
  sort_order   integer NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_coaching_focus_plan ON coaching_plan_focus_areas (plan_id);

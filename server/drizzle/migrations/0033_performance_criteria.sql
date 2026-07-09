-- 0033 Performance criteria (AIE-owned) + employee performance evaluations.
-- Companion axis to Company Values (0028). See server/src/db/schema/performance.ts.
-- Idempotent: CREATE TABLE IF NOT EXISTS + guarded seed. Safe to re-run.

CREATE TABLE IF NOT EXISTS performance_criteria (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        varchar(200) NOT NULL,
  definition  text,
  sort_order  integer NOT NULL DEFAULT 0,
  active      boolean NOT NULL DEFAULT true,
  source      varchar(20) NOT NULL DEFAULT 'local',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS performance_evaluations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id   uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reviewer_id   uuid REFERENCES users(id) ON DELETE SET NULL,
  period_label  text,
  status        varchar(16) NOT NULL DEFAULT 'draft',
  overall_notes text,
  evaluated_at  timestamptz NOT NULL DEFAULT now(),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_perf_eval_employee ON performance_evaluations (employee_id);

CREATE TABLE IF NOT EXISTS performance_evaluation_scores (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id uuid NOT NULL REFERENCES performance_evaluations(id) ON DELETE CASCADE,
  criterion_id  uuid NOT NULL REFERENCES performance_criteria(id) ON DELETE CASCADE,
  score         integer NOT NULL,
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uniq_perf_evaluation_criterion UNIQUE (evaluation_id, criterion_id)
);

-- Seed the starter six criteria (PE-backed software company). Guarded by name
-- so re-running the migration does not duplicate.
DO $$
DECLARE rec record;
BEGIN
  FOR rec IN
    SELECT * FROM (VALUES
      ('Results & Goal Attainment',     'Delivers the outcomes and hits the targets they are accountable for.',                         10),
      ('Execution & Follow-Through',    'Ships reliably and on time; manages scope, dependencies, and commitments without slippage.',   20),
      ('Quality & Expertise',           'Brings the skill and rigor the role demands; work is high-caliber with minimal rework.',        30),
      ('Judgment & Prioritization',     'Makes sound decisions under ambiguity and spends effort on what moves the business.',           40),
      ('Collaboration & Communication', 'Works effectively across teams and communicates clearly; makes the people around them better.',  50),
      ('Adaptability & Growth',         'Learns fast, absorbs expanding scope, and adjusts as priorities shift.',                        60)
    ) AS t(name, definition, so)
  LOOP
    INSERT INTO performance_criteria (name, definition, sort_order, source, active)
    SELECT rec.name, rec.definition, rec.so, 'local', true
    WHERE NOT EXISTS (SELECT 1 FROM performance_criteria WHERE name = rec.name);
  END LOOP;
END $$;

-- 0028 Company Values (read-only cache mirrored from ATA) + employee value
-- evaluations. See server/src/db/schema/values.ts for the architecture note.
-- Idempotent: CREATE TABLE IF NOT EXISTS + guarded seed. Safe to re-run.

-- ── company_values: local read-only mirror of ATA's values framework ──
CREATE TABLE IF NOT EXISTS company_values (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id   text,
  name          varchar(200) NOT NULL,
  pillar        varchar(80)  NOT NULL,
  category      varchar(100),
  description   text,
  rubric        jsonb DEFAULT '{}'::jsonb,
  meta          jsonb DEFAULT '{}'::jsonb,
  sort_order    integer NOT NULL DEFAULT 0,
  active        boolean NOT NULL DEFAULT true,
  source        varchar(20) NOT NULL DEFAULT 'seed',
  synced_at     timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uniq_company_value_source_external UNIQUE (source, external_id)
);

-- ── value_evaluations: a reviewer's dated scoring pass on an employee ──
CREATE TABLE IF NOT EXISTS value_evaluations (
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
CREATE INDEX IF NOT EXISTS idx_value_eval_employee ON value_evaluations (employee_id);

-- ── value_evaluation_scores: one 1-5 value score within an evaluation ──
CREATE TABLE IF NOT EXISTS value_evaluation_scores (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id uuid NOT NULL REFERENCES value_evaluations(id) ON DELETE CASCADE,
  value_id      uuid NOT NULL REFERENCES company_values(id) ON DELETE CASCADE,
  score         integer NOT NULL,
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uniq_evaluation_value UNIQUE (evaluation_id, value_id)
);

-- ── Seed a starter values framework (source='seed') so the evaluation form
-- works before the ATA sync endpoint exists. These are PLACEHOLDERS: the
-- values.syncFromSource admin action replaces them with ATA-sourced rows
-- (and deletes source='seed' rows) on first successful sync. Guarded insert
-- by name so re-running the migration does not duplicate. ──
DO $$
DECLARE
  rec record;
BEGIN
  FOR rec IN
    SELECT * FROM (VALUES
      ('Mission-Driven',    'Purpose Over Ego',        'Puts the mission and the team ahead of personal recognition.',        10),
      ('Mission-Driven',    'Owns the Outcome',        'Takes end-to-end ownership; no "not my job".',                        20),
      ('Customer-Obsessed', 'Starts With the Customer','Grounds decisions in real customer needs and outcomes.',              30),
      ('Customer-Obsessed', 'Earns Trust',             'Communicates honestly and follows through on commitments.',           40),
      ('Results-Focused',   'Bias for Action',         'Moves quickly, makes reversible decisions, avoids analysis paralysis.',50),
      ('Results-Focused',   'Raises the Bar',          'Sets a high standard and holds themselves and others to it.',         60)
    ) AS t(pillar, name, description, so)
  LOOP
    INSERT INTO company_values (name, pillar, description, sort_order, source, active)
    SELECT rec.name, rec.pillar, rec.description, rec.so, 'seed', true
    WHERE NOT EXISTS (SELECT 1 FROM company_values WHERE name = rec.name);
  END LOOP;
END $$;

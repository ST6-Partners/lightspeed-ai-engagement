-- 0030 Configurable check-in: question bank + settings + generic answers.
-- Idempotent: CREATE TABLE IF NOT EXISTS / ADD COLUMN IF NOT EXISTS / guarded
-- seed. Safe to re-run (migrate-on-boot).

CREATE TABLE IF NOT EXISTS checkin_questions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  text        text NOT NULL,
  type        varchar(16) NOT NULL DEFAULT 'scale5',
  category    varchar(40) NOT NULL DEFAULT 'general',
  driver      varchar(40),
  is_active   boolean NOT NULL DEFAULT true,
  included    boolean NOT NULL DEFAULT false,
  sort_order  integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS checkin_settings (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cadence    varchar(16) NOT NULL DEFAULT 'weekly',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE checkin_responses ADD COLUMN IF NOT EXISTS answers jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE checkin_responses ALTER COLUMN rotation_index SET DEFAULT 0;

-- one settings row
INSERT INTO checkin_settings (cadence)
SELECT 'weekly' WHERE NOT EXISTS (SELECT 1 FROM checkin_settings);

-- seed the starter question bank (idempotent by text)
INSERT INTO checkin_questions (text, type, category, driver, included, sort_order)
SELECT v.text, v.type, v.category, v.driver, v.included, v.so
FROM (VALUES
  -- Morale anchors (default included)
  ('How well were you able to show up as your Best-Self this week?', 'scale5', 'morale', 'capacity'::varchar, true, 10),
  ('How are you feeling about Lightspeed right now?',                'scale5', 'morale', 'commitment'::varchar, true, 20),
  ('My workload this week was sustainable.',                         'scale5', 'morale', 'capacity'::varchar, true, 30),
  -- Priorities / focus (written; two default included)
  ('What are your top priorities between now and your next check-in?', 'text', 'priorities', NULL::varchar, true, 40),
  ('What do you intend to accomplish between now and your next check-in?', 'text', 'priorities', NULL::varchar, true, 50),
  ('What did you accomplish since your last check-in?',              'text', 'priorities', NULL::varchar, false, 60),
  ('I am clear on my top priorities right now.',                     'scale5', 'priorities', 'purpose'::varchar, false, 70),
  -- Manager support / what I need from my manager (written; one default included)
  ('What do you need from your manager to be successful?',           'text', 'manager_support', NULL::varchar, true, 80),
  ('Is there a blocker or decision you need your manager''s help with?', 'text', 'manager_support', NULL::varchar, false, 90),
  ('What would you want your manager to know about how you are doing?', 'text', 'manager_support', NULL::varchar, false, 100),
  -- Engagement drivers (scale)
  ('I have real opportunities to grow at Lightspeed.',               'scale5', 'growth', 'utilization'::varchar, false, 110),
  ('I am getting the feedback and coaching I need to succeed.',      'scale5', 'growth', 'manager_effectiveness'::varchar, false, 120),
  ('I am confident in our ability to execute as a company.',         'scale5', 'general', 'leadership'::varchar, false, 130),
  -- Values (scale)
  ('This week I took end-to-end ownership of my work (Owns the Outcome).', 'scale5', 'values', 'values'::varchar, false, 140),
  ('My manager communicates honestly and follows through (Earns Trust).',  'scale5', 'values', 'values'::varchar, false, 150),
  -- eNPS
  ('On a scale of 0-10, how likely are you to recommend Lightspeed as a great place to work?', 'enps', 'morale', 'commitment'::varchar, false, 160)
) AS v(text, type, category, driver, included, so)
WHERE NOT EXISTS (SELECT 1 FROM checkin_questions q WHERE q.text = v.text);

-- 0060 Peer Review — lateral peer feedback. Mirrors manager survey; reuses the
-- shared manager_rating_scale legend. Additive + idempotent; seeds a starter
-- question set once (guarded by NOT EXISTS on text).

CREATE TABLE IF NOT EXISTS peer_review_questions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  text        text NOT NULL,
  description text,
  is_active   boolean NOT NULL DEFAULT true,
  sort_order  integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS peer_review_responses (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  respondent_id   uuid REFERENCES users(id) ON DELETE SET NULL,
  respondent_name varchar(200),
  peer_id         uuid REFERENCES users(id) ON DELETE SET NULL,
  peer_name       varchar(200),
  review_date     date NOT NULL,
  ratings         jsonb NOT NULL DEFAULT '{}'::jsonb,
  status          varchar(16) NOT NULL DEFAULT 'complete',
  submitted_at    timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

INSERT INTO peer_review_questions ("text", "sort_order")
SELECT v.text, v.sort_order FROM (VALUES
  ('This peer collaborates effectively across the team', 10),
  ('This peer communicates clearly and keeps others informed', 20),
  ('This peer delivers high-quality work they can be relied on for', 30),
  ('This peer is receptive to feedback and shares it constructively', 40),
  ('This peer supports the team and steps up when needed', 50),
  ('This peer demonstrates the company values day to day', 60)
) AS v(text, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM peer_review_questions q WHERE q."text" = v.text);

-- ============================================================
-- AIE 2026-08-03 — DEMO DATA: sample manager reviews.
--
-- Purpose: let the PM see the redesigned Manager Review history (collapsed
-- cards that expand to the answers) with something in it. Seeds four reviews
-- ABOUT bsf@st6partners.com, written by four of her reports, one anonymous.
--
-- ⚠️ THIS IS DEMO DATA, NOT REAL FEEDBACK. Every row is tagged in the
-- respondent name and the comments so it can never be mistaken for a genuine
-- response, and so it can be removed in one statement:
--
--   DELETE FROM manager_survey_responses WHERE respondent_name LIKE '[DEMO]%';
--
-- Idempotent: re-running replaces the demo rows rather than duplicating them.
-- Answers are keyed to whatever questions are active, so it works whatever the
-- instrument currently contains, and it is a no-op if there are no questions
-- or no matching subject.
-- ============================================================

DELETE FROM "manager_survey_responses" WHERE "respondent_name" LIKE '[DEMO]%';

INSERT INTO "manager_survey_responses"
  ("respondent_id", "respondent_name", "manager_id", "manager_name",
   "review_date", "ratings", "comments", "anonymous", "status", "submitted_at")
SELECT
  NULL,
  d.respondent_name,
  subject.id,
  COALESCE(subject.name, subject.email),
  (now() - (d.days_ago || ' days')::interval)::date,
  -- One rating per active question. Scores vary by reviewer AND by question
  -- (derived from the question's uuid) so the cards show a realistic spread
  -- rather than four identical rows.
  COALESCE((
    SELECT jsonb_object_agg(
      q.id::text,
      GREATEST(1, LEAST(5, d.base + (abs(('x' || substr(md5(q.id::text || d.respondent_name), 1, 8))::bit(32)::int) % 3) - 1))
    )
    FROM "manager_survey_questions" q
    WHERE q."is_active" = true
  ), '{}'::jsonb),
  -- A comment on the first active question only, so the expanded card shows
  -- both a scored row with a note and rows without one.
  COALESCE((
    SELECT jsonb_build_object(q.id::text, d.comment)
    FROM "manager_survey_questions" q
    WHERE q."is_active" = true
    ORDER BY q."sort_order" NULLS LAST, q."id"
    LIMIT 1
  ), '{}'::jsonb),
  d.anonymous,
  'complete',
  now() - (d.days_ago || ' days')::interval
FROM "users" subject
CROSS JOIN (VALUES
  ('[DEMO] Priya Raman',  4, 12, false, 'DEMO DATA — clear about priorities, and protects focus time well.'),
  ('[DEMO] Tom Whitfield', 3, 40, false, 'DEMO DATA — good 1:1s; would like more notice on shifting deadlines.'),
  ('[DEMO] Anonymous',     5, 68, true,  'DEMO DATA — best manager I have had here.'),
  ('[DEMO] Sam Ortega',    3, 95, false, 'DEMO DATA — feedback is fair but tends to arrive late.')
) AS d(respondent_name, base, days_ago, anonymous, comment)
WHERE lower(subject."email") = 'bsf@st6partners.com';

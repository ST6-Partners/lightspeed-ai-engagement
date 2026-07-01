-- Seed the manager rating scale (1..5) and a starter set of manager-survey
-- questions. Idempotent: rating scale keys on the unique `value`; questions
-- guard on NOT EXISTS by text so the seed runs exactly once safely.
INSERT INTO "manager_rating_scale" ("value", "label", "definition") VALUES
  (5, 'Well Above Expectations', 'This leader exhibits this behavior at a very high level nearly all the time. Leaders who perform at this level can be considered a role model for this behavior among other team members.'),
  (4, 'Above Expectations', 'Exhibits this behavior in most situations. While not quite at the role model level, this person usually demonstrates this behavior and sets the example for others.'),
  (3, 'Meets Expectations', 'More often than not this leader demonstrates this behavior. However, there may be situations where this individual can improve their effectiveness and/or consistency in this area.'),
  (2, 'Below Expectations', 'Occasionally exhibits this behavior. But this is not the leader''s day-to-day operating style and more is expected. Alignment on expectations and personal training will help this leader more consistently demonstrate this behavior.'),
  (1, 'Well Below Expectations', 'Most times does not exhibit this behavior or may exhibit opposite behaviors from what is expected. An immediate change is required to improve this individual''s performance in this area.')
ON CONFLICT ("value") DO NOTHING;
--> statement-breakpoint
INSERT INTO "manager_survey_questions" ("text", "sort_order")
SELECT v.text, v.sort_order FROM (VALUES
  ('My manager sets clear expectations', 10),
  ('My manager is in tune with my strengths and weaknesses', 20),
  ('My manager is hands-on and understands the details of my work', 30),
  ('My manager provides regular feedback that is clear and constructive', 40),
  ('My manager holds me accountable', 50),
  ('My manager coaches me on professional growth beyond doing my job better', 60)
) AS v(text, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM "manager_survey_questions" q WHERE q."text" = v.text);

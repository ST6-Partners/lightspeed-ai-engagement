-- 0031 Load the full check-in question library into the bank (idempotent by text).
-- All added as available (included=false, is_active=true) so they can be picked
-- in Configure without changing the current live check-in. Safe to re-run.

INSERT INTO checkin_questions (text, type, category, driver, included, sort_order)
SELECT v.text, v.type, v.category, v.driver, v.included, v.so
FROM (VALUES
  ('What''s something you do that takes a lot of time but doesn''t seem to add much value to the company?', 'text', 'priorities', NULL::varchar, false, 200),
  ('What aspects of your work are the most energizing and inspiring?', 'text', 'morale', NULL::varchar, false, 210),
  ('What''s your confidence level in our ability to execute as a company?', 'text', 'general', NULL::varchar, false, 220),
  ('What do you think we can do better at as a company?', 'text', 'general', NULL::varchar, false, 230),
  ('Are you getting the feedback and coaching you feel you need to be successful and know where you can improve?', 'text', 'growth', NULL::varchar, false, 240),
  ('As you think about our path to success for 2026, what are you worried about?', 'text', 'general', NULL::varchar, false, 250),
  ('What part of your job makes you feel most fulfilled and engaged?', 'text', 'morale', NULL::varchar, false, 260),
  ('How''s our internal communication? What can we do to improve it?', 'text', 'general', NULL::varchar, false, 270),
  ('Do you feel like you have opportunities to grow at Lightspeed?', 'text', 'growth', NULL::varchar, false, 280),
  ('How satisfied are you in your role overall?', 'scale5', 'morale', 'commitment', false, 290),
  ('Finish this sentence: I wish I knew more about ____ at Lightspeed.', 'text', 'general', NULL::varchar, false, 300),
  ('What''s something we can do IN OUR TEAM to improve things?', 'text', 'general', NULL::varchar, false, 310),
  ('What''s something you want to be able to do in 6 months that you can''t do now?', 'text', 'growth', NULL::varchar, false, 320),
  ('Any ideas you have to improve your role or the company?', 'text', 'general', NULL::varchar, false, 330),
  ('Do you feel I, as your manager, give you meaningful feedback that helps you grow and be successful?', 'text', 'manager_support', NULL::varchar, false, 340),
  ('Is there anything you are feeling awkward or unsure about raising?', 'text', 'manager_support', NULL::varchar, false, 350),
  ('What do you appreciate about our company culture? What do you think we could do better at culturally?', 'text', 'values', NULL::varchar, false, 360),
  ('Finish this sentence: My favorite thing about working at Lightspeed is _____', 'text', 'morale', NULL::varchar, false, 370),
  ('What can we do to make you more successful?', 'text', 'manager_support', NULL::varchar, false, 380),
  ('The work I did this week felt meaningful.', 'scale5', 'morale', 'purpose', false, 400),
  ('I had the freedom to do my work the way I saw fit.', 'scale5', 'general', 'autonomy', false, 410),
  ('I felt my work was valued this week.', 'scale5', 'morale', 'rewards_fairness', false, 420),
  ('I felt connected to my team this week.', 'scale5', 'general', 'coworkers', false, 430),
  ('This week I moved quickly and made progress rather than over-analyzing (Bias for Action).', 'scale5', 'values', 'values', false, 440),
  ('Leaders here put the mission and team ahead of personal recognition (Purpose Over Ego).', 'scale5', 'values', 'values', false, 450),
  ('This week I set a high standard and held myself to it (Raises the Bar).', 'scale5', 'values', 'values', false, 460),
  ('My decisions this week were grounded in real customer needs (Starts With the Customer).', 'scale5', 'values', 'values', false, 470)
) AS v(text, type, category, driver, included, so)
WHERE NOT EXISTS (SELECT 1 FROM checkin_questions q WHERE q.text = v.text);

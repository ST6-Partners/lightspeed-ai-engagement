-- 0054_insights_meta.sql
-- Adds Insights (Colour Dynamics) header meta to assessment_summaries so the
-- Insights profile can show the wheel positions, type, preference flow, and
-- completion date (populated from the uploaded profile). Seeds Brooke Friedman's
-- real values from her Insights Discovery PDF. Idempotent.
ALTER TABLE assessment_summaries ADD COLUMN IF NOT EXISTS insights_type text;
ALTER TABLE assessment_summaries ADD COLUMN IF NOT EXISTS insights_conscious_wheel text;
ALTER TABLE assessment_summaries ADD COLUMN IF NOT EXISTS insights_less_wheel text;
ALTER TABLE assessment_summaries ADD COLUMN IF NOT EXISTS insights_preference_flow numeric;
ALTER TABLE assessment_summaries ADD COLUMN IF NOT EXISTS insights_completed_at date;
ALTER TABLE assessment_summaries ADD COLUMN IF NOT EXISTS insights_source varchar(16);

UPDATE assessment_summaries s
   SET insights_type            = 'Reforming Director',
       insights_conscious_wheel = '22: Reforming Director (Classic)',
       insights_less_wheel      = '22: Reforming Director (Classic)',
       insights_preference_flow = -15.1,
       insights_completed_at    = DATE '2024-03-20',
       insights_source          = 'uploaded'
  FROM users u
 WHERE s.user_id = u.id AND u.name ILIKE 'Brooke Friedman';

-- Record each survey period's response scale so 4-point (15Five imports) and
-- 5-point (in-app) data are never silently mixed. Favorability % remains the
-- safe cross-scale comparison metric; raw averages and the 15Five per-department
-- engagement score must only be compared within the same scale/basis. Idempotent.
ALTER TABLE "survey_periods" ADD COLUMN IF NOT EXISTS "scale_max" integer NOT NULL DEFAULT 5;
--> statement-breakpoint
UPDATE "survey_periods" SET "scale_max" = 4 WHERE "id" = '877619f5-00df-5542-b61b-32e0247f84e5';

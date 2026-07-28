-- Set the cadence_settings singleton to the chosen defaults (AI Engagement,
-- 2026-07-27): 9 Box twice a year, Priorities once a year (running doc),
-- Reviews weekly. Applies to the existing seeded row. Idempotent.
UPDATE "cadence_settings"
SET "ninebox_cadence" = 'semiannual',
    "priorities_cadence" = 'annual',
    "reviews_cadence" = 'weekly',
    "updated_at" = now();

// ============================================================
// CADENCE SETTINGS — required completion cadence per activity.
// AI Engagement, 2026-07-27. Singleton row (mirrors checkin_settings).
// Each value is a calendar-aligned cadence: the activity must be completed
// at least once per period; more often is allowed.
//   'monthly' | 'quarterly' | 'semiannual' | 'annual'   (default quarterly)
// ============================================================
import { pgTable, uuid, varchar, boolean, timestamp } from 'drizzle-orm/pg-core';

export const cadenceSettings = pgTable('cadence_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  nineboxCadence: varchar('ninebox_cadence', { length: 16 }).notNull().default('semiannual'),
  prioritiesCadence: varchar('priorities_cadence', { length: 16 }).notNull().default('annual'),
  reviewsCadence: varchar('reviews_cadence', { length: 16 }).notNull().default('weekly'),
  autoAdvance: boolean('auto_advance').notNull().default(true),
  nineboxActiveKey: varchar('ninebox_active_key', { length: 32 }),
  prioritiesActiveKey: varchar('priorities_active_key', { length: 32 }),
  reviewsActiveKey: varchar('reviews_active_key', { length: 32 }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

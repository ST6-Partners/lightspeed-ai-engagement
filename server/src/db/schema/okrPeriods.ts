// ============================================================
// OKR PERIODS — goal-setting cycles (AI Engagement, 2026-07-22)
//
// A "period" here is a GOAL-SETTING cycle, not a fiscal quarter. In practice a
// full calendar year of company goals ("2026 Goals"). One period is flagged
// `is_current`; OKRs are assigned to a period (manual pick, defaults to current).
// The OKR page shows the current period editable and past periods read-only with
// a completion banner + AI period-end scorecard.
//
// Lifecycle: draft -> active -> closed. Closing snapshots the final scorecard
// into `scorecard` (jsonb) so past-period numbers stay frozen even if an old
// node is later edited.
// ============================================================
import {
  pgTable, uuid, varchar, date, timestamp, boolean, jsonb,
} from 'drizzle-orm/pg-core';

export const okrPeriods = pgTable('okr_periods', {
  id: uuid('id').primaryKey().defaultRandom(),
  label: varchar('label', { length: 120 }).notNull(),        // e.g. "2026 Goals"
  startDate: date('start_date'),
  endDate: date('end_date'),
  // 'draft'  — being planned, not yet the live cycle
  // 'active' — the live goal-setting cycle (only the current one is editable)
  // 'closed' — finished; read-only; scorecard frozen
  status: varchar('status', { length: 16 }).notNull().default('active'),
  isCurrent: boolean('is_current').notNull().default(false),
  closedAt: timestamp('closed_at', { withTimezone: true }),
  // Cached period-end scorecard (computed on close or on demand). Shape matches
  // services/okrScorecard.ts -> PeriodScorecard, plus an optional AI narrative.
  scorecard: jsonb('scorecard'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

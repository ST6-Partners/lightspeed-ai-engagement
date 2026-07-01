// ============================================================
// ENGAGEMENT ANALYTICS — survey periods + an aggregate metrics fact table.
// This is the analytics backbone for the Engagement Survey results tabs, built
// to hold BOTH imported historical results (e.g. prior 15Five exports) and the
// current live period. Individual confidential responses live in
// engagement_survey_responses; this layer stores only aggregates.
// ============================================================
import {
  pgTable, uuid, varchar, integer, numeric, date, boolean, timestamp,
} from 'drizzle-orm/pg-core';

// One row per survey administration (a campaign / point in time).
export const surveyPeriods = pgTable('survey_periods', {
  id: uuid('id').primaryKey().defaultRandom(),
  label: varchar('label', { length: 80 }).notNull(),          // e.g. "2026 Q2"
  periodDate: date('period_date').notNull(),                   // sort key for trends
  eligibleCount: integer('eligible_count').notNull().default(0),
  responseCount: integer('response_count').notNull().default(0),
  source: varchar('source', { length: 16 }).notNull().default('import'), // 'import' | 'live'
  isCurrent: boolean('is_current').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Aggregate fact table. One row = a favorability/mean measurement for a given
// period, at a given scope (company or a department), for a given dimension
// (overall, a driver, or a single question). metricKey holds the driver key or
// question id; it is null for `overall` rows.
export const surveyMetrics = pgTable('survey_metrics', {
  id: uuid('id').primaryKey().defaultRandom(),
  periodId: uuid('period_id').notNull().references(() => surveyPeriods.id, { onDelete: 'cascade' }),
  scope: varchar('scope', { length: 16 }).notNull(),          // 'company' | 'department'
  department: varchar('department', { length: 120 }),          // null for company scope
  dimension: varchar('dimension', { length: 16 }).notNull(),   // 'overall' | 'driver' | 'question'
  metricKey: varchar('metric_key', { length: 64 }),            // driver key | question id | null
  mean: numeric('mean', { precision: 4, scale: 2 }),           // 1..5
  favorablePct: numeric('favorable_pct', { precision: 5, scale: 2 }),
  unfavorablePct: numeric('unfavorable_pct', { precision: 5, scale: 2 }),
  responseCount: integer('response_count').notNull().default(0),
  eligibleCount: integer('eligible_count'),                    // for department response-rate
});

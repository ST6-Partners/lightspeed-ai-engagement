// ============================================================
// ENGAGEMENT IMPORT ROWS — the raw uploaded 15Five export rows (statement level),
// kept so the "Raw Responses" tab can show the source data behind an imported
// period. For live in-app surveys the Raw Responses tab reads individual rows
// from engagement_survey_responses instead; this table is import-only.
// ============================================================
import { pgTable, uuid, varchar, text, integer, numeric, timestamp } from 'drizzle-orm/pg-core';
import { surveyPeriods } from './engagementAnalytics.js';

export const engagementImportRows = pgTable('engagement_import_rows', {
  id: uuid('id').primaryKey().defaultRandom(),
  periodId: uuid('period_id').notNull().references(() => surveyPeriods.id, { onDelete: 'cascade' }),
  scope: varchar('scope', { length: 16 }).notNull(),        // 'company' | 'department'
  groupName: varchar('group_name', { length: 120 }),         // department/team name (null for company)
  dimension: varchar('dimension', { length: 80 }),           // 15Five driver / competency / dimension
  statement: text('statement').notNull(),
  avgResponse: numeric('avg_response', { precision: 4, scale: 2 }),
  unfavorable: integer('unfavorable'),
  neutral: integer('neutral'),
  favorable: integer('favorable'),
  noResponse: integer('no_response'),
  totalResponses: integer('total_responses'),
  totalPossible: integer('total_possible'),
  responseRate: numeric('response_rate', { precision: 5, scale: 2 }),
});

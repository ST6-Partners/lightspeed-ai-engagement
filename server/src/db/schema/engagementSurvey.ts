// ============================================================
// ENGAGEMENT SURVEY — periodic engagement survey (15Five "Engage" parity).
// One row per submission. `answers` holds the 66 Likert responses keyed by
// question id (1..5); the eNPS 0..10 score + open-text reason are promoted to
// their own columns for the recommend-rate read. Responses are confidential —
// `respondent_id` is nullable and set null on user delete.
// ============================================================
import {
  pgTable, uuid, varchar, integer, text, jsonb, timestamp,
} from 'drizzle-orm/pg-core';
import { users } from './core.js';

export const engagementSurveyResponses = pgTable('engagement_survey_responses', {
  id: uuid('id').primaryKey().defaultRandom(),
  respondentId: uuid('respondent_id').references(() => users.id, { onDelete: 'set null' }),
  respondentName: varchar('respondent_name', { length: 200 }),   // selected from the employee directory
  jobTitle: varchar('job_title', { length: 200 }),               // selected job title (denormalized)
  department: varchar('department', { length: 160 }),            // selected department (denormalized) — used to organize results
  answers: jsonb('answers').$type<Record<string, number>>().notNull().default({}),
  textAnswers: jsonb('text_answers').$type<Record<string, string>>().notNull().default({}),  // free-text question answers, keyed by question id
  enpsScore: integer('enps_score'),                 // 0..10
  enpsReason: text('enps_reason'),                  // confidential open text
  status: varchar('status', { length: 16 }).notNull().default('complete'),
    // 'draft' | 'complete'
  submittedAt: timestamp('submitted_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

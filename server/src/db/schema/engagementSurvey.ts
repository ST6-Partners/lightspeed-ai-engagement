// ============================================================
// ENGAGEMENT SURVEY — periodic engagement survey (15Five "Engage" parity).
// One row per submission. `answers` holds the 66 Likert responses keyed by
// question id (1..5); the eNPS 0..10 score + open-text reason are promoted to
// their own columns for the recommend-rate read. Responses are confidential —
// `respondent_id` is nullable and set null on user delete.
// ============================================================
import {
  pgTable, uuid, varchar, integer, text, jsonb, timestamp, primaryKey,
} from 'drizzle-orm/pg-core';
import { users } from './core.js';

export const engagementSurveyResponses = pgTable('engagement_survey_responses', {
  id: uuid('id').primaryKey().defaultRandom(),
  respondentId: uuid('respondent_id').references(() => users.id, { onDelete: 'set null' }),
  respondentName: varchar('respondent_name', { length: 200 }),   // selected from the employee directory
  jobTitle: varchar('job_title', { length: 200 }),               // selected job title (denormalized)
  department: varchar('department', { length: 160 }),            // snapshot of respondent's department (from profile) — organizes results
  team: varchar('team', { length: 160 }),                        // snapshot of team (from profile)
  location: varchar('location', { length: 160 }),               // snapshot of location (from profile)
  businessUnit: varchar('business_unit', { length: 160 }),      // snapshot of business unit (from profile)
  managerName: varchar('manager_name', { length: 200 }),        // snapshot of primary manager's name (for manager roll-up)
  eltLeader: varchar('elt_leader', { length: 200 }),            // snapshot of ELT leader this person rolls up to
  startYear: integer('start_year'),                              // snapshot of start year (for tenure banding)
  periodId: uuid('period_id'),                                   // survey period this response belongs to
  answers: jsonb('answers').$type<Record<string, number>>().notNull().default({}),
  textAnswers: jsonb('text_answers').$type<Record<string, string>>().notNull().default({}),  // free-text question answers, keyed by question id
  enpsScore: integer('enps_score'),                 // 0..10
  enpsReason: text('enps_reason'),                  // confidential open text
  versionId: uuid('version_id'),  // which survey version was taken (engagement_survey_versions.id)
  status: varchar('status', { length: 16 }).notNull().default('complete'),
    // 'draft' | 'complete'
  submittedAt: timestamp('submitted_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});


// ============================================================
// SURVEY COMPLETIONS — once-per-period ledger (AIE 2026-07-23).
// Records WHO has completed a given period so the app can enforce "one response
// per person per period" and show a per-user done state. Kept SEPARATE from the
// confidential answers in engagement_survey_responses — this table never stores
// any answer content, only (period, user, when). This is how completion is
// tracked without attaching identity to the answers themselves.
// ============================================================
export const engagementSurveyCompletions = pgTable('engagement_survey_completions', {
  periodId: uuid('period_id').notNull(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  completedAt: timestamp('completed_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({ pk: primaryKey({ columns: [t.periodId, t.userId] }) }));

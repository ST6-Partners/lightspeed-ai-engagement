// ============================================================
// ENGAGEMENT SURVEY VERSIONS — named variants of the survey (e.g. "V1 — Marketing",
// "V2 — Sales"). Each version selects a subset of the question bank via the
// version_questions join. One version is the default (used when none is chosen).
// Responses record which version was taken (see engagement_survey_responses.version_id).
// ============================================================
import { pgTable, uuid, varchar, boolean, integer, timestamp, primaryKey } from 'drizzle-orm/pg-core';
import { engagementSurveyQuestions } from './engagementSurveyQuestions.js';

export const engagementSurveyVersions = pgTable('engagement_survey_versions', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 120 }).notNull(),
  isDefault: boolean('is_default').notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Which questions are on a given version (ordered).
export const engagementSurveyVersionQuestions = pgTable('engagement_survey_version_questions', {
  versionId: uuid('version_id').notNull().references(() => engagementSurveyVersions.id, { onDelete: 'cascade' }),
  questionId: varchar('question_id', { length: 64 }).notNull().references(() => engagementSurveyQuestions.id, { onDelete: 'cascade' }),
  sortOrder: integer('sort_order').notNull().default(0),
}, (t) => ({ pk: primaryKey({ columns: [t.versionId, t.questionId] }) }));

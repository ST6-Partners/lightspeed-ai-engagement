// ============================================================
// MANAGER SURVEY — employee feedback on their manager (upward review)
// AI Engagement (4-Lightspeed)
//
// Three tables:
//  • manager_survey_questions — the managed list of statements employees rate
//    ("My manager sets clear expectations"). Admin CRUD via Core Data →
//    Survey Questions. Retire with isActive=false to preserve history.
//  • manager_rating_scale — the 1..5 rating legend (value, name, definition),
//    editable via Core Data → Rating Scale. Shown as the legend on the form.
//  • manager_survey_responses — one row per submitted review. `ratings` holds
//    the per-question 1..5 answers keyed by question id. Attributes the
//    respondent (the employee giving feedback) and the subject manager being
//    rated, plus the review date. Names are denormalized for durable display.
// ============================================================

import {
  pgTable, uuid, varchar, text, integer, boolean, jsonb, timestamp, date, unique,
} from 'drizzle-orm/pg-core';
import { users } from './core.js';

// ── Questions lookup ──────────────────────────────────────
export const managerSurveyQuestions = pgTable('manager_survey_questions', {
  id: uuid('id').primaryKey().defaultRandom(),
  text: text('text').notNull(),                            // the statement being rated
  description: text('description'),                        // optional helper/context
  isActive: boolean('is_active').notNull().default(true),  // retire without deleting
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── Rating scale (1..5 legend) ────────────────────────────
export const managerRatingScale = pgTable('manager_rating_scale', {
  id: uuid('id').primaryKey().defaultRandom(),
  value: integer('value').notNull(),                       // 1..5
  label: varchar('label', { length: 120 }).notNull(),      // "Well Above Expectations"
  definition: text('definition'),                          // long-form behavior definition
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniqValue: unique('uniq_manager_rating_value').on(t.value),
}));

// ── Responses ─────────────────────────────────────────────
export const managerSurveyResponses = pgTable('manager_survey_responses', {
  id: uuid('id').primaryKey().defaultRandom(),
  // The employee giving the rating (respondent). Set null if the user is removed.
  respondentId: uuid('respondent_id').references(() => users.id, { onDelete: 'set null' }),
  respondentName: varchar('respondent_name', { length: 200 }),
  // The manager being rated (subject of the review).
  managerId: uuid('manager_id').references(() => users.id, { onDelete: 'set null' }),
  managerName: varchar('manager_name', { length: 200 }),
  reviewDate: date('review_date').notNull(),
  // { [questionId]: 1..5 }
  ratings: jsonb('ratings').$type<Record<string, number>>().notNull().default({}),
  status: varchar('status', { length: 16 }).notNull().default('complete'), // 'draft' | 'complete'
  submittedAt: timestamp('submitted_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

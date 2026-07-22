// ============================================================
// ENGAGEMENT SURVEY QUESTION BANK — the editable set of survey questions.
// Seeded with the 66 core 15Five statements (active) + 27 additional statements
// from the full Engage instrument (inactive). Admins add/remove/toggle questions
// in Core Data -> Survey Questions. The Take Survey form and the analytics driver
// rollup both read from this table (core IDs preserved for historical continuity).
// ============================================================
import { pgTable, varchar, text, boolean, integer, timestamp } from 'drizzle-orm/pg-core';

export const engagementSurveyQuestions = pgTable('engagement_survey_questions', {
  id: varchar('id', { length: 64 }).primaryKey(),           // stable key (core: work_1…; custom: custom_…)
  text: text('text').notNull(),
  driver: varchar('driver', { length: 40 }),                // DriverKey the answer rolls up into (null = ungrouped)
  section: varchar('section', { length: 40 }).notNull(),    // survey grouping key
  sectionTitle: varchar('section_title', { length: 120 }).notNull(),
  sectionIntro: text('section_intro').notNull().default(''),
  type: varchar('type', { length: 16 }).notNull().default('likert5'), // 'likert5' | 'text'
  isActive: boolean('is_active').notNull().default(true),   // on the live survey
  isCore: boolean('is_core').notNull().default(false),      // part of the original 66 (cannot be deleted, only deactivated)
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

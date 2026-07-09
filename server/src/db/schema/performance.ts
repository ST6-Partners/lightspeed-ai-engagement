// ============================================================
// PERFORMANCE CRITERIA + EMPLOYEE PERFORMANCE EVALUATIONS
// AI Engagement (4-Lightspeed) — Reviews section (2026-07-09)
//
// Companion axis to Company Values. Where Values measure HOW someone works
// (culture/behavior, mirrored from ATA), Performance measures WHAT they
// deliver and how well (demonstrated capability + results). Fully OWNED BY
// AIE — no external sync. A manager scores an EMPLOYEE 1-5 against each active
// performance criterion for a review period, mirroring the value-evaluation
// construct (value_evaluations / value_evaluation_scores).
// ============================================================

import {
  pgTable, uuid, varchar, text, integer, boolean, timestamp, unique, index,
} from 'drizzle-orm/pg-core';
import { users } from './core.js';

// -- performance_criteria -- AIE-owned CRUD (Core Data > Performance Criteria) --
export const performanceCriteria = pgTable('performance_criteria', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 200 }).notNull(),
  definition: text('definition'),
  sortOrder: integer('sort_order').notNull().default(0),
  active: boolean('active').notNull().default(true),
  source: varchar('source', { length: 20 }).notNull().default('local'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// -- performance_evaluations -- one reviewer's dated scoring pass on an employee --
export const performanceEvaluations = pgTable('performance_evaluations', {
  id: uuid('id').primaryKey().defaultRandom(),
  employeeId: uuid('employee_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  reviewerId: uuid('reviewer_id').references(() => users.id, { onDelete: 'set null' }),
  periodLabel: text('period_label'),
  status: varchar('status', { length: 16 }).notNull().default('draft'),
  overallNotes: text('overall_notes'),
  evaluatedAt: timestamp('evaluated_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  byEmployee: index('idx_perf_eval_employee').on(t.employeeId),
}));

// -- performance_evaluation_scores -- one 1-5 criterion score within an evaluation --
export const performanceEvaluationScores = pgTable('performance_evaluation_scores', {
  id: uuid('id').primaryKey().defaultRandom(),
  evaluationId: uuid('evaluation_id').references(() => performanceEvaluations.id, { onDelete: 'cascade' }).notNull(),
  criterionId: uuid('criterion_id').references(() => performanceCriteria.id, { onDelete: 'cascade' }).notNull(),
  score: integer('score').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniqEvalCriterion: unique('uniq_perf_evaluation_criterion').on(t.evaluationId, t.criterionId),
}));

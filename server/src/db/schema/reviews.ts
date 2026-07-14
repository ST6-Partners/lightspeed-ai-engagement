// ============================================================
// SHARED EMPLOYEE REVIEWS (values + performance instruments)
// AI Engagement (4-Lightspeed) — consolidation (PM decision, Brooke, 2026-07-09)
//
// One `reviews` header + one `review_scores` child, discriminated by `type`
// ('values' | 'performance'), replaces the former per-instrument pairs
// (value_evaluations/value_evaluation_scores, performance_evaluations/
// performance_evaluation_scores). The two LOOKUP tables stay separate —
// company_values is an ATA-synced cache, performance_criteria is AIE-owned —
// so review_scores.item_id is a POLYMORPHIC reference (no single FK), resolved
// by the parent review's `type` against the matching lookup. Adding a third
// instrument later costs zero new tables.
// ============================================================

import {
  pgTable, uuid, varchar, text, integer, timestamp, unique, index,
} from 'drizzle-orm/pg-core';
import { users } from './core.js';

// -- reviews -- one reviewer's dated scoring pass on an employee, per instrument --
export const reviews = pgTable('reviews', {
  id: uuid('id').primaryKey().defaultRandom(),
  type: varchar('type', { length: 20 }).notNull(), // 'values' | 'performance'
  employeeId: uuid('employee_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  reviewerId: uuid('reviewer_id').references(() => users.id, { onDelete: 'set null' }),
  periodLabel: text('period_label'),
  // The review-session container this pass belongs to (FK enforced in migration 0040).
  sessionId: uuid('session_id'),
  status: varchar('status', { length: 16 }).notNull().default('draft'),
  overallNotes: text('overall_notes'),
  evaluatedAt: timestamp('evaluated_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  byEmployeeType: index('idx_reviews_employee_type').on(t.employeeId, t.type),
}));

// -- review_scores -- one 1-5 score within a review --
// item_id -> company_values.id (type='values') OR performance_criteria.id
// (type='performance'). Polymorphic: no FK; resolved by the parent review type.
export const reviewScores = pgTable('review_scores', {
  id: uuid('id').primaryKey().defaultRandom(),
  reviewId: uuid('review_id').references(() => reviews.id, { onDelete: 'cascade' }).notNull(),
  itemId: uuid('item_id').notNull(),
  score: integer('score').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniqReviewItem: unique('uniq_review_item').on(t.reviewId, t.itemId),
  byReview: index('idx_review_scores_review').on(t.reviewId),
}));

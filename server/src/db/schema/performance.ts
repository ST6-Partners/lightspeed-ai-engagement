// ============================================================
// PERFORMANCE CRITERIA (lookup) — AI Engagement (4-Lightspeed)
//
// The companion axis to Company Values. Fully AIE-owned CRUD (no external
// sync): a name + a definition. Employee PERFORMANCE reviews live in the
// shared `reviews` / `review_scores` tables (schema/reviews.ts), type=
// 'performance' — review_scores.item_id references performance_criteria.id.
// (Consolidation 2026-07-09.)
// ============================================================

import {
  pgTable, uuid, varchar, text, integer, boolean, timestamp,
} from 'drizzle-orm/pg-core';

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

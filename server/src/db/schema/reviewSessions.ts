// ============================================================
// REVIEW SESSIONS — the review container (AI Engagement, 2026-07-14)
//
// A review session is ONE review event for one employee for one period. It is
// the container Brooke's model calls a "review cycle" — renamed to
// `review_sessions` here because `review_cycles` is already taken by the Org
// Screen's comp-planning cycles (schema/orgScreen.ts). It owns the two rearview
// scoring passes (the `reviews` rows, type='values' | 'performance', linked via
// reviews.session_id) and the go-forward coaching plan (coaching_plans.session_id).
//
// Status: open → rearview_complete → plan_drafted → closed.
// FKs are enforced in the migration SQL (0040); columns here are plain so the
// schema stays free of import cycles.
// ============================================================

import { pgTable, uuid, text, varchar, timestamp, index } from 'drizzle-orm/pg-core';
import { users } from './core.js';

export const reviewSessions = pgTable('review_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  employeeId: uuid('employee_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  periodLabel: text('period_label'),
  reviewerId: uuid('reviewer_id').references(() => users.id, { onDelete: 'set null' }),
  status: varchar('status', { length: 24 }).notNull().default('open'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  byEmployee: index('idx_review_sessions_employee').on(t.employeeId),
}));

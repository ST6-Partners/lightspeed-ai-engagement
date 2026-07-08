// ============================================================
// COMPANY VALUES + EMPLOYEE VALUE EVALUATIONS
// AI Engagement (4-Lightspeed)
//
// ARCHITECTURE (Option C — sync/cache, 2026-07-08):
//   `company_values` is a LOCAL READ-ONLY MIRROR of the values framework
//   owned by the AI Talent Assessment app (ATA). ATA is the single source
//   of truth for value *definitions* + scoring *rubric*; AIE caches them
//   here so (a) they can't drift out of a second hand-maintained copy and
//   (b) evaluations never block on a live cross-app call. Refreshed via the
//   `values.syncFromSource` admin action (see services/valuesSync.ts).
//   Rows carry `source` ('seed' local placeholder | 'ATA' synced) +
//   `externalId` (ATA's id) + `syncedAt`. DO NOT expose CRUD on these in
//   the AIE UI — edits belong in ATA.
//
//   `value_evaluations` + `value_evaluation_scores` are OWNED BY AIE. They
//   score EMPLOYEES (the `users` table), not candidates — a manager/reviewer
//   scores a person 1-5 against each active company value on a given date.
//   Schema construct mirrors ATA's value_reviews / candidate_value_scores,
//   retargeted to employees.
// ============================================================

import {
  pgTable, uuid, varchar, text, integer, boolean, timestamp, jsonb, unique, index,
} from 'drizzle-orm/pg-core';
import { users } from './core.js';

// -- company_values -- read-only cache mirrored from ATA --
export const companyValues = pgTable('company_values', {
  id: uuid('id').primaryKey().defaultRandom(),
  // ATA's value id. Null for local 'seed' placeholders; non-null for synced rows.
  externalId: text('external_id'),
  name: varchar('name', { length: 200 }).notNull(),
  pillar: varchar('pillar', { length: 80 }).notNull(),
  category: varchar('category', { length: 100 }),
  description: text('description'),
  // Forward-compatible slot for whatever scoring rubric ATA exposes now or later.
  rubric: jsonb('rubric').default({}),
  // Any extra ATA-side metadata (e.g. linked EPP dimensions) -- opaque to AIE.
  meta: jsonb('meta').default({}),
  sortOrder: integer('sort_order').notNull().default(0),
  active: boolean('active').notNull().default(true),
  source: varchar('source', { length: 20 }).notNull().default('seed'),
  syncedAt: timestamp('synced_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniqSourceExternal: unique('uniq_company_value_source_external').on(t.source, t.externalId),
}));

// -- value_evaluations -- one reviewer's dated scoring pass on an employee --
export const valueEvaluations = pgTable('value_evaluations', {
  id: uuid('id').primaryKey().defaultRandom(),
  employeeId: uuid('employee_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  reviewerId: uuid('reviewer_id').references(() => users.id, { onDelete: 'set null' }),
  periodLabel: text('period_label'),
  status: varchar('status', { length: 16 }).notNull().default('draft'),
  overallNotes: text('overall_notes'),
  evaluatedAt: timestamp('evaluated_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  byEmployee: index('idx_value_eval_employee').on(t.employeeId),
}));

// -- value_evaluation_scores -- one value score within an evaluation --
export const valueEvaluationScores = pgTable('value_evaluation_scores', {
  id: uuid('id').primaryKey().defaultRandom(),
  evaluationId: uuid('evaluation_id')
    .references(() => valueEvaluations.id, { onDelete: 'cascade' })
    .notNull(),
  valueId: uuid('value_id')
    .references(() => companyValues.id, { onDelete: 'cascade' })
    .notNull(),
  score: integer('score').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniqEvalValue: unique('uniq_evaluation_value').on(t.evaluationId, t.valueId),
}));

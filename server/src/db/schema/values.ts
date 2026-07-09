// ============================================================
// COMPANY VALUES (lookup) + REVIEW PERIODS
// AI Engagement (4-Lightspeed)
//
// `company_values` is a LOCAL READ-ONLY MIRROR of the values framework owned
// by the AI Talent Assessment app (ATA). ATA is the source of truth for value
// definitions + rubric; AIE caches them here. Rows carry `source`
// ('seed' | 'ATA' | 'local') + `externalId` + `syncedAt`. Refreshed via the
// `values.syncFromSource` admin action (services/valuesSync.ts).
//
// Employee VALUES reviews live in the shared `reviews` / `review_scores` tables
// (schema/reviews.ts), type='values' — review_scores.item_id references
// company_values.id. (Consolidation 2026-07-09.)
//
// `review_periods` is a managed lookup governing the period dropdown shared by
// both the values and performance review instruments.
// ============================================================

import {
  pgTable, uuid, varchar, text, integer, boolean, timestamp, jsonb, unique,
} from 'drizzle-orm/pg-core';

// -- company_values -- read-only cache mirrored from ATA --
export const companyValues = pgTable('company_values', {
  id: uuid('id').primaryKey().defaultRandom(),
  externalId: text('external_id'),
  name: varchar('name', { length: 200 }).notNull(),
  pillar: varchar('pillar', { length: 80 }).notNull(),
  category: varchar('category', { length: 100 }),
  description: text('description'),
  rubric: jsonb('rubric').default({}),
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

// -- review_periods -- managed lookup of evaluation periods (e.g. '2026 H1') --
export const reviewPeriods = pgTable('review_periods', {
  id: uuid('id').primaryKey().defaultRandom(),
  label: varchar('label', { length: 120 }).notNull(),
  active: boolean('active').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniqLabel: unique('uniq_review_period_label').on(t.label),
}));

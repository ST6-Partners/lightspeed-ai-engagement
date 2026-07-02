// ============================================================
// ORG SCREEN — new storage for the Organization screen (Stage 1)
// AI Engagement (4-Lightspeed) — spec: AIE Org Screen Spec v1 §7.1/§7.5/§10.1
//
// Built on the existing `users` table (the org source of truth via
// users.managerId). No separate employees table — see 07-02-26-bf session.
// ============================================================

import {
  pgTable, uuid, varchar, text, integer, smallint, date, timestamp, jsonb,
  index, primaryKey, check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './core.js';
import { okrNodes } from './okr.js';

// Priorities — a per-person "current priority" pointer: an OKR node
// (objective / key_result / task) OR a free-text KTBR. `weekStart` is
// STORED but not surfaced in v1 (NULL = current) so a weekly view is a
// later query, not a migration (Signal parity, spec §7.1).
export const priorities = pgTable('priorities', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  weekStart: date('week_start'),                          // NULL = current
  itemType: varchar('item_type', { length: 16 }).notNull(), // 'objective'|'key_result'|'task'|'ktbr'
  okrNodeId: uuid('okr_node_id').references(() => okrNodes.id, { onDelete: 'set null' }),
  ktbrLabel: text('ktbr_label'),                          // set when itemType='ktbr'
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  byEmpWeek: index('idx_priorities_emp_week').on(t.userId, t.weekStart),
}));

// 9 Box ratings — single value 1..9 encodes both axes (numpad convention,
// spec §10.1). Latest-by-date wins for display; history retained.
export const nineBoxRatings = pgTable('nine_box_ratings', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  box: smallint('box').notNull(),                         // 1..9 (see check)
  ratedAt: date('rated_at').notNull().defaultNow(),
  ratedBy: uuid('rated_by').references(() => users.id, { onDelete: 'set null' }),
  note: text('note'),
}, (t) => ({
  byEmp: index('idx_ninebox_emp').on(t.userId, t.ratedAt),
  boxRange: check('nine_box_box_range', sql`${t.box} between 1 and 9`),
}));

// Engagement snapshots — headline thriving / flight-risk signal per person
// (spec §7.5). Stub content in v1; source wired later.
export type EngagementDriver = { label: string; value: number };
export const engagementSnapshots = pgTable('engagement_snapshots', {
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  asOf: date('as_of').notNull(),
  score: integer('score'),                                // 0..100 headline
  drivers: jsonb('drivers').$type<EngagementDriver[]>().notNull().default([]),
}, (t) => ({
  pk: primaryKey({ columns: [t.userId, t.asOf] }),
}));

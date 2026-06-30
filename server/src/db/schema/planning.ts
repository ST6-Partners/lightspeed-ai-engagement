// ============================================================
// PLANNING / OKR HIERARCHY — ported & reduced from Signal (RCDO) hierarchy_items
// AI Engagement (4-Lightspeed)
//
// Design decisions baked in (06-24-26 session with Brooke Friedman):
//   - One self-referencing tree (`plan_items`). "Objective" / "Key Result"
//     are POSITIONS in the outline (the `type` axis), not separate tables.
//   - OKR vocabulary: theme → objective → key_result → task.
//   - Categories kept minimal: 'strategic' (the OKR tree) and 'standard'
//     (Standard Objectives / operational metrics). Signal's "OI" bucket is
//     DROPPED. KTBR not modeled in v1.
//   - NO effort/hours, NO capacity, NO scoring, NO Friday lock — those are
//     Signal's heavy machinery and are deliberately left behind.
//   - Health stoplights are KEPT (light + useful for the manager view).
//   - The weekly check-in ("commit") is FREEFORM-FIRST: a priority is free
//     text and linking it to a plan item is OPTIONAL (the opposite of
//     Signal, where a commit is a NOT-NULL FK into the hierarchy).
// ============================================================

import {
  pgTable, uuid, varchar, text, timestamp, integer, date, unique,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { users } from './core.js';

// ── The plan / OKR tree ─────────────────────────────────────
// `type`     = level in the outline (theme | objective | key_result | task)
// `category` = strategic bucket (strategic | standard)
// Both are set at creation and treated as immutable by the API.
// Only non-task items may have children (tasks are leaves).
export const planItems = pgTable('plan_items', {
  id: uuid('id').primaryKey().defaultRandom(),

  type: varchar('type', { length: 20 }).notNull(),
    // 'theme' | 'objective' | 'key_result' | 'task'
  category: varchar('category', { length: 20 }).notNull().default('strategic'),
    // 'strategic' | 'standard'

  // Self-reference → the tree. Cascade so archiving/removing a parent reaches children.
  parentId: uuid('parent_id').references((): AnyPgColumn => planItems.id, { onDelete: 'cascade' }),
  sortOrder: integer('sort_order').notNull().default(0),

  title: varchar('title', { length: 500 }).notNull(),
  description: text('description'),

  // One accountable owner (RCDO pattern: owner_id → users).
  ownerId: uuid('owner_id').references(() => users.id, { onDelete: 'set null' }),

  startDate: date('start_date'),
  dueDate: date('due_date'),

  status: varchar('status', { length: 20 }).notNull().default('not_started'),
    // 'not_started' | 'in_progress' | 'on_hold' | 'complete'

  // ── Measurable / OKR fields — populated for objective & key_result,
  //    left null for theme & task (enforced in the router on create/update).
  spirit: text('spirit'),       // the "why it matters"
  problem: text('problem'),     // problem this addresses
  measure: text('measure'),     // how success is measured (the Key Result metric)
  target: varchar('target', { length: 255 }), // target value
  forecast: text('forecast'),   // narrative forecast
  stoplightCurrent: varchar('stoplight_current', { length: 12 }),
    // 'green' | 'yellow' | 'red'
  stoplightForecast: varchar('stoplight_forecast', { length: 12 }),
    // 'green' | 'yellow' | 'red'

  // Soft delete (RCDO pattern: archived_at + archived_by). Cascades to descendants.
  archivedAt: timestamp('archived_at', { withTimezone: true }),
  archivedBy: uuid('archived_by').references(() => users.id),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── "My top 3 priorities right now" (optional) ──────────────
// Max 3 per user enforced in the router (RCDO pattern: user_priorities).
export const userPriorities = pgTable('user_priorities', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  planItemId: uuid('plan_item_id').notNull().references(() => planItems.id, { onDelete: 'cascade' }),
  priorityOrder: integer('priority_order').notNull().default(1), // 1..3
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniqUserItem: unique('uniq_user_priority').on(t.userId, t.planItemId),
}));

// ── Weekly check-in container (one per user per ISO week) ────
// Soft & optional: no scoring, no auto-lock, no capacity/hours.
export const weeklyPlans = pgTable('weekly_plans', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  weekStart: date('week_start').notNull(), // Monday of the ISO week
  status: varchar('status', { length: 20 }).notNull().default('draft'),
    // 'draft' | 'submitted'

  // 15Five-style check-in fields
  wins: text('wins'),
  challenges: text('challenges'),
  mood: integer('mood'), // 1..5 self-reported energy/mood

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniqUserWeek: unique('uniq_user_week').on(t.userId, t.weekStart),
}));

// ── A weekly priority ("commit") ────────────────────────────
// FREEFORM-FIRST: `title` is free text; `planItemId` is an OPTIONAL link to
// a Key Result / Objective in the plan (NULL = unlinked freeform priority).
export const commits = pgTable('commits', {
  id: uuid('id').primaryKey().defaultRandom(),
  weeklyPlanId: uuid('weekly_plan_id').notNull().references(() => weeklyPlans.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 500 }).notNull(),
  planItemId: uuid('plan_item_id').references(() => planItems.id, { onDelete: 'set null' }),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

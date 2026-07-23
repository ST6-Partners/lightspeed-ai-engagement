// ============================================================
// 1:1 HUB — pair-scoped working area that lives under the Reviews page.
// AI Engagement (4-Lightspeed) — Reviews 1:1 rework, 2026-07-21 (bf).
//
// Everything here is scoped to a manager<->employee PAIR, anchored on the
// employee (employeeId). The employee's manager is resolved via
// users.managerId at access time (see oneOnOne router assertPairAccess).
//
// IMPORTANT: unlike the Weekly Plan `priorities` table, these rows are NOT
// week-scoped. There is no weekStart column — talking points and action items
// persist until they are completed/archived by hand (PM requirement, 07-21).
// ============================================================

import {
  pgTable, uuid, varchar, text, integer, date, timestamp, boolean, index, unique,
} from 'drizzle-orm/pg-core';
import { users } from './core.js';

// Talking points — a shared, persistent to-do list for the pair's 1:1s.
// Either side adds; either side checks off; archive files it into "Past".
export const talkingPoints = pgTable('talking_points', {
  id: uuid('id').primaryKey().defaultRandom(),
  employeeId: uuid('employee_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  text: text('text').notNull(),
  done: boolean('done').notNull().default(false),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  archived: boolean('archived').notNull().default(false),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  byEmp: index('idx_talking_points_emp').on(t.employeeId),
}));

// Action items — same shape as talking points, plus a due date and a flag the
// employee sets to surface the item in their Weekly Plan "Action Items" box.
export const actionItems = pgTable('action_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  employeeId: uuid('employee_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  text: text('text').notNull(),
  // Priority tier for the Manager Brief actions surface (additive; the 1:1
  // action-items UI ignores it and treats everything as unprioritised).
  priority: varchar('priority', { length: 8 }).notNull().default('medium'),
  dueDate: date('due_date'),
  inWeeklyPlan: boolean('in_weekly_plan').notNull().default(false),
  done: boolean('done').notNull().default(false),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  archived: boolean('archived').notNull().default(false),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  byEmp: index('idx_action_items_emp').on(t.employeeId),
}));

// Notes — one row per (employee, author, scope). scope='shared' rows are
// visible to both sides; scope='private' rows are returned ONLY to their
// author (enforced in the router, never sent to the other party).
export const oneOnOneNotes = pgTable('one_on_one_notes', {
  id: uuid('id').primaryKey().defaultRandom(),
  employeeId: uuid('employee_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  authorId: uuid('author_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  scope: varchar('scope', { length: 8 }).notNull(), // 'shared' | 'private'
  body: text('body').notNull().default(''),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniq: unique('uniq_1on1_note').on(t.employeeId, t.authorId, t.scope),
  byEmp: index('idx_1on1_notes_emp').on(t.employeeId),
}));

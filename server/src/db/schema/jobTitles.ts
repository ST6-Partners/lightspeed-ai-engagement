// ============================================================
// JOB TITLES — shared HR lookup of titles / levels
// AI Engagement (4-Lightspeed)
//
// A controlled vocabulary of job titles ("Software Engineer II",
// "Account Executive", …) used by the PIP "Role / Level" field and the
// Exit Survey role field — replacing free-form text with a managed list.
//
// IMPORTANT: this is DISTINCT from `users.role`, which is the auth tier
// ('user' | 'manager' | 'admin' | 'sysadmin'). This table is HR job
// titles/levels and has nothing to do with permissions.
//
// Managed by admins via Admin → Job Titles (CRUD). Retire a title with
// `isActive = false` rather than deleting, so historical PIPs/exits that
// reference it keep their label.
// ============================================================

import { pgTable, uuid, varchar, integer, boolean, timestamp, unique } from 'drizzle-orm/pg-core';
import { departments } from './departments.js';

export const jobTitles = pgTable('job_titles', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 200 }).notNull(),     // "Software Engineer II"
  level: varchar('level', { length: 60 }),                 // optional, e.g. "L3" / "Senior"
  // Department — managed FK into the departments lookup.
  departmentId: uuid('department_id').references(() => departments.id, { onDelete: 'set null' }),
  // DEPRECATED free-text department — superseded by departmentId. Retained so the
  // migration is purely additive (no destructive drop); not read/written by the app.
  department: varchar('department', { length: 120 }),
  isActive: boolean('is_active').notNull().default(true),  // retire without deleting
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniqTitle: unique('uniq_job_title').on(t.title),
}));

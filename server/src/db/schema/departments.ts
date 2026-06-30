// ============================================================
// DEPARTMENTS — shared HR lookup of org functions / departments
// AI Engagement (4-Lightspeed)
//
// A controlled vocabulary of departments ("Engineering", "Sales", …) used by
// job_titles, the PIP "Team / Department" field, and the Exit Survey dept
// field — replacing free-form text with a managed list. Mirrors job_titles.
//
// Managed by admins via Core Data → Departments (CRUD). Retire with
// `isActive = false` rather than deleting, so historical records keep their
// label. Seeded with the 8 standard functions (parity with the sibling
// lightspeed-talent-assessment app).
// ============================================================

import { pgTable, uuid, varchar, text, integer, boolean, timestamp, unique } from 'drizzle-orm/pg-core';

export const departments = pgTable('departments', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 160 }).notNull(),       // "Engineering"
  description: text('description'),                         // optional
  isActive: boolean('is_active').notNull().default(true),  // retire without deleting
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniqName: unique('uniq_department_name').on(t.name),
}));

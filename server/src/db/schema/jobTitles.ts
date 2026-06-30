// ============================================================
// JOB TITLES — shared HR lookup of titles / levels
// AI Engagement (4-Lightspeed)
//
// A controlled vocabulary of job titles ("Software Engineer II",
// "Account Executive", …) used by the PIP "Role / Level" field, the
// Employees directory, and the Exit Survey role field.
//
// Titles are DEPARTMENT-AGNOSTIC by design: the same title (e.g. "Manager")
// can exist in many departments, so department is NOT an attribute of the
// title — it lives on the employee / PIP record instead.
//
// DISTINCT from `users.role` (the auth tier). Managed via Core Data → Job
// Titles. Retire with `isActive = false` rather than deleting so historical
// records keep their label.
// ============================================================

import { pgTable, uuid, varchar, integer, boolean, timestamp, unique } from 'drizzle-orm/pg-core';

export const jobTitles = pgTable('job_titles', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 200 }).notNull(),     // "Software Engineer II"
  level: varchar('level', { length: 60 }),                 // optional, e.g. "L3" / "Senior"
  isActive: boolean('is_active').notNull().default(true),  // retire without deleting
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniqTitle: unique('uniq_job_title').on(t.title),
}));

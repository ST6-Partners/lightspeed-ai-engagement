// ============================================================
// EXIT SURVEY — two-part exit diagnostic, manager-signal (DD-002 Engagement)
// One record per departure. `partA`/`partB` hold the questionnaire answers;
// the surprise scores are promoted to columns for the HR comparison read.
// Names are denormalized text so records can be seeded without user IDs.
// ============================================================
import {
  pgTable, uuid, varchar, integer, date, timestamp, jsonb,
} from 'drizzle-orm/pg-core';
import { users } from './core.js';

export const exitSurveys = pgTable('exit_surveys', {
  id: uuid('id').primaryKey().defaultRandom(),
  subjectName: varchar('subject_name', { length: 200 }).notNull(),
  subjectRole: varchar('subject_role', { length: 200 }),
  managerName: varchar('manager_name', { length: 200 }),
  exitType: varchar('exit_type', { length: 8 }).notNull().default('vol'), // 'vol' | 'invol'
  status: varchar('status', { length: 16 }).notNull().default('draft'),
    // 'draft' | 'part_a_done' | 'complete'
  surpriseEmployee: integer('surprise_employee'),         // 1..5
  surpriseManager: integer('surprise_manager'),           // 1..5
  partA: jsonb('part_a').$type<Record<string, number | string>>(),
  partB: jsonb('part_b').$type<Record<string, number | string>>(),
  leftOn: date('left_on'),
  createdById: uuid('created_by_id').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

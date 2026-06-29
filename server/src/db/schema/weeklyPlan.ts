// ============================================================
// WEEKLY PLAN — soft, optional weekly check-in (DD-002 Planning)
// One row per user per ISO week. No scoring, no lock.
// ============================================================
import {
  pgTable, uuid, varchar, text, integer, date, timestamp, jsonb, unique,
} from 'drizzle-orm/pg-core';
import { users } from './core.js';

export const weeklyCheckins = pgTable('weekly_checkins', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  weekStart: date('week_start').notNull(),                 // Monday of the ISO week
  priorities: jsonb('priorities').$type<string[]>().notNull().default([]),
  wins: text('wins'),
  blockers: text('blockers'),
  mood: integer('mood'),                                   // 1..5
  pulseAnswer: varchar('pulse_answer', { length: 24 }),    // 'Disagree' | 'Neutral' | 'Agree'
  status: varchar('status', { length: 16 }).notNull().default('draft'), // 'draft' | 'saved'
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniqUserWeek: unique('uniq_user_week').on(t.userId, t.weekStart),
}));

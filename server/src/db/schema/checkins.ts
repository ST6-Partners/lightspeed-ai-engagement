// ============================================================
// WEEKLY CHECK-IN PULSE — standalone weekly pulse (fires on its own clock,
// independent of the 1:1). One row per submitted pulse.
//
// Fixed anchors, trended every week (typed columns): bestSelf, sentiment,
// workload — each 1..5. Two rotating items (driver + value) and the optional
// open-text vary by the 12-week rotation (see src/lib/weeklyCheckin.ts); they
// are stored as jsonb so the asked question travels with the answer. eNPS is a
// quarterly 0..10 that appears on rotation week 12.
// ============================================================

import { pgTable, uuid, varchar, integer, jsonb, text, date, timestamp } from 'drizzle-orm/pg-core';
import { users } from './core.js';

export interface CheckinRotatingItem {
  key: string;        // stable slot key, e.g. 'execution_confidence' | 'value_owns_outcome'
  text: string;       // the exact statement/question asked
  driver?: string;    // engagement driver this rolls up into
  value?: number;     // the 1..5 answer (or 0..10 for eNPS driver on wk 12)
}

export const checkinResponses = pgTable('checkin_responses', {
  id: uuid('id').primaryKey().defaultRandom(),
  // Respondent (kept — may be needed by HR; not anonymized). Null if user removed.
  respondentId: uuid('respondent_id').references(() => users.id, { onDelete: 'set null' }),
  respondentName: varchar('respondent_name', { length: 200 }),
  weekOf: date('week_of').notNull(),
  rotationIndex: integer('rotation_index').notNull(),      // 0..11
  // Fixed anchors (1..5)
  bestSelf: integer('best_self'),
  sentiment: integer('sentiment'),
  workload: integer('workload'),
  // Rotating items (question + answer travel together)
  driver: jsonb('driver').$type<CheckinRotatingItem>(),
  valueItem: jsonb('value_item').$type<CheckinRotatingItem>(),
  // Quarterly eNPS (0..10) — present only on rotation week 12
  enps: integer('enps'),
  // Optional open-text question of the week
  openPrompt: text('open_prompt'),
  openText: text('open_text'),
  submittedAt: timestamp('submitted_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

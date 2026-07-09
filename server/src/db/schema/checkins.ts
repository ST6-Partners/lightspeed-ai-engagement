// ============================================================
// WEEKLY CHECK-IN — configurable pulse.
//  • checkin_questions — the admin-managed question BANK. Each question has a
//    type (scale5 | enps | text) and a category (morale | priorities |
//    manager_support | values | growth | general). `included` marks whether it
//    is part of the live check-in; `isActive` retires without deleting history.
//  • checkin_settings — singleton config (cadence: weekly | biweekly | monthly).
//  • checkin_responses — one row per submitted check-in. `answers` holds the
//    per-question answers (scaled value or written text) with the question text
//    denormalized so history stays readable. Respondent kept (not anonymized).
// ============================================================

import { pgTable, uuid, varchar, integer, jsonb, text, date, timestamp, boolean } from 'drizzle-orm/pg-core';
import { users } from './core.js';

export type CheckinQuestionType = 'scale5' | 'enps' | 'text';

export const checkinQuestions = pgTable('checkin_questions', {
  id: uuid('id').primaryKey().defaultRandom(),
  text: text('text').notNull(),
  type: varchar('type', { length: 16 }).notNull().default('scale5'),       // scale5 | enps | text
  category: varchar('category', { length: 40 }).notNull().default('general'),
  driver: varchar('driver', { length: 40 }),                                // optional engagement-driver tag
  isActive: boolean('is_active').notNull().default(true),                   // in the bank
  included: boolean('included').notNull().default(false),                   // part of the live check-in
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const checkinSettings = pgTable('checkin_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  cadence: varchar('cadence', { length: 16 }).notNull().default('weekly'),  // weekly | biweekly | monthly
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export interface CheckinAnswer {
  questionId: string;
  text: string;
  type: CheckinQuestionType;
  category?: string;
  driver?: string;
  value?: number;       // for scale5 (1..5) / enps (0..10)
  answerText?: string;  // for written questions
}

export const checkinResponses = pgTable('checkin_responses', {
  id: uuid('id').primaryKey().defaultRandom(),
  respondentId: uuid('respondent_id').references(() => users.id, { onDelete: 'set null' }),
  respondentName: varchar('respondent_name', { length: 200 }),
  weekOf: date('week_of').notNull(),                 // period start (submission date)
  rotationIndex: integer('rotation_index').notNull().default(0),  // legacy; retained
  // legacy fixed anchors (nullable, retained for back-compat with 0029)
  bestSelf: integer('best_self'),
  sentiment: integer('sentiment'),
  workload: integer('workload'),
  driver: jsonb('driver'),
  valueItem: jsonb('value_item'),
  enps: integer('enps'),
  openPrompt: text('open_prompt'),
  openText: text('open_text'),
  // configurable answers (current model)
  answers: jsonb('answers').$type<CheckinAnswer[]>().notNull().default([]),
  submittedAt: timestamp('submitted_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

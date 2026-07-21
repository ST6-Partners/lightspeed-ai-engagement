// ============================================================
// PEER REVIEW — employee feedback on a PEER (lateral review).
// AI Engagement (4-Lightspeed) — 2026-07-21 (bf).
//
// Mirrors the Manager Review (manager survey) shape, but the subject is a peer
// rather than a manager. Reuses the shared 1..5 `manager_rating_scale` legend.
//  • peer_review_questions  — managed statements employees rate about a peer.
//  • peer_review_responses  — one row per submitted peer review; `ratings` maps
//    question id -> 1..5. Attributes respondent + the peer being reviewed;
//    names denormalized for durable display.
// ============================================================

import {
  pgTable, uuid, text, integer, boolean, jsonb, timestamp, date, varchar,
} from 'drizzle-orm/pg-core';
import { users } from './core.js';

export const peerReviewQuestions = pgTable('peer_review_questions', {
  id: uuid('id').primaryKey().defaultRandom(),
  text: text('text').notNull(),
  description: text('description'),
  isActive: boolean('is_active').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const peerReviewResponses = pgTable('peer_review_responses', {
  id: uuid('id').primaryKey().defaultRandom(),
  // The employee giving the rating (respondent).
  respondentId: uuid('respondent_id').references(() => users.id, { onDelete: 'set null' }),
  respondentName: varchar('respondent_name', { length: 200 }),
  // The peer being reviewed (subject).
  peerId: uuid('peer_id').references(() => users.id, { onDelete: 'set null' }),
  peerName: varchar('peer_name', { length: 200 }),
  reviewDate: date('review_date').notNull(),
  ratings: jsonb('ratings').$type<Record<string, number>>().notNull().default({}),
  status: varchar('status', { length: 16 }).notNull().default('complete'),
  submittedAt: timestamp('submitted_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

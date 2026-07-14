// ============================================================
// COACHING PLANS
// AI Engagement (4-Lightspeed) — Coaching Plans tab (2026-07-09)
//
// A coaching plan is crafted FROM one employee review (a value_evaluation in
// schema/values.ts). It synthesizes that review into an employee-facing
// document: a written narrative summary, positive feedback on strengths, and
// 1-3 growth "focus areas" to work on. The narrative + strengths are drafted
// by AI from the review's scores/notes (claude-sonnet-4-6, same client as the
// chat router) and are then editable by the manager. Exported to PDF (browser
// print) to hand to the employee during the feedback conversation.
//
//   coaching_plans          — one plan per (employee, source review). Owned by AIE.
//   coaching_plan_focus_areas — the 1-3 growth areas chosen for the plan; each
//                               optionally tied to the company value it maps to.
// ============================================================

import {
  pgTable, uuid, varchar, text, integer, boolean, timestamp, index,
} from 'drizzle-orm/pg-core';
import { users } from './core.js';
import { companyValues } from './values.js';
import { reviews } from './reviews.js';

export const coachingPlans = pgTable('coaching_plans', {
  id: uuid('id').primaryKey().defaultRandom(),
  employeeId: uuid('employee_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  // The review this plan was crafted from. Kept nullable + set-null on delete
  // so a plan survives if its source review is later removed.
  evaluationId: uuid('evaluation_id')
    .references(() => reviews.id, { onDelete: 'set null' }),
  // The review-session container this plan belongs to (FK in migration 0040). The
  // go-forward reads BOTH passes (values + performance) through the session.
  sessionId: uuid('session_id'),
  // The go-forward track. 'coaching' = growth areas only; 'pip' = a PIP addendum
  // is attached (see pips.source_session_id). Every plan starts as 'coaching'.
  track: varchar('track', { length: 16 }).notNull().default('coaching'),
  authorId: uuid('author_id').references(() => users.id, { onDelete: 'set null' }),
  periodLabel: text('period_label'),
  status: varchar('status', { length: 16 }).notNull().default('draft'), // draft | final
  // The synthesized written summary of the review (AI-drafted, human-editable).
  summaryNarrative: text('summary_narrative'),
  // Positive feedback on where the person is strong (AI-drafted, human-editable).
  strengths: text('strengths'),
  // True once an AI draft has been generated into this plan.
  aiGenerated: boolean('ai_generated').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  byEmployee: index('idx_coaching_plan_employee').on(t.employeeId),
}));

export const coachingPlanFocusAreas = pgTable('coaching_plan_focus_areas', {
  id: uuid('id').primaryKey().defaultRandom(),
  planId: uuid('plan_id')
    .references(() => coachingPlans.id, { onDelete: 'cascade' })
    .notNull(),
  // The company value this growth area maps to (nullable — a focus area can be
  // free-standing). set-null so retiring a value doesn't drop the focus area.
  valueId: uuid('value_id').references(() => companyValues.id, { onDelete: 'set null' }),
  // Polymorphic mapping (migration 0040): a focus area can map to a company value
  // OR a performance criterion, or stand free. item_type resolves item_id's table.
  itemType: varchar('item_type', { length: 16 }),
  itemId: uuid('item_id'),
  title: varchar('title', { length: 200 }).notNull(),
  coachingNote: text('coaching_note'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  byPlan: index('idx_coaching_focus_plan').on(t.planId),
}));

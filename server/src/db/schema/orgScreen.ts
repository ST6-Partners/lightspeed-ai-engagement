// ============================================================
// ORG SCREEN — new storage for the Organization screen (Stage 1)
// AI Engagement (4-Lightspeed) — spec: AIE Org Screen Spec v1 §7.1/§7.5/§10.1
//
// Built on the existing `users` table (the org source of truth via
// users.managerId). No separate employees table — see 07-02-26-bf session.
// ============================================================

import {
  pgTable, uuid, varchar, text, integer, smallint, date, timestamp, jsonb,
  index, primaryKey, check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './core.js';
import { okrNodes } from './okr.js';

// Priorities — a per-person "current priority" pointer: an OKR node
// (objective / key_result / task) OR a free-text KTBR. `weekStart` is
// STORED but not surfaced in v1 (NULL = current) so a weekly view is a
// later query, not a migration (Signal parity, spec §7.1).
export const priorities = pgTable('priorities', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  weekStart: date('week_start'),                          // NULL = current
  itemType: varchar('item_type', { length: 16 }).notNull(), // 'objective'|'key_result'|'task'|'ktbr'
  okrNodeId: uuid('okr_node_id').references(() => okrNodes.id, { onDelete: 'set null' }),
  ktbrLabel: text('ktbr_label'),                          // set when itemType='ktbr'
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  // Set when a manager assigns this priority from the Org screen (attribution
  // for the "assigned by your manager" badge in the person's Weekly Plan).
  assignedBy: uuid('assigned_by').references(() => users.id, { onDelete: 'set null' }),
  assignedAt: timestamp('assigned_at', { withTimezone: true }),
  // Completion state — the assignee (or a manager) can check a priority done
  // from their Weekly Plan. Current-state, mirrors the priority itself.
  done: boolean('done').notNull().default(false),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  // Archived — the assignee decluttered a completed priority off their active
  // Weekly-Plan list before week-end. Filed into that week's Completed section.
  archived: boolean('archived').notNull().default(false),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
}, (t) => ({
  byEmpWeek: index('idx_priorities_emp_week').on(t.userId, t.weekStart),
}));

// 9 Box ratings — single value 1..9 encodes both axes (numpad convention,
// spec §10.1). Latest-by-date wins for display; history retained.
export const nineBoxRatings = pgTable('nine_box_ratings', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  box: smallint('box').notNull(),                         // 1..9 (see check)
  ratedAt: date('rated_at').notNull().defaultNow(),
  ratedBy: uuid('rated_by').references(() => users.id, { onDelete: 'set null' }),
  note: text('note'),
}, (t) => ({
  byEmp: index('idx_ninebox_emp').on(t.userId, t.ratedAt),
  boxRange: check('nine_box_box_range', sql`${t.box} between 1 and 9`),
}));

// Engagement snapshots — headline thriving / flight-risk signal per person
// (spec §7.5). Stub content in v1; source wired later.
export type EngagementDriver = { label: string; value: number };
export const engagementSnapshots = pgTable('engagement_snapshots', {
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  asOf: date('as_of').notNull(),
  score: integer('score'),                                // 0..100 headline
  drivers: jsonb('drivers').$type<EngagementDriver[]>().notNull().default([]),
}, (t) => ({
  pk: primaryKey({ columns: [t.userId, t.asOf] }),
}));

// ============================================================
// ORG SCREEN — Stage 2: Assessments + Review (spec §7.3/§7.4/§8)
// Standalone in AIE (no Signal/Spine): AIE owns and stores the full
// summary/review locally, shaped to the exact render. All keyed to
// users.id (reuse the existing table, consistent with Stage 1).
// numeric columns come back as strings from pg — the router coerces
// to Number before returning to the client.
// ============================================================
import { numeric, boolean } from 'drizzle-orm/pg-core';

// ---- Assessments (standalone snapshot per person) ----
export const assessmentSummaries = pgTable('assessment_summaries', {
  userId: uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  ccatColor: varchar('ccat_color', { length: 16 }),   // 'green'|'yellow'|'red'; NULL = grey badge
  eppColor: varchar('epp_color', { length: 16 }),
  eppProfile: text('epp_profile'),                    // profile name under EPP badge
  eppScore: numeric('epp_score'),                     // displayScore
  // Insights (Colour Dynamics) header meta — from the uploaded Insights profile.
  insightsType: text('insights_type'),                // e.g. 'Reforming Director'
  insightsConsciousWheel: text('insights_conscious_wheel'),
  insightsLessWheel: text('insights_less_wheel'),
  insightsPreferenceFlow: numeric('insights_preference_flow'),
  insightsCompletedAt: date('insights_completed_at'),
  insightsSource: varchar('insights_source', { length: 16 }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// CCAT badge (Overall) + breakdown bars. CCAT scale is /50, not 0-100.
export const assessmentCcatSections = pgTable('assessment_ccat_sections', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  label: text('label').notNull(),                     // 'Overall' pulled out as the badge
  score: numeric('score'),
  sortOrder: integer('sort_order').notNull().default(0),
}, (t) => ({ byUser: index('idx_ccat_sections_user').on(t.userId) }));

// EPP "priority attributes" bars.
export const assessmentEppAttributes = pgTable('assessment_epp_attributes', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  st6Score: numeric('st6_score'),                     // visible bar value
  eppScore: numeric('epp_score'),
  finalScore: numeric('final_score'),
  weightage: numeric('weightage'),                    // %, shown in tooltip
  colorHex: varchar('color_hex', { length: 9 }),      // per-attribute color (fallback '#378ADD')
  sortOrder: integer('sort_order').notNull().default(0),
}, (t) => ({ byUser: index('idx_epp_attrs_user').on(t.userId) }));

// Insights persona chart (one row per profile color).
export const assessmentInsightProfiles = pgTable('assessment_insight_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  color: varchar('color', { length: 16 }),            // 'blue'|'green'|'yellow'|'red'
  consciousScore: numeric('conscious_score'),         // 0..100
  lessConsciousScore: numeric('less_conscious_score'),// 0..100
  isPrimary: boolean('is_primary').notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
}, (t) => ({ byUser: index('idx_insight_profiles_user').on(t.userId) }));

// ---- Review (standalone; store comp INPUTS, derive dollars at render) ----
export const reviewCycles = pgTable('review_cycles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  label: text('label').notNull(),                     // e.g. '2026 H1'
  status: varchar('status', { length: 16 }),          // 'IN_PROGRESS' | 'FINAL'
  sortOrder: integer('sort_order').notNull().default(0),
  // performance zone
  scoreTotal: numeric('score_total'),
  scoreValues: numeric('score_values'),               // avg (2 dp)
  scorePerformance: numeric('score_performance'),
  rank: integer('rank'),
  rankOf: integer('rank_of'),
  tier: text('tier'),
  // compensation zone (inputs; dollars derived at render)
  startBase: numeric('start_base'),
  startBonusPct: numeric('start_bonus_pct'),          // fraction (0.20 = 20%)
  meritBasePct: numeric('merit_base_pct'),            // fraction
  hasPromotion: boolean('has_promotion').notNull().default(false),
  finalSalaryIncrease: numeric('final_salary_increase'),
  finalNewOte: numeric('final_new_ote'),
}, (t) => ({ byUser: index('idx_review_cycles_user').on(t.userId) }));

// Collapsible "Values" rows in the performance zone (0..5, band-colored).
export const reviewValueDetails = pgTable('review_value_details', {
  id: uuid('id').primaryKey().defaultRandom(),
  cycleId: uuid('cycle_id').notNull().references(() => reviewCycles.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  score: numeric('score'),
  sortOrder: integer('sort_order').notNull().default(0),
}, (t) => ({ byCycle: index('idx_review_value_cycle').on(t.cycleId) }));

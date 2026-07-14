// ============================================================
// PERFORMANCE IMPROVEMENT PLAN (PIP) — schema
// AI Engagement (4-Lightspeed)
//
// Models the PIP form mockup (pip-v1.html) as one parent record
// (`pips`) plus five child tables, each independently CRUD-able:
//   - pip_concerns    §3  Summary of Performance Concerns (table rows)
//   - pip_goals       §4  Expectations & Success Criteria  (goal cards)
//   - pip_supports    §5  Support & Resources We Will Provide (table rows)
//   - pip_checkins    §6  Check-In Log (entries)
//   - pip_signatures  §9  Acknowledgment & Signatures (one row per role)
//
// Conventions mirror planning.ts:
//   - uuid PKs, soft-delete (`archivedAt` + `archivedBy`) on the parent,
//   - FK cascade from children → parent so a hard delete is clean,
//   - users referenced for the people on the plan (employee/manager/HR),
//   - createdAt / updatedAt timestamps on mutable rows.
//
// Design intent baked in (from the mockup + HR/coach recommendations):
//   - Supportive-not-punitive: `purpose`, `outcomeMet`, `outcomeNotMet`
//     carry editable default language (set in the router on create).
//   - No-surprises: each concern records where it was `previouslyRaised`.
//   - Two-way: `employeeComments` + an employee signature row.
//   - Regular cadence: check-ins are first-class rows, not an end-of-plan field.
// ============================================================

import {
  pgTable, uuid, varchar, text, timestamp, integer, date,
} from 'drizzle-orm/pg-core';
import { users } from './core.js';
import { jobTitles } from './jobTitles.js';
import { departments } from './departments.js';

// ── The PIP record ──────────────────────────────────────────
// status workflow (enforced in the router):
//   draft → active → (completed_met | completed_not_met | extended)
//   any non-terminal state → cancelled
export const pips = pgTable('pips', {
  id: uuid('id').primaryKey().defaultRandom(),

  // People on the plan. employee = the subject; manager + HR own/edit it.
  employeeId: uuid('employee_id').references(() => users.id, { onDelete: 'set null' }),
  managerId: uuid('manager_id').references(() => users.id, { onDelete: 'set null' }),
  hrPartnerId: uuid('hr_partner_id').references(() => users.id, { onDelete: 'set null' }),

  // Role / Level — FK into the managed job_titles lookup (was free text).
  jobTitleId: uuid('job_title_id').references(() => jobTitles.id, { onDelete: 'set null' }),
  // Team / Department — managed FK into the departments lookup.
  departmentId: uuid('department_id').references(() => departments.id, { onDelete: 'set null' }),
  // DEPRECATED free-text team — superseded by departmentId. Retained so the
  // migration is purely additive (no destructive drop); not read/written by the app.
  team: varchar('team', { length: 200 }),

  // §1 Plan details
  durationDays: integer('duration_days').notNull().default(60),
  startDate: date('start_date'),
  midpointDate: date('midpoint_date'),
  finalReviewDate: date('final_review_date'),

  // §2 Purpose (supportive default set on create)
  purpose: text('purpose'),

  status: varchar('status', { length: 24 }).notNull().default('draft'),
    // 'draft' | 'active' | 'completed_met' | 'completed_not_met' | 'extended' | 'cancelled'
  activatedAt: timestamp('activated_at', { withTimezone: true }),
  closedAt: timestamp('closed_at', { withTimezone: true }),

  // §7 Outcomes (editable default language)
  outcomeMet: text('outcome_met'),
  outcomeNotMet: text('outcome_not_met'),

  // §8 Employee comments (the employee's own voice on the record)
  employeeComments: text('employee_comments'),

  // Soft delete (cascades conceptually; children FK-cascade on hard delete)
  archivedAt: timestamp('archived_at', { withTimezone: true }),
  archivedBy: uuid('archived_by').references(() => users.id),

  // The review session this PIP was forked from (Reviews go-forward fork; FK in migration 0040).
  sourceSessionId: uuid('source_session_id'),

  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── §3 Concerns ─────────────────────────────────────────────
export const pipConcerns = pgTable('pip_concerns', {
  id: uuid('id').primaryKey().defaultRandom(),
  pipId: uuid('pip_id').notNull().references(() => pips.id, { onDelete: 'cascade' }),
  sortOrder: integer('sort_order').notNull().default(0),

  area: varchar('area', { length: 300 }).notNull(),        // "Delivery predictability"
  observations: text('observations'),                       // specific examples / dates
  expectation: text('expectation'),                         // the role expectation not yet met
  previouslyRaised: varchar('previously_raised', { length: 400 }), // where it was first raised

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── §4 Expectations & success criteria (goals) ──────────────
export const pipGoals = pgTable('pip_goals', {
  id: uuid('id').primaryKey().defaultRandom(),
  pipId: uuid('pip_id').notNull().references(() => pips.id, { onDelete: 'cascade' }),
  sortOrder: integer('sort_order').notNull().default(0),

  title: varchar('title', { length: 400 }).notNull(),       // "Restore delivery predictability"
  successCriteria: text('success_criteria'),                // measurable definition of "met"
  measurement: text('measurement'),                         // how it will be measured
  status: varchar('status', { length: 16 }).notNull().default('pending'),
    // 'pending' | 'on_track' | 'partial' | 'off_track' | 'met' | 'not_met'

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── §5 Support & resources ──────────────────────────────────
export const pipSupports = pgTable('pip_supports', {
  id: uuid('id').primaryKey().defaultRandom(),
  pipId: uuid('pip_id').notNull().references(() => pips.id, { onDelete: 'cascade' }),
  sortOrder: integer('sort_order').notNull().default(0),

  support: varchar('support', { length: 400 }).notNull(),   // "Weekly 1:1 coaching"
  owner: varchar('owner', { length: 200 }),                 // free text ("L&D / Manager")
  cadence: varchar('cadence', { length: 200 }),             // "Every Monday, 30 min"

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── §6 Check-in log ─────────────────────────────────────────
export const pipCheckins = pgTable('pip_checkins', {
  id: uuid('id').primaryKey().defaultRandom(),
  pipId: uuid('pip_id').notNull().references(() => pips.id, { onDelete: 'cascade' }),
  sortOrder: integer('sort_order').notNull().default(0),

  label: varchar('label', { length: 200 }).notNull(),       // "Mid-Point Review"
  checkinDate: date('checkin_date'),
  attendees: varchar('attendees', { length: 300 }),         // "Manager + Employee + HR"
  notes: text('notes'),                                     // progress, evidence, blockers
  status: varchar('status', { length: 16 }),                // 'on_track' | 'partial' | 'off_track'

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── §9 Signatures ───────────────────────────────────────────
// One row per signing role; `signedAt` NULL until the party signs.
export const pipSignatures = pgTable('pip_signatures', {
  id: uuid('id').primaryKey().defaultRandom(),
  pipId: uuid('pip_id').notNull().references(() => pips.id, { onDelete: 'cascade' }),
  sortOrder: integer('sort_order').notNull().default(0),

  role: varchar('role', { length: 24 }).notNull(),          // 'employee' | 'manager' | 'hr' | 'reviewer'
  signerName: varchar('signer_name', { length: 200 }),
  signedById: uuid('signed_by_id').references(() => users.id, { onDelete: 'set null' }),
  signedAt: timestamp('signed_at', { withTimezone: true }),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

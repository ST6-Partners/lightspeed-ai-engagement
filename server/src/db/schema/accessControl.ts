// ============================================================
// ACCESS CONTROL — the Reach grid (AIE 2026-08-03)
//
// Replaces three independent fields (users.role, users.leader_badge,
// users.is_hr_access) with ONE access level per person, plus a
// sysadmin-editable grid saying what each level may reach in each area
// of the app.
//
// The grid sets the CEILING only. Two things it can never loosen:
//   - field-level HR-only rules (DD-018 exit-survey meta-descriptors,
//     DD-019 fairness / legal-risk signal)
//   - the min-group-size-3 anonymity floor (DD-027) — that is a promise
//     to employees, not a permission
//
// Manager powers are NOT granted by this table. Anyone with people
// reporting to them on the org chart gets them, whatever their level.
// ============================================================

import { pgTable, uuid, varchar, timestamp, unique } from 'drizzle-orm/pg-core';
import { users } from './core.js';

/**
 * The five access levels (AIE 2026-08-03, revised same day from seven).
 * SLT folded into ELT and Admin folded into Sysadmin — each pair was the same
 * thing in practice. Order is for display only; this is not a ladder.
 */
export const ACCESS_LEVELS = ['sysadmin', 'elt', 'hr', 'manager', 'user'] as const;
export type AccessLevel = (typeof ACCESS_LEVELS)[number];

/** The five gated areas — the four sidebar groups plus Assessments. */
export const ACCESS_AREAS = ['planning', 'engagement', 'insights', 'documents', 'assessments'] as const;
export type AccessArea = (typeof ACCESS_AREAS)[number];

/** How far a level can see within an area. */
export const REACH_VALUES = ['none', 'down_org', 'all'] as const;
export type Reach = (typeof REACH_VALUES)[number];

/** Only ELT draws a badge on the org chart now that SLT is retired. */
export const BADGE_LEVELS: AccessLevel[] = ['elt'];

/**
 * Documents is Core Data — job titles, departments, rating scales. It holds
 * configuration, not people, so "everyone who rolls up to me" is meaningless
 * there. Down-org collapses to none on this area.
 */
export const AREAS_WITHOUT_DOWN_ORG: AccessArea[] = ['documents'];

// One row per level x area. Seeded complete (35 rows) by migration 0100, so a
// missing row means something is wrong — the resolver fails closed on absence.
export const accessGrants = pgTable('access_grants', {
  id: uuid('id').primaryKey().defaultRandom(),
  level: varchar('level', { length: 16 }).notNull(),
  area: varchar('area', { length: 24 }).notNull(),
  reach: varchar('reach', { length: 12 }).notNull().default('none'),
  updatedBy: uuid('updated_by').references(() => users.id, { onDelete: 'set null' }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  levelArea: unique('uq_access_grants_level_area').on(t.level, t.area),
}));

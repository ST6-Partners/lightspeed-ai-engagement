// ============================================================
// CORE TABLES — users, preferences, settings, screen inventory
// Template App SP-002
//
// AUTH integration per DD-001 / DD-002 / DD-005 / DD-006 / DD-007:
//   - Passwords live in WorkOS; this app does not hash or store them.
//   - `sub` = stable WorkOS user ID (contract with the library)
//   - `externalId` = legacy app user ID preserved during migration
//     (DD-006). Null for net-new users; TMPL has no legacy users.
//   - `connectionType` / `connectionId` mirror the JWT claims so app
//     code can distinguish workforce / contractor / external.
//   - `role` is TMPL's *app-level* authorization (DD-001: authz stays
//     per-app). The library authenticates; this column authorizes.
// ============================================================

import { pgTable, uuid, varchar, text, timestamp, boolean, integer, jsonb, primaryKey, type AnyPgColumn } from 'drizzle-orm/pg-core';
import { jobTitles } from './jobTitles.js';
import { departments } from './departments.js';

// Users — four-tier role model (DD-012, DD-014)
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  // Stable WorkOS user ID (JWT `sub` claim). Unique across all users.
  sub: text('sub').notNull().unique(),
  // Local email/password auth (Sequence 3). Null for any legacy rows.
  passwordHash: text('password_hash'),
  // Legacy/external ID preserved per DD-006. Null for net-new users.
  externalId: text('external_id'),
  // Mirrored JWT claims
  connectionType: varchar('connection_type', { length: 20 }),
    // 'workforce' | 'contractor' | 'external'
  connectionId: text('connection_id'),
  // Identity fields populated from JWT claims at login
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }),
  avatarUrl: text('avatar_url'),
  title: varchar('title', { length: 255 }),
  // Org placement (admin-managed via employee upload; not self-editable). AIE 2026-07-23.
  team: varchar('team', { length: 160 }),
  location: varchar('location', { length: 160 }),
  businessUnit: varchar('business_unit', { length: 160 }),
  // Start date — YEAR required on entry; month/day optional. Stored as parts so a
  // year-only start is representable. Tenure (and its filter bands) derive from these.
  hireYear: integer('hire_year'),
  hireMonth: integer('hire_month'),
  hireDay: integer('hire_day'),
  // Employee directory fields (Core Data → Employees). Managed lookups:
  jobTitleId: uuid('job_title_id').references(() => jobTitles.id, { onDelete: 'set null' }),
  departmentId: uuid('department_id').references(() => departments.id, { onDelete: 'set null' }),
  managerId: uuid('manager_id').references((): AnyPgColumn => users.id, { onDelete: 'set null' }),
  // Org-screen leadership tier badge (ELT | SLT | ST6 | null). Additive for
  // the Organization tree; independent of `role` (auth tier).
  leaderBadge: varchar('leader_badge', { length: 8 }),
  role: varchar('role', { length: 20 }).notNull().default('user'),
    // 'user' | 'manager' | 'admin' | 'sysadmin'
  isBeta: boolean('is_beta').notNull().default(false),
  isHrAccess: boolean('is_hr_access').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  timezone: varchar('timezone', { length: 100 }),
  lastActiveAt: timestamp('last_active_at', { withTimezone: true }),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// User Preferences — per-user UI state
export const userPreferences = pgTable('user_preferences', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  key: varchar('key', { length: 255 }).notNull(),
  value: jsonb('value').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// App Settings — runtime feature flags and config (DD-010)
export const appSettings = pgTable('app_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: varchar('key', { length: 255 }).notNull().unique(),
  value: jsonb('value').notNull(),
  description: text('description'),
  updatedBy: uuid('updated_by').references(() => users.id),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Screen Inventory — maps screen IDs to human-readable names
// Used by: feedback (screen_id FK), telemetry (screen tagging)
export const screenInventory = pgTable('screen_inventory', {
  id: uuid('id').primaryKey().defaultRandom(),
  screenKey: varchar('screen_key', { length: 100 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  routePattern: varchar('route_pattern', { length: 255 }),
  isActive: boolean('is_active').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Additional managers (matrixed / dotted-line). `users.managerId` stays the
// PRIMARY manager — the org tree groups a person under their primary. This join
// table holds the FULL set of a person's managers (including the primary).
export const userManagers = pgTable('user_managers', {
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  managerId: uuid('manager_id').notNull().references((): AnyPgColumn => users.id, { onDelete: 'cascade' }),
}, (t) => ({ pk: primaryKey({ columns: [t.userId, t.managerId] }) }));

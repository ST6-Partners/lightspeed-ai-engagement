// ============================================================
// OKRs — nested objectives → key results → tasks (DD-002 Planning)
// Single self-referential adjacency table. `owner` is a denormalized
// name string (not a user FK) so the tree can be seeded without user IDs
// and matches the mockup's owner-name display.
// ============================================================
import {
  pgTable, uuid, varchar, text, integer, date, timestamp,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { users } from './core.js';

export const okrNodes = pgTable('okr_nodes', {
  id: uuid('id').primaryKey().defaultRandom(),
  parentId: uuid('parent_id').references((): AnyPgColumn => okrNodes.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 16 }).notNull(),        // 'objective' | 'key_result' | 'task'
  title: varchar('title', { length: 400 }).notNull(),
  owner: varchar('owner', { length: 200 }),               // denormalized name (display)
  // Optional FK to the owning user — enables reliable per-person OKR fetch
  // on the Org screen while `owner` stays for name display / seeding.
  ownerUserId: uuid('owner_user_id').references(() => users.id, { onDelete: 'set null' }),
  status: varchar('status', { length: 24 }).notNull().default('not_started'),
    // 'not_started' | 'in_progress' | 'on_hold' | 'complete'
  light: varchar('light', { length: 8 }),                 // 'green' | 'yellow' | 'red' (outcomes only)
  dueDate: date('due_date'),
  description: text('description'),
  sortOrder: integer('sort_order').notNull().default(0),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ============================================================
// ACCESS REQUESTS — self-service "request access" to a locked section.
// A user requests a section; the app notifies IT (admins). An admin
// approves (which raises the user's role to the section tier) or denies.
// ============================================================

import { pgTable, uuid, varchar, text, timestamp } from 'drizzle-orm/pg-core';
import { users } from './core.js';

export const accessRequests = pgTable('access_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  sectionKey: varchar('section_key', { length: 50 }).notNull(),
  sectionLabel: varchar('section_label', { length: 120 }).notNull(),
  requestedRole: varchar('requested_role', { length: 20 }).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
    // 'pending' | 'approved' | 'denied'
  note: text('note'),
  decidedBy: uuid('decided_by').references(() => users.id, { onDelete: 'set null' }),
  decidedAt: timestamp('decided_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

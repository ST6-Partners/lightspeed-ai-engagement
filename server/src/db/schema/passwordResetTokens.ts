// ============================================================
// PASSWORD RESET TOKENS — backs the "forgot password" email flow.
// One row per reset request. Stores a SHA-256 HASH of the raw token
// (never the token itself); the raw token only lives in the emailed link.
// Single-use (used_at) + time-limited (expires_at, 1 hour). Additive.
// ============================================================

import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core';
import { users } from './core.js';

export const passwordResetTokens = pgTable('password_reset_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  byHash: index('idx_prt_token_hash').on(t.tokenHash),
  byUser: index('idx_prt_user').on(t.userId),
}));

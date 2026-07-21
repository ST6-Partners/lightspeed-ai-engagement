-- 0064 Password reset tokens — backs the "forgot password" email flow.
-- Stores a SHA-256 hash of a single-use, time-limited reset token (never the
-- raw token, which only lives in the emailed link). Additive + idempotent.
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at    timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_prt_token_hash ON password_reset_tokens (token_hash);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_prt_user ON password_reset_tokens (user_id);

-- 0051_reactivate_bsf.sql
-- Recovery: re-activate the admin account bsf@st6partners.com. The auth layer
-- (server/src/trpc.ts) treats an inactive account as unauthenticated, so
-- toggling this account inactive while testing locked it out of the app with
-- "Not authenticated". Idempotent — a no-op once the row is active. The new
-- self-deactivation guard in auth.updateUser prevents this from recurring.
UPDATE users SET is_active = true, updated_at = now() WHERE lower(email) = 'bsf@st6partners.com';

-- 0057_dedupe_leaders_hard.sql
-- Remove the 5 old-format leader duplicate rows regardless of active status
-- (migration 0056 only removed inactive ones; these were Active, so they
-- survived and still showed as duplicate names). Keep the org-chart
-- first.last accounts. Re-point any reports onto the chart account first, clear
-- restrict-only FK refs, then delete. Idempotent + deploy-safe.
--> statement-breakpoint
UPDATE users SET manager_id = (SELECT id FROM users WHERE lower(email)='brian.thomas@lightspeedsystems.com') WHERE manager_id = (SELECT id FROM users WHERE lower(email)='bthomas@lightspeedsystems.com');
--> statement-breakpoint
UPDATE users SET manager_id = (SELECT id FROM users WHERE lower(email)='kirk.orgeldinger@lightspeedsystems.com') WHERE manager_id = (SELECT id FROM users WHERE lower(email)='korgeldinger@lightspeedsystems.com');
--> statement-breakpoint
UPDATE users SET manager_id = (SELECT id FROM users WHERE lower(email)='donal.mcmahon@lightspeedsystems.com') WHERE manager_id = (SELECT id FROM users WHERE lower(email)='dmcmahon@lightspeedsystems.com');
--> statement-breakpoint
UPDATE users SET manager_id = (SELECT id FROM users WHERE lower(email)='kevin.chiang@lightspeedsystems.com') WHERE manager_id = (SELECT id FROM users WHERE lower(email)='kchiang@lightspeedsystems.com');
--> statement-breakpoint
UPDATE users SET manager_id = (SELECT id FROM users WHERE lower(email)='colin.mccabe@lightspeedsystems.com') WHERE manager_id = (SELECT id FROM users WHERE lower(email)='cmccabe@lightspeedsystems.com');
--> statement-breakpoint
UPDATE system_jobs SET initiated_by = NULL WHERE initiated_by IN (SELECT id FROM users WHERE lower(email) IN ('bthomas@lightspeedsystems.com', 'korgeldinger@lightspeedsystems.com', 'dmcmahon@lightspeedsystems.com', 'kchiang@lightspeedsystems.com', 'cmccabe@lightspeedsystems.com'));
--> statement-breakpoint
UPDATE backup_log SET initiated_by = NULL WHERE initiated_by IN (SELECT id FROM users WHERE lower(email) IN ('bthomas@lightspeedsystems.com', 'korgeldinger@lightspeedsystems.com', 'dmcmahon@lightspeedsystems.com', 'kchiang@lightspeedsystems.com', 'cmccabe@lightspeedsystems.com'));
--> statement-breakpoint
UPDATE onboarding_videos SET created_by = NULL WHERE created_by IN (SELECT id FROM users WHERE lower(email) IN ('bthomas@lightspeedsystems.com', 'korgeldinger@lightspeedsystems.com', 'dmcmahon@lightspeedsystems.com', 'kchiang@lightspeedsystems.com', 'cmccabe@lightspeedsystems.com'));
--> statement-breakpoint
UPDATE feedback SET resolved_by = NULL WHERE resolved_by IN (SELECT id FROM users WHERE lower(email) IN ('bthomas@lightspeedsystems.com', 'korgeldinger@lightspeedsystems.com', 'dmcmahon@lightspeedsystems.com', 'kchiang@lightspeedsystems.com', 'cmccabe@lightspeedsystems.com'));
--> statement-breakpoint
UPDATE prompt_templates SET created_by = NULL WHERE created_by IN (SELECT id FROM users WHERE lower(email) IN ('bthomas@lightspeedsystems.com', 'korgeldinger@lightspeedsystems.com', 'dmcmahon@lightspeedsystems.com', 'kchiang@lightspeedsystems.com', 'cmccabe@lightspeedsystems.com'));
--> statement-breakpoint
UPDATE faq_entries SET created_by = NULL WHERE created_by IN (SELECT id FROM users WHERE lower(email) IN ('bthomas@lightspeedsystems.com', 'korgeldinger@lightspeedsystems.com', 'dmcmahon@lightspeedsystems.com', 'kchiang@lightspeedsystems.com', 'cmccabe@lightspeedsystems.com'));
--> statement-breakpoint
UPDATE chat_attachments SET user_id = NULL WHERE user_id IN (SELECT id FROM users WHERE lower(email) IN ('bthomas@lightspeedsystems.com', 'korgeldinger@lightspeedsystems.com', 'dmcmahon@lightspeedsystems.com', 'kchiang@lightspeedsystems.com', 'cmccabe@lightspeedsystems.com'));
--> statement-breakpoint
UPDATE user_activity_log SET user_id = NULL WHERE user_id IN (SELECT id FROM users WHERE lower(email) IN ('bthomas@lightspeedsystems.com', 'korgeldinger@lightspeedsystems.com', 'dmcmahon@lightspeedsystems.com', 'kchiang@lightspeedsystems.com', 'cmccabe@lightspeedsystems.com'));
--> statement-breakpoint
UPDATE chat_debug_log SET user_id = NULL WHERE user_id IN (SELECT id FROM users WHERE lower(email) IN ('bthomas@lightspeedsystems.com', 'korgeldinger@lightspeedsystems.com', 'dmcmahon@lightspeedsystems.com', 'kchiang@lightspeedsystems.com', 'cmccabe@lightspeedsystems.com'));
--> statement-breakpoint
UPDATE chat_session_logs SET user_id = NULL WHERE user_id IN (SELECT id FROM users WHERE lower(email) IN ('bthomas@lightspeedsystems.com', 'korgeldinger@lightspeedsystems.com', 'dmcmahon@lightspeedsystems.com', 'kchiang@lightspeedsystems.com', 'cmccabe@lightspeedsystems.com'));
--> statement-breakpoint
UPDATE app_settings SET updated_by = NULL WHERE updated_by IN (SELECT id FROM users WHERE lower(email) IN ('bthomas@lightspeedsystems.com', 'korgeldinger@lightspeedsystems.com', 'dmcmahon@lightspeedsystems.com', 'kchiang@lightspeedsystems.com', 'cmccabe@lightspeedsystems.com'));
--> statement-breakpoint
UPDATE pips SET archived_by = NULL WHERE archived_by IN (SELECT id FROM users WHERE lower(email) IN ('bthomas@lightspeedsystems.com', 'korgeldinger@lightspeedsystems.com', 'dmcmahon@lightspeedsystems.com', 'kchiang@lightspeedsystems.com', 'cmccabe@lightspeedsystems.com'));
--> statement-breakpoint
UPDATE pips SET created_by = NULL WHERE created_by IN (SELECT id FROM users WHERE lower(email) IN ('bthomas@lightspeedsystems.com', 'korgeldinger@lightspeedsystems.com', 'dmcmahon@lightspeedsystems.com', 'kchiang@lightspeedsystems.com', 'cmccabe@lightspeedsystems.com'));
--> statement-breakpoint
DELETE FROM feedback_review_attempts WHERE user_id IN (SELECT id FROM users WHERE lower(email) IN ('bthomas@lightspeedsystems.com', 'korgeldinger@lightspeedsystems.com', 'dmcmahon@lightspeedsystems.com', 'kchiang@lightspeedsystems.com', 'cmccabe@lightspeedsystems.com'));
--> statement-breakpoint
DELETE FROM feedback WHERE user_id IN (SELECT id FROM users WHERE lower(email) IN ('bthomas@lightspeedsystems.com', 'korgeldinger@lightspeedsystems.com', 'dmcmahon@lightspeedsystems.com', 'kchiang@lightspeedsystems.com', 'cmccabe@lightspeedsystems.com'));
--> statement-breakpoint
DELETE FROM users WHERE lower(email) IN ('bthomas@lightspeedsystems.com', 'korgeldinger@lightspeedsystems.com', 'dmcmahon@lightspeedsystems.com', 'kchiang@lightspeedsystems.com', 'cmccabe@lightspeedsystems.com');
--> statement-breakpoint
UPDATE users SET is_active = true, updated_at = now() WHERE lower(email) IN ('brian.thomas@lightspeedsystems.com', 'kirk.orgeldinger@lightspeedsystems.com', 'donal.mcmahon@lightspeedsystems.com', 'kevin.chiang@lightspeedsystems.com', 'colin.mccabe@lightspeedsystems.com');

-- 0063 Remove the one old-seed duplicate that migration 0044 missed:
-- 'whellems-moody@lightspeedsystems.com' (William Hellems-Moody, first-generation
-- 0004 seed). The official org-chart row 'william.hellemsmoody@lightspeedsystems.com'
-- (0023-0025, MIS / Systems Administrator / reports to Patrick Chapa) is the keeper;
-- this bare duplicate showed up twice in the Departments/Employees directory.
-- 0044 cleaned the other 53 old-seed rows but omitted this single email.
-- FK-safe + idempotent, mirroring 0044: clear restrict-only / notNull references
-- FIRST, then delete. Re-running deletes nothing.
UPDATE system_jobs      SET initiated_by = NULL WHERE initiated_by IN (SELECT id FROM users WHERE lower(email) = 'whellems-moody@lightspeedsystems.com');
--> statement-breakpoint
UPDATE backup_log       SET initiated_by = NULL WHERE initiated_by IN (SELECT id FROM users WHERE lower(email) = 'whellems-moody@lightspeedsystems.com');
--> statement-breakpoint
UPDATE onboarding_videos SET created_by  = NULL WHERE created_by  IN (SELECT id FROM users WHERE lower(email) = 'whellems-moody@lightspeedsystems.com');
--> statement-breakpoint
UPDATE feedback         SET resolved_by  = NULL WHERE resolved_by  IN (SELECT id FROM users WHERE lower(email) = 'whellems-moody@lightspeedsystems.com');
--> statement-breakpoint
UPDATE prompt_templates SET created_by   = NULL WHERE created_by   IN (SELECT id FROM users WHERE lower(email) = 'whellems-moody@lightspeedsystems.com');
--> statement-breakpoint
UPDATE faq_entries      SET created_by   = NULL WHERE created_by   IN (SELECT id FROM users WHERE lower(email) = 'whellems-moody@lightspeedsystems.com');
--> statement-breakpoint
UPDATE chat_attachments SET user_id      = NULL WHERE user_id      IN (SELECT id FROM users WHERE lower(email) = 'whellems-moody@lightspeedsystems.com');
--> statement-breakpoint
UPDATE user_activity_log SET user_id     = NULL WHERE user_id      IN (SELECT id FROM users WHERE lower(email) = 'whellems-moody@lightspeedsystems.com');
--> statement-breakpoint
UPDATE chat_debug_log   SET user_id      = NULL WHERE user_id      IN (SELECT id FROM users WHERE lower(email) = 'whellems-moody@lightspeedsystems.com');
--> statement-breakpoint
UPDATE chat_session_logs SET user_id     = NULL WHERE user_id      IN (SELECT id FROM users WHERE lower(email) = 'whellems-moody@lightspeedsystems.com');
--> statement-breakpoint
UPDATE app_settings     SET updated_by   = NULL WHERE updated_by   IN (SELECT id FROM users WHERE lower(email) = 'whellems-moody@lightspeedsystems.com');
--> statement-breakpoint
UPDATE pips             SET archived_by  = NULL WHERE archived_by  IN (SELECT id FROM users WHERE lower(email) = 'whellems-moody@lightspeedsystems.com');
--> statement-breakpoint
UPDATE pips             SET created_by   = NULL WHERE created_by   IN (SELECT id FROM users WHERE lower(email) = 'whellems-moody@lightspeedsystems.com');
--> statement-breakpoint
DELETE FROM feedback_review_attempts WHERE user_id IN (SELECT id FROM users WHERE lower(email) = 'whellems-moody@lightspeedsystems.com');
--> statement-breakpoint
DELETE FROM feedback WHERE user_id IN (SELECT id FROM users WHERE lower(email) = 'whellems-moody@lightspeedsystems.com');
--> statement-breakpoint
DELETE FROM users WHERE lower(email) = 'whellems-moody@lightspeedsystems.com';

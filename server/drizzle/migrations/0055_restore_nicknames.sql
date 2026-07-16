-- 0055_restore_nicknames.sql
-- Display-name preference: show these 14 people by the nickname / short name
-- their original (0004) seed used, rather than the formal org-chart name from
-- 0023. Keyed by the stable chart email; idempotent. NOTE: this intentionally
-- makes these 14 display names differ from the uploaded org chart's formal
-- names (PM preference). 'Wes Lawrence' <- 'Kevin Lawrence' is the one genuine
-- first-name change (same person/role); revert that one row if it's wrong.
UPDATE users SET name = 'Kathy Williamson', updated_at = now() WHERE lower(email) = 'katherine.williamson@lightspeedsystems.com';
--> statement-breakpoint
UPDATE users SET name = 'Mike Durando', updated_at = now() WHERE lower(email) = 'michael.durando@lightspeedsystems.com';
--> statement-breakpoint
UPDATE users SET name = 'Becky Gould', updated_at = now() WHERE lower(email) = 'rebecca.gould@lightspeedsystems.com';
--> statement-breakpoint
UPDATE users SET name = 'Chris Dunn', updated_at = now() WHERE lower(email) = 'christopher.dunn@lightspeedsystems.com';
--> statement-breakpoint
UPDATE users SET name = 'Alex Hesse', updated_at = now() WHERE lower(email) = 'alexander.hesse@lightspeedsystems.com';
--> statement-breakpoint
UPDATE users SET name = 'Brad White', updated_at = now() WHERE lower(email) = 'bradley.white@lightspeedsystems.com';
--> statement-breakpoint
UPDATE users SET name = 'Kate McDermott', updated_at = now() WHERE lower(email) = 'caitlin.mcdermott@lightspeedsystems.com';
--> statement-breakpoint
UPDATE users SET name = 'Maddie Stewart', updated_at = now() WHERE lower(email) = 'madelyne.stewart@lightspeedsystems.com';
--> statement-breakpoint
UPDATE users SET name = 'Niki Greig', updated_at = now() WHERE lower(email) = 'nicole.greig@lightspeedsystems.com';
--> statement-breakpoint
UPDATE users SET name = 'Syed Gillani', updated_at = now() WHERE lower(email) = 'syed.muhammad.hassaan.gillani@lightspeedsystems.com';
--> statement-breakpoint
UPDATE users SET name = 'Michelle McGovern', updated_at = now() WHERE lower(email) = 'michelle.mcgovern@lightspeedsystems.com';
--> statement-breakpoint
UPDATE users SET name = 'Lauren McNair', updated_at = now() WHERE lower(email) = 'lauren.mcnair@lightspeedsystems.com';
--> statement-breakpoint
UPDATE users SET name = 'Jake de la Garrigue', updated_at = now() WHERE lower(email) = 'jake.de.la.garrigue@lightspeedsystems.com';
--> statement-breakpoint
UPDATE users SET name = 'Wes Lawrence', updated_at = now() WHERE lower(email) = 'kevin.lawrence@lightspeedsystems.com';

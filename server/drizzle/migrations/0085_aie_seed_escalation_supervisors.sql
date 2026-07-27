-- AIE 2026-07-27 — populate the escalation chain from the HR export.
-- UPDATE-only, keyed by canonical email; each level resolves the supervisor
-- name to a directory user id (NULL if not found). Idempotent.

UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "tertiary_manager_id" = NULL,
  "quaternary_manager_id" = NULL,
  "updated_at" = now()
WHERE lower("email") = lower('john.genter@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Ryan Bond') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Robert Mcmillan') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('jason.isaac@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Robert Mcmillan') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "quaternary_manager_id" = NULL,
  "updated_at" = now()
WHERE lower("email") = lower('brock.meadors@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "tertiary_manager_id" = NULL,
  "quaternary_manager_id" = NULL,
  "updated_at" = now()
WHERE lower("email") = lower('kenneth.chitwood@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Robert Mcmillan') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "quaternary_manager_id" = NULL,
  "updated_at" = now()
WHERE lower("email") = lower('bryan.anderson@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "tertiary_manager_id" = NULL,
  "quaternary_manager_id" = NULL,
  "updated_at" = now()
WHERE lower("email") = lower('ryan.bond@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Ryan Bond') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Robert Mcmillan') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('mitchell.laurren-ring@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Robert Mcmillan') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "quaternary_manager_id" = NULL,
  "updated_at" = now()
WHERE lower("email") = lower('preston.matheson@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Robert Mcmillan') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "quaternary_manager_id" = NULL,
  "updated_at" = now()
WHERE lower("email") = lower('andrew.hecht@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Ryan Bond') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Robert Mcmillan') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('robert.bruce@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Robert Mcmillan') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "quaternary_manager_id" = NULL,
  "updated_at" = now()
WHERE lower("email") = lower('kevin.lasher@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Robert Mcmillan') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "quaternary_manager_id" = NULL,
  "updated_at" = now()
WHERE lower("email") = lower('perry.sittser@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Ryan Bond') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Robert Mcmillan') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('eric.cruz@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Ryan Bond') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Robert Mcmillan') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('jack.mcdonnell@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Ryan Bond') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Robert Mcmillan') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('van.mualcin@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Robert Mcmillan') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "quaternary_manager_id" = NULL,
  "updated_at" = now()
WHERE lower("email") = lower('carl.ahlstrand@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Ryan Bond') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Robert Mcmillan') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('steven.landwehr@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Robert Mcmillan') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "quaternary_manager_id" = NULL,
  "updated_at" = now()
WHERE lower("email") = lower('alex.wade@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Ryan Bond') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Robert Mcmillan') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('neil.shaw@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Ryan Bond') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Robert Mcmillan') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('nathan.johnson@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Ryan Bond') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Robert Mcmillan') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('wengel.huluka@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "tertiary_manager_id" = NULL,
  "quaternary_manager_id" = NULL,
  "updated_at" = now()
WHERE lower("email") = lower('jai.pandu@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Robert Mcmillan') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "quaternary_manager_id" = NULL,
  "updated_at" = now()
WHERE lower("email") = lower('gerard.jr.dantel@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Robert Mcmillan') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "quaternary_manager_id" = NULL,
  "updated_at" = now()
WHERE lower("email") = lower('aiyana.mathew@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Ryan Bond') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Robert Mcmillan') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('justin.woolverton@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Jennifer Duer') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Robert Mcmillan') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('bryan.steele@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Robert Mcmillan') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "quaternary_manager_id" = NULL,
  "updated_at" = now()
WHERE lower("email") = lower('winter.rhoden@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Jared Accardo') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Robert Mcmillan') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('alexander.woods@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Robert Mcmillan') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "quaternary_manager_id" = NULL,
  "updated_at" = now()
WHERE lower("email") = lower('michael.waszazak@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Robert Mcmillan') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "quaternary_manager_id" = NULL,
  "updated_at" = now()
WHERE lower("email") = lower('vernie.ogden@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Robert Mcmillan') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "quaternary_manager_id" = NULL,
  "updated_at" = now()
WHERE lower("email") = lower('rebecca.gould@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Jennifer Duer') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Robert Mcmillan') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('hadley.james@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Robert Mcmillan') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "quaternary_manager_id" = NULL,
  "updated_at" = now()
WHERE lower("email") = lower('matthew.burg@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Robert Mcmillan') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "quaternary_manager_id" = NULL,
  "updated_at" = now()
WHERE lower("email") = lower('caitlin.mcdermott@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Robert Mcmillan') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "quaternary_manager_id" = NULL,
  "updated_at" = now()
WHERE lower("email") = lower('derek.laurie@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Product [Vacant]-Vp') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Robert Mcmillan') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('jared.varner@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "tertiary_manager_id" = NULL,
  "quaternary_manager_id" = NULL,
  "updated_at" = now()
WHERE lower("email") = lower('jennifer.duer@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Robert Mcmillan') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "quaternary_manager_id" = NULL,
  "updated_at" = now()
WHERE lower("email") = lower('gregory.artzt@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Jennifer Duer') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Robert Mcmillan') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('alexander.szabo@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Robert Mcmillan') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "quaternary_manager_id" = NULL,
  "updated_at" = now()
WHERE lower("email") = lower('michelle.mcgovern@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Ken Chitwood') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Robert Mcmillan') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('christian.trahan@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Robert Mcmillan') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "quaternary_manager_id" = NULL,
  "updated_at" = now()
WHERE lower("email") = lower('brian.truong@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Ken Chitwood') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Robert Mcmillan') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('niels.dhollander-barclay@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Ken Chitwood') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Robert Mcmillan') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('alexander.doria@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Jared Accardo') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Robert Mcmillan') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('brandon.jones@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Robert Mcmillan') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "quaternary_manager_id" = NULL,
  "updated_at" = now()
WHERE lower("email") = lower('jeffrey.smith@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "tertiary_manager_id" = NULL,
  "quaternary_manager_id" = NULL,
  "updated_at" = now()
WHERE lower("email") = lower('jared.accardo@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Jared Accardo') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Robert Mcmillan') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('trung.pham@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Jared Accardo') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Robert Mcmillan') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('nicholas.chambers@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Jared Accardo') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Robert Mcmillan') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('andrew.cribari@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Jared Accardo') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Robert Mcmillan') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('charushila.awhad@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Jared Accardo') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Robert Mcmillan') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('gijo.johny@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Jared Accardo') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Robert Mcmillan') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('madhuri.balasubramanya@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Jared Accardo') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Robert Mcmillan') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('jeffrey.zwick@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Jared Accardo') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Robert Mcmillan') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('jenisha.karmacharya@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Jared Accardo') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Robert Mcmillan') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('michelle.vargas@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Jared Accardo') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Robert Mcmillan') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('kyle.escobar@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Jared Accardo') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Robert Mcmillan') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('ava.friloux@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Robert Mcmillan') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "quaternary_manager_id" = NULL,
  "updated_at" = now()
WHERE lower("email") = lower('leigh.morris@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Rob Mccartney') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Wes Lawrence') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Kirk Orgeldinger') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('enrique.michel@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Rob Mccartney') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Wes Lawrence') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Kirk Orgeldinger') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('juan.rodriguez.maldonado@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Rob Mccartney') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Wes Lawrence') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Kirk Orgeldinger') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('chasity.lyson@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Rob Mccartney') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Wes Lawrence') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Kirk Orgeldinger') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('marie.wittry@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Rob Mccartney') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Wes Lawrence') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Kirk Orgeldinger') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('wing.mar@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Rob Mccartney') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Wes Lawrence') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Kirk Orgeldinger') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('abraham.ybarra@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Wes Lawrence') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Kirk Orgeldinger') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('alyssa.ann.silva@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Rob Mccartney') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Wes Lawrence') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Kirk Orgeldinger') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('saul.trejo@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Rob Mccartney') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Wes Lawrence') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Kirk Orgeldinger') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('cameron.meyer@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Rob Mccartney') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Wes Lawrence') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Kirk Orgeldinger') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('dylan.claiborne@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Wes Lawrence') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Kirk Orgeldinger') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('travis.bullock@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Rob Mccartney') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Wes Lawrence') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Kirk Orgeldinger') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('frank.romero@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Rob Mccartney') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Wes Lawrence') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Kirk Orgeldinger') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('katy.shawcross@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Rob Mccartney') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Wes Lawrence') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Kirk Orgeldinger') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('syed.muhammad.hassaan.gillani@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Wes Lawrence') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Kirk Orgeldinger') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('andy.bennetta@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Rob Mccartney') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Wes Lawrence') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Kirk Orgeldinger') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('jide.oke@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Rob Mccartney') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Wes Lawrence') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Kirk Orgeldinger') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('khaled.uddin@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Rob Mccartney') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Wes Lawrence') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Kirk Orgeldinger') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('lewis.brown@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Rob Mccartney') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Wes Lawrence') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Kirk Orgeldinger') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('tu.ngo@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brock Anderson') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Wes Lawrence') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Kirk Orgeldinger') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('jason.veselka@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brock Anderson') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Wes Lawrence') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Kirk Orgeldinger') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('sinead.williams@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Wes Lawrence') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Kirk Orgeldinger') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('december.wilks@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brock Anderson') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Wes Lawrence') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Kirk Orgeldinger') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('colleen.clark@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brock Anderson') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Wes Lawrence') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Kirk Orgeldinger') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('whitney.veatch@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brock Anderson') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Wes Lawrence') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Kirk Orgeldinger') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('angela.mazza@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brock Anderson') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Wes Lawrence') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Kirk Orgeldinger') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('christina.mares@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brock Anderson') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Wes Lawrence') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Kirk Orgeldinger') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('nykayla.carter@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brock Anderson') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Wes Lawrence') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Kirk Orgeldinger') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('shanna.johnson@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brock Anderson') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Wes Lawrence') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Kirk Orgeldinger') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('danielle.rubio@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brock Anderson') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Wes Lawrence') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Kirk Orgeldinger') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('cristal.cuellar@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brock Anderson') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Wes Lawrence') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Kirk Orgeldinger') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('nathan.davila@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brock Anderson') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Wes Lawrence') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Kirk Orgeldinger') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('jolie.boodansingh@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brock Anderson') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Wes Lawrence') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Kirk Orgeldinger') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('lydell.craig@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Wes Lawrence') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Kirk Orgeldinger') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('tracy.craig@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brock Anderson') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Wes Lawrence') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Kirk Orgeldinger') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('jerry.flores@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brock Anderson') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Wes Lawrence') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Kirk Orgeldinger') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('jason.montes@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brock Anderson') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Wes Lawrence') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Kirk Orgeldinger') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('zakkiyya.purnell@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brock Anderson') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Wes Lawrence') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Kirk Orgeldinger') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('katelin.revels@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brock Anderson') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Wes Lawrence') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Kirk Orgeldinger') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('shakira.romero@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brock Anderson') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Wes Lawrence') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Kirk Orgeldinger') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('kurstye.tillmon@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brock Anderson') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Wes Lawrence') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Kirk Orgeldinger') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('armahn.turk@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brock Anderson') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Wes Lawrence') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Kirk Orgeldinger') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('tichiere.womble@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brock Anderson') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Wes Lawrence') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Kirk Orgeldinger') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('tameka.smith@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brock Anderson') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Wes Lawrence') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Kirk Orgeldinger') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('marlisa.mungo@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brock Anderson') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Wes Lawrence') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Kirk Orgeldinger') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('kian.curran@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brock Anderson') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Wes Lawrence') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Kirk Orgeldinger') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('danielle.adams@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brock Anderson') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Wes Lawrence') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Kirk Orgeldinger') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('albert.garcia@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brock Anderson') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Wes Lawrence') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Kirk Orgeldinger') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('rashida.brown@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brock Anderson') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Wes Lawrence') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Kirk Orgeldinger') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('nathan.estrada@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Wes Lawrence') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Kirk Orgeldinger') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('ricky.salter@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Jared Accardo') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Robert Mcmillan') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('chase.masiel@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Jared Accardo') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Robert Mcmillan') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('hailey.thomas@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Rob Mccartney') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Wes Lawrence') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Kirk Orgeldinger') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('ryan.stufflebeam@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Rob Mccartney') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Wes Lawrence') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Kirk Orgeldinger') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('ramy.sahouri@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Wes Lawrence') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Kirk Orgeldinger') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('wesley.cunningham@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Rob Mccartney') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Wes Lawrence') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Kirk Orgeldinger') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('quinten.oldaker@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Rob Mccartney') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Wes Lawrence') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Kirk Orgeldinger') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('christina.atkinson@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Rob Mccartney') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Wes Lawrence') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Kirk Orgeldinger') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('dante.munoz@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Robert Mcmillan') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "quaternary_manager_id" = NULL,
  "updated_at" = now()
WHERE lower("email") = lower('christopher.newkirk@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Robert Mcmillan') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "quaternary_manager_id" = NULL,
  "updated_at" = now()
WHERE lower("email") = lower('joseph.decarlo@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Robert Mcmillan') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "quaternary_manager_id" = NULL,
  "updated_at" = now()
WHERE lower("email") = lower('ryan.oglesby@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Robert Mcmillan') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "quaternary_manager_id" = NULL,
  "updated_at" = now()
WHERE lower("email") = lower('matthew.ames@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Robert Mcmillan') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "quaternary_manager_id" = NULL,
  "updated_at" = now()
WHERE lower("email") = lower('esteban.diocares@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Robert Mcmillan') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "quaternary_manager_id" = NULL,
  "updated_at" = now()
WHERE lower("email") = lower('anita.krueger@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "tertiary_manager_id" = NULL,
  "quaternary_manager_id" = NULL,
  "updated_at" = now()
WHERE lower("email") = lower('michael.durando@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "tertiary_manager_id" = NULL,
  "quaternary_manager_id" = NULL,
  "updated_at" = now()
WHERE lower("email") = lower('michael.boggess@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Christopher Travis') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "quaternary_manager_id" = NULL,
  "updated_at" = now()
WHERE lower("email") = lower('scott.meeks@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Christopher Travis') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "quaternary_manager_id" = NULL,
  "updated_at" = now()
WHERE lower("email") = lower('sergio.villegas@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Christopher Travis') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "quaternary_manager_id" = NULL,
  "updated_at" = now()
WHERE lower("email") = lower('alecia.boggess@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Christopher Travis') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "quaternary_manager_id" = NULL,
  "updated_at" = now()
WHERE lower("email") = lower('ross.mcaden@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Christopher Travis') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "quaternary_manager_id" = NULL,
  "updated_at" = now()
WHERE lower("email") = lower('keaton.smith@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Christopher Travis') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "quaternary_manager_id" = NULL,
  "updated_at" = now()
WHERE lower("email") = lower('jake.de.la.garrigue@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Christopher Travis') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "quaternary_manager_id" = NULL,
  "updated_at" = now()
WHERE lower("email") = lower('michael.roddey@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Christopher Travis') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "quaternary_manager_id" = NULL,
  "updated_at" = now()
WHERE lower("email") = lower('christopher.dunn@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Christopher Travis') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "quaternary_manager_id" = NULL,
  "updated_at" = now()
WHERE lower("email") = lower('casey.butera@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Wes Lawrence') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Kirk Orgeldinger') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('brooke.brown@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "tertiary_manager_id" = NULL,
  "quaternary_manager_id" = NULL,
  "updated_at" = now()
WHERE lower("email") = lower('kevin.askew@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Christopher Travis') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "quaternary_manager_id" = NULL,
  "updated_at" = now()
WHERE lower("email") = lower('nicholas.zema@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Christopher Travis') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "quaternary_manager_id" = NULL,
  "updated_at" = now()
WHERE lower("email") = lower('erika.johnson@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Christopher Travis') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "quaternary_manager_id" = NULL,
  "updated_at" = now()
WHERE lower("email") = lower('ann.marie.martinez@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Christopher Travis') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "quaternary_manager_id" = NULL,
  "updated_at" = now()
WHERE lower("email") = lower('spencer.smith@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Christopher Travis') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "quaternary_manager_id" = NULL,
  "updated_at" = now()
WHERE lower("email") = lower('andrew.fowler@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Christopher Travis') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "quaternary_manager_id" = NULL,
  "updated_at" = now()
WHERE lower("email") = lower('lauren.mcnair@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Christopher Travis') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "quaternary_manager_id" = NULL,
  "updated_at" = now()
WHERE lower("email") = lower('tania.mackie@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Colin Mccabe') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Christopher Travis') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('sam.howard@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Christopher Travis') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "quaternary_manager_id" = NULL,
  "updated_at" = now()
WHERE lower("email") = lower('nicole.greig@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Christopher Travis') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "quaternary_manager_id" = NULL,
  "updated_at" = now()
WHERE lower("email") = lower('jaeden.richards@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Wes Lawrence') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Kirk Orgeldinger') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('nicole.tribo@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Colin Mccabe') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Christopher Travis') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('christopher.spink@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "tertiary_manager_id" = NULL,
  "quaternary_manager_id" = NULL,
  "updated_at" = now()
WHERE lower("email") = lower('colin.mccabe@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Colin Mccabe') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Christopher Travis') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('harry.saunders@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Christopher Travis') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "quaternary_manager_id" = NULL,
  "updated_at" = now()
WHERE lower("email") = lower('kiah.long@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Christopher Travis') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "quaternary_manager_id" = NULL,
  "updated_at" = now()
WHERE lower("email") = lower('shaun.phillips@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Wes Lawrence') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Kirk Orgeldinger') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('william.long@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Rob Mccartney') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Wes Lawrence') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Kirk Orgeldinger') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('trevor.davis@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Rob Mccartney') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Wes Lawrence') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Kirk Orgeldinger') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('matthew.nelson@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Rob Mccartney') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Wes Lawrence') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Kirk Orgeldinger') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('robert.hancock@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Rob Mccartney') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Wes Lawrence') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Kirk Orgeldinger') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('austin.sweet@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Wes Lawrence') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Kirk Orgeldinger') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('bradley.rowe@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Rob Mccartney') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Wes Lawrence') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Kirk Orgeldinger') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('daniel.dunn@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Rob Mccartney') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Wes Lawrence') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Kirk Orgeldinger') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('alexander.crouse@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Rob Mccartney') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Wes Lawrence') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Kirk Orgeldinger') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('alexander.sands@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Wes Lawrence') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Kirk Orgeldinger') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('charles.bryant@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Wes Lawrence') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Kirk Orgeldinger') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('shad.mcgaha@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Rob Mccartney') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Wes Lawrence') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Kirk Orgeldinger') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('colin.fulton@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Rob Mccartney') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Wes Lawrence') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Kirk Orgeldinger') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('joel.walmsley@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Wes Lawrence') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Kirk Orgeldinger') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('richard.chown@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Wes Lawrence') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Kirk Orgeldinger') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('krista.delk@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Kirk Orgeldinger') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "quaternary_manager_id" = NULL,
  "updated_at" = now()
WHERE lower("email") = lower('teresa.reuter@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Wes Lawrence') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Kirk Orgeldinger') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('cindy.moore@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Wes Lawrence') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Kirk Orgeldinger') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('samantha.revels@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Kirk Orgeldinger') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "quaternary_manager_id" = NULL,
  "updated_at" = now()
WHERE lower("email") = lower('alyssa.russo@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Wes Lawrence') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Kirk Orgeldinger') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('casey.hann@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Kirk Orgeldinger') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "quaternary_manager_id" = NULL,
  "updated_at" = now()
WHERE lower("email") = lower('luke.shearin@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "tertiary_manager_id" = NULL,
  "quaternary_manager_id" = NULL,
  "updated_at" = now()
WHERE lower("email") = lower('amanda.gorena@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Amy Bennett') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "quaternary_manager_id" = NULL,
  "updated_at" = now()
WHERE lower("email") = lower('grace.mellette@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "tertiary_manager_id" = NULL,
  "quaternary_manager_id" = NULL,
  "updated_at" = now()
WHERE lower("email") = lower('marcos.suarez@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Amy Bennett') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "quaternary_manager_id" = NULL,
  "updated_at" = now()
WHERE lower("email") = lower('olivia.gibbons@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Amy Bennett') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "quaternary_manager_id" = NULL,
  "updated_at" = now()
WHERE lower("email") = lower('emma.stewart@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "tertiary_manager_id" = NULL,
  "quaternary_manager_id" = NULL,
  "updated_at" = now()
WHERE lower("email") = lower('liam.roberts@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Amy Bennett') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "quaternary_manager_id" = NULL,
  "updated_at" = now()
WHERE lower("email") = lower('megan.black@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "tertiary_manager_id" = NULL,
  "quaternary_manager_id" = NULL,
  "updated_at" = now()
WHERE lower("email") = lower('kyle.olson@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "tertiary_manager_id" = NULL,
  "quaternary_manager_id" = NULL,
  "updated_at" = now()
WHERE lower("email") = lower('madelyne.stewart@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "tertiary_manager_id" = NULL,
  "quaternary_manager_id" = NULL,
  "updated_at" = now()
WHERE lower("email") = lower('larissa.negreiros.somaio@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "tertiary_manager_id" = NULL,
  "quaternary_manager_id" = NULL,
  "updated_at" = now()
WHERE lower("email") = lower('jiana.khazma@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Kirk Orgeldinger') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "quaternary_manager_id" = NULL,
  "updated_at" = now()
WHERE lower("email") = lower('robert.mccartney@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "tertiary_manager_id" = NULL,
  "quaternary_manager_id" = NULL,
  "updated_at" = now()
WHERE lower("email") = lower('katherine.williamson@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "tertiary_manager_id" = NULL,
  "quaternary_manager_id" = NULL,
  "updated_at" = now()
WHERE lower("email") = lower('kevin.chiang@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "tertiary_manager_id" = NULL,
  "quaternary_manager_id" = NULL,
  "updated_at" = now()
WHERE lower("email") = lower('kevin.lawrence@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Kirk Orgeldinger') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "quaternary_manager_id" = NULL,
  "updated_at" = now()
WHERE lower("email") = lower('zachary.horn@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Kirk Orgeldinger') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "quaternary_manager_id" = NULL,
  "updated_at" = now()
WHERE lower("email") = lower('brock.anderson@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Kevin Chiang') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Kirk Orgeldinger') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('juliana.morris@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Wes Lawrence') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Kirk Orgeldinger') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('jonathan.adkins@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "tertiary_manager_id" = NULL,
  "quaternary_manager_id" = NULL,
  "updated_at" = now()
WHERE lower("email") = lower('steven.miller@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Greg Funk') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Kevin Chiang') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Kirk Orgeldinger') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('sabrina.drouin@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "tertiary_manager_id" = NULL,
  "quaternary_manager_id" = NULL,
  "updated_at" = now()
WHERE lower("email") = lower('ryan.passanisi@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Donal Mcmahon') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "quaternary_manager_id" = NULL,
  "updated_at" = now()
WHERE lower("email") = lower('benjamin.thomas@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Kirk Orgeldinger') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "quaternary_manager_id" = NULL,
  "updated_at" = now()
WHERE lower("email") = lower('jade.friedman@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Kirk Orgeldinger') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "quaternary_manager_id" = NULL,
  "updated_at" = now()
WHERE lower("email") = lower('brooke.friedman@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Kirk Orgeldinger') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "quaternary_manager_id" = NULL,
  "updated_at" = now()
WHERE lower("email") = lower('heather.james@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Wes Lawrence') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Kirk Orgeldinger') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('lillian.fox@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Wes Lawrence') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Kirk Orgeldinger') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('jody.parry@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Wes Lawrence') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Kirk Orgeldinger') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('lena.murray@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Kirk Orgeldinger') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "quaternary_manager_id" = NULL,
  "updated_at" = now()
WHERE lower("email") = lower('gregory.funk@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Greg Funk') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Kevin Chiang') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Kirk Orgeldinger') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('douglas.dietert@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Kirk Orgeldinger') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "quaternary_manager_id" = NULL,
  "updated_at" = now()
WHERE lower("email") = lower('scott.dunham@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Kevin Chiang') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Kirk Orgeldinger') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('adrienne.synos@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Greg Funk') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Kevin Chiang') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Kirk Orgeldinger') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('megan.duhon@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Kevin Chiang') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Kirk Orgeldinger') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('james.laprocido@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Kevin Chiang') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Kirk Orgeldinger') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('jake.bowman@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Greg Funk') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Kevin Chiang') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Kirk Orgeldinger') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('thayer.kacher@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Kevin Chiang') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Kirk Orgeldinger') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('dhillon.reddy@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Kirk Orgeldinger') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "quaternary_manager_id" = NULL,
  "updated_at" = now()
WHERE lower("email") = lower('patrick.chapa@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Wes Lawrence') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Kirk Orgeldinger') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('adrian.rios.alvarez@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Wes Lawrence') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Kirk Orgeldinger') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('alexander.hesse@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Wes Lawrence') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Kirk Orgeldinger') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('paul.chapa@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Wes Lawrence') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Kirk Orgeldinger') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('william.hellems-moody@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Robert Mcmillan') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "quaternary_manager_id" = NULL,
  "updated_at" = now()
WHERE lower("email") = lower('bradley.white@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Jai Pandu') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Robert Mcmillan') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('braedon.mulder@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "secondary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('John Genter') LIMIT 1),
  "tertiary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Robert Mcmillan') LIMIT 1),
  "quaternary_manager_id" = (SELECT id FROM "users" WHERE lower("name")=lower('Brian Thomas') LIMIT 1),
  "updated_at" = now()
WHERE lower("email") = lower('joseph.coffey@lightspeedsystems.com');

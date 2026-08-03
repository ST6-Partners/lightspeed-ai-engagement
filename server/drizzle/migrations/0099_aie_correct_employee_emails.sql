-- 0099 AIE 2026-07-30 — CORRECT the employee email addresses.
--
-- Migration 0023 (2026-07-07) loaded the official 225-person org chart from a
-- source that carried NO email column, so it SYNTHESIZED every address as
-- firstname.lastname@lightspeedsystems.com. Those addresses are wrong. This
-- migration replaces them with the real Work_Email values from the 2026-07-30
-- Advanced Report Writer HR export (225 rows).
--
-- KEY: the synthesized 0023 address, NOT the display name. Migration 0055
-- deliberately renamed 14 people to nicknames, so users.name has drifted from
-- the legal names this export carries; the synthesized address was derived from
-- those same legal names and is therefore the stable join. 223 of 225 export
-- rows resolve to a live directory record this way.
--
-- Emails are stored LOWERCASE. auth.login lowercases its input and does an
-- exact match (routers/auth.ts), so a mixed-case stored address would lock the
-- person out. Two export rows arrive mixed-case and are normalized here.
--
-- `sub` is intentionally NOT rewritten. It is an opaque stable identity marker;
-- nothing derives email from it at runtime, so changing it is risk with no gain.
--
-- PM decisions carried into this migration (Brooke Friedman, 2026-07-30):
--   * Brooke Friedman is EXCLUDED. She holds two records — bsf@st6partners.com
--     (her build login) and the 0023 org-chart row. Both are left untouched.
--   * Swetha Vardhineni and William Hecht appear in the export but were never
--     loaded into the directory. They are NOT added here.
--   * Bryan Steele and Joseph Coffey are in the directory but absent from the
--     export. They keep their current addresses; no statement targets them.
--
-- Idempotent: each UPDATE is keyed on the OLD address, so a second run matches
-- nothing. The NOT EXISTS guard makes a unique-violation on users.email
-- impossible even if a target address were somehow already taken, which would
-- otherwise abort migrate-on-boot for the whole app.

UPDATE "users" SET "email"='john@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='john.genter@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='john@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='jisaac@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='jason.isaac@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='jisaac@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='brock@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='brock.meadors@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='brock@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='ken@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='kenneth.chitwood@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='ken@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='banderson@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='bryan.anderson@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='banderson@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='ryan@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='ryan.bond@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='ryan@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='carson@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='robert.mcmillan@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='carson@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='mlaurren-ring@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='mitchell.laurrenring@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='mlaurren-ring@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='pmatheson@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='preston.matheson@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='pmatheson@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='ahecht@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='andrew.hecht@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='ahecht@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='rbruce@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='robert.bruce@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='rbruce@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='klasher@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='kevin.lasher@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='klasher@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='psittser@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='perry.sittser@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='psittser@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='ecruz@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='eric.cruz@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='ecruz@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='jmcdonnell@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='jack.mcdonnell@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='jmcdonnell@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='vmualcin@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='van.mualcin@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='vmualcin@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='cahlstrand@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='carl.ahlstrand@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='cahlstrand@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='slandwehr@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='steven.landwehr@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='slandwehr@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='awade@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='alex.wade@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='awade@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='nshaw@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='neil.shaw@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='nshaw@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='njohnson@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='nathan.johnson@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='njohnson@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='whuluka@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='wengel.huluka@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='whuluka@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='jpandu@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='jai.pandu@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='jpandu@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='gdantel@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='gerard.jr.dantel@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='gdantel@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='amathew@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='aiyana.mathew@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='amathew@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='jwoolverton@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='justin.woolverton@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='jwoolverton@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='winter.rhoden@lsscorp.net', "updated_at"=now()
WHERE lower("email")='winter.rhoden@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='winter.rhoden@lsscorp.net');
--> statement-breakpoint
UPDATE "users" SET "email"='awoods@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='alexander.woods@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='awoods@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='mwaszazak@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='michael.waszazak@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='mwaszazak@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='vernie@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='vernie.ogden@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='vernie@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='bgould@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='rebecca.gould@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='bgould@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='hadley.james@lsscorp.net', "updated_at"=now()
WHERE lower("email")='hadley.james@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='hadley.james@lsscorp.net');
--> statement-breakpoint
UPDATE "users" SET "email"='mburg@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='matthew.burg@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='mburg@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='kmcdermott@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='caitlin.mcdermott@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='kmcdermott@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='dlaurie@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='derek.laurie@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='dlaurie@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='jvarner@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='jared.varner@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='jvarner@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='jduer@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='jennifer.duer@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='jduer@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='gartzt@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='gregory.artzt@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='gartzt@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='aszabo@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='alexander.szabo@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='aszabo@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='mmcgovern@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='michelle.mcgovern@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='mmcgovern@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='christian@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='christian.trahan@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='christian@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='btruong@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='brian.truong@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='btruong@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='niels@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='niels.dhollanderbarclay@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='niels@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='adoria@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='alexander.doria@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='adoria@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='bjones@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='brandon.jones@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='bjones@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='jeff@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='jeffrey.smith@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='jeff@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='jaccardo@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='jared.accardo@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='jaccardo@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='tpham@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='trung.pham@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='tpham@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='nchambers@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='nicholas.chambers@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='nchambers@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='acribari@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='andrew.cribari@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='acribari@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='cawhad@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='charushila.awhad@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='cawhad@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='gjohny@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='gijo.johny@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='gjohny@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='madhuri@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='madhuri.balasubramanya@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='madhuri@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='jzwick@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='jeffrey.zwick@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='jzwick@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='jkarmacharya@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='jenisha.karmacharya@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='jkarmacharya@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='mvargas@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='michelle.vargas@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='mvargas@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='kescobar@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='kyle.escobar@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='kescobar@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='ava.friloux@lsscorp.net', "updated_at"=now()
WHERE lower("email")='ava.friloux@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='ava.friloux@lsscorp.net');
--> statement-breakpoint
UPDATE "users" SET "email"='lmorris@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='leigh.morris@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='lmorris@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='emichel@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='enrique.michel@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='emichel@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='jrodriguez@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='juan.rodriguez.maldonado@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='jrodriguez@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='clyson@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='chasity.lyson@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='clyson@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='mwittry@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='marie.wittry@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='mwittry@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='wing@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='wing.mar@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='wing@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='aybarra@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='abraham.ybarra@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='aybarra@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='asilva@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='alyssa.ann.silva@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='asilva@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='strejo@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='saul.trejo@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='strejo@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='cmeyer@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='cameron.meyer@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='cmeyer@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='dclaiborne@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='dylan.claiborne@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='dclaiborne@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='tbullock@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='travis.bullock@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='tbullock@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='fromero@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='frank.romero@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='fromero@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='kshawcross@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='katy.shawcross@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='kshawcross@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='sgillani@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='syed.muhammad.hassaan.gillani@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='sgillani@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='andyb@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='andy.bennetta@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='andyb@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='jide@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='jide.oke@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='jide@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='kuddin@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='khaled.uddin@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='kuddin@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='lbrown@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='lewis.brown@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='lbrown@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='tngo@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='tu.ngo@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='tngo@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='jveselka@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='jason.veselka@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='jveselka@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='swilliams@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='sinead.williams@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='swilliams@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='dwilks@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='december.wilks@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='dwilks@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='cclark@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='colleen.clark@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='cclark@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='wveatch@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='whitney.veatch@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='wveatch@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='amazza@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='angela.mazza@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='amazza@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='cmares@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='christina.mares@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='cmares@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='nikkic@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='nykayla.carter@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='nikkic@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='sjohnson@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='shanna.johnson@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='sjohnson@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='drubio@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='danielle.rubio@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='drubio@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='ccuellar@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='cristal.cuellar@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='ccuellar@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='ndavila@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='nathan.davila@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='ndavila@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='jboodansingh@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='jolie.boodansingh@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='jboodansingh@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='lcraig@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='lydell.craig@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='lcraig@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='tcraig@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='tracy.craig@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='tcraig@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='jflores@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='jerry.flores@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='jflores@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='jmontes@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='jason.montes@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='jmontes@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='zpurnell@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='zakkiyya.purnell@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='zpurnell@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='krevels@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='katelin.revels@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='krevels@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='sromero@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='shakira.romero@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='sromero@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='ktillmon@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='kurstye.tillmon@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='ktillmon@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='aturk@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='armahn.turk@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='aturk@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='twomble@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='tichiere.womble@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='twomble@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='tsmith@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='tameka.smith@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='tsmith@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='mmungo@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='marlisa.mungo@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='mmungo@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='kcurran@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='kian.curran@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='kcurran@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='dadams@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='danielle.adams@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='dadams@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='agarcia@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='albert.garcia@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='agarcia@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='rbrown@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='rashida.brown@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='rbrown@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='nestrada@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='nathan.estrada@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='nestrada@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='rsalter@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='ricky.salter@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='rsalter@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='cmasiel@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='chase.masiel@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='cmasiel@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='hthomas@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='hailey.thomas@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='hthomas@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='rstufflebeam@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='ryan.stufflebeam@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='rstufflebeam@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='rsahouri@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='ramy.sahouri@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='rsahouri@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='rcunningham@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='wesley.cunningham@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='rcunningham@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='qoldaker@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='quinten.oldaker@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='qoldaker@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='tatkinson@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='christina.atkinson@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='tatkinson@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='dmunoz@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='dante.munoz@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='dmunoz@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='chris@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='christopher.newkirk@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='chris@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='jdecarlo@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='joseph.decarlo@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='jdecarlo@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='roglesby@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='ryan.oglesby@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='roglesby@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='mames@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='matthew.ames@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='mames@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='ediocares@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='esteban.diocares@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='ediocares@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='akrueger@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='anita.krueger@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='akrueger@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='ctravis@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='christopher.travis@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='ctravis@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='mdurando@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='michael.durando@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='mdurando@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='michael@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='michael.boggess@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='michael@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='smeeks@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='scott.meeks@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='smeeks@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='svillegas@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='sergio.villegas@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='svillegas@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='aboggess@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='alecia.boggess@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='aboggess@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='rmcaden@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='ross.mcaden@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='rmcaden@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='ksmith@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='keaton.smith@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='ksmith@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='jdelagarrigue@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='jake.de.la.garrigue@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='jdelagarrigue@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='mroddey@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='michael.roddey@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='mroddey@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='cdunn@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='christopher.dunn@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='cdunn@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='cbutera@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='casey.butera@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='cbutera@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='bbrown@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='brooke.brown@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='bbrown@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='kaskew@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='kevin.askew@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='kaskew@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='nzema@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='nicholas.zema@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='nzema@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='ejohnson@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='erika.johnson@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='ejohnson@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='amartinez@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='ann.marie.martinez@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='amartinez@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='ssmith@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='spencer.smith@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='ssmith@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='afowler@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='andrew.fowler@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='afowler@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='lmcnair@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='lauren.mcnair@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='lmcnair@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='tmackie@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='tania.mackie@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='tmackie@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='showard@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='sam.howard@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='showard@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='ngreig@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='nicole.greig@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='ngreig@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='jrichards@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='jaeden.richards@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='jrichards@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='ntribo@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='nicole.tribo@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='ntribo@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='cspink@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='christopher.spink@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='cspink@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='cmccabe@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='colin.mccabe@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='cmccabe@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='hsaunders@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='harry.saunders@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='hsaunders@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='klong@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='kiah.long@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='klong@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='sphillips@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='shaun.phillips@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='sphillips@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='billy@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='william.long@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='billy@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='tdavis@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='trevor.davis@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='tdavis@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='mnelson@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='matthew.nelson@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='mnelson@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='dhancock@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='robert.hancock@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='dhancock@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='asweet@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='austin.sweet@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='asweet@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='browe@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='bradley.rowe@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='browe@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='ddunn@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='daniel.dunn@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='ddunn@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='acrouse@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='alexander.crouse@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='acrouse@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='asands@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='alexander.sands@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='asands@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='cbryant@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='charles.bryant@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='cbryant@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='smcgaha@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='shad.mcgaha@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='smcgaha@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='cfulton@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='colin.fulton@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='cfulton@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='jwalmsley@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='joel.walmsley@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='jwalmsley@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='rchown@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='richard.chown@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='rchown@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='kdelk@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='krista.delk@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='kdelk@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='treuter@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='teresa.reuter@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='treuter@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='cmoore@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='cindy.moore@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='cmoore@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='srevels@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='samantha.revels@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='srevels@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='arusso@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='alyssa.russo@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='arusso@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='chann@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='casey.hann@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='chann@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='lshearin@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='luke.shearin@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='lshearin@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='abennett@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='amy.bennett@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='abennett@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='mgorena@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='amanda.gorena@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='mgorena@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='gmellette@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='grace.mellette@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='gmellette@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='msuarez@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='marcos.suarez@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='msuarez@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='olivia.gibbons@lsscorp.net', "updated_at"=now()
WHERE lower("email")='olivia.gibbons@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='olivia.gibbons@lsscorp.net');
--> statement-breakpoint
UPDATE "users" SET "email"='emma.stewart@lsscorp.net', "updated_at"=now()
WHERE lower("email")='emma.stewart@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='emma.stewart@lsscorp.net');
--> statement-breakpoint
UPDATE "users" SET "email"='lroberts@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='liam.roberts@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='lroberts@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='mblack@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='megan.black@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='mblack@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='kolson@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='kyle.olson@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='kolson@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='mstewart@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='madelyne.stewart@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='mstewart@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='lsomaio@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='larissa.negreiros.somaio@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='lsomaio@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='jkhazma@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='jiana.khazma@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='jkhazma@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='korgeldinger@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='kirk.orgeldinger@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='korgeldinger@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='brian@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='brian.thomas@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='brian@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='rmccartney@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='robert.mccartney@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='rmccartney@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='kwilliamson@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='katherine.williamson@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='kwilliamson@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='kchiang@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='kevin.chiang@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='kchiang@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='wlawrence@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='kevin.lawrence@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='wlawrence@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='zhorn@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='zachary.horn@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='zhorn@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='brocka@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='brock.anderson@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='brocka@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='jmorris@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='juliana.morris@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='jmorris@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='dmcmahon@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='donal.mcmahon@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='dmcmahon@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='jadkins@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='jonathan.adkins@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='jadkins@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='stevenm@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='steven.miller@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='stevenm@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='sdrouin@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='sabrina.drouin@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='sdrouin@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='rpassanisi@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='ryan.passanisi@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='rpassanisi@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='ben.thomas@lsscorp.net', "updated_at"=now()
WHERE lower("email")='benjamin.thomas@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='ben.thomas@lsscorp.net');
--> statement-breakpoint
UPDATE "users" SET "email"='jade.friedman@lsscorp.net', "updated_at"=now()
WHERE lower("email")='jade.friedman@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='jade.friedman@lsscorp.net');
--> statement-breakpoint
UPDATE "users" SET "email"='hjames@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='heather.james@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='hjames@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='lillian.fox@lsscorp.net', "updated_at"=now()
WHERE lower("email")='lillian.fox@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='lillian.fox@lsscorp.net');
--> statement-breakpoint
UPDATE "users" SET "email"='jparry@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='jody.parry@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='jparry@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='lmurray@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='lena.murray@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='lmurray@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='gfunk@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='gregory.funk@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='gfunk@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='ddietert@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='douglas.dietert@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='ddietert@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='sdunham@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='scott.dunham@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='sdunham@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='asynos@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='adrienne.synos@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='asynos@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='mduhon@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='megan.duhon@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='mduhon@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='jlaprocido@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='james.laprocido@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='jlaprocido@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='jbowman@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='jake.bowman@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='jbowman@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='tkacher@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='thayer.kacher@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='tkacher@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='dhillon.reddy@lsscorp.net', "updated_at"=now()
WHERE lower("email")='dhillon.reddy@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='dhillon.reddy@lsscorp.net');
--> statement-breakpoint
UPDATE "users" SET "email"='patrick@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='patrick.chapa@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='patrick@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='aalvarez@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='adrian.rios.alvarez@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='aalvarez@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='ahesse@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='alexander.hesse@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='ahesse@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='paul.chapa@lsscorp.net', "updated_at"=now()
WHERE lower("email")='paul.chapa@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='paul.chapa@lsscorp.net');
--> statement-breakpoint
UPDATE "users" SET "email"='whellems-moody@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='william.hellemsmoody@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='whellems-moody@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='brad@lightspeedsystems.com', "updated_at"=now()
WHERE lower("email")='bradley.white@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='brad@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET "email"='braedon.mulder@lsscorp.net', "updated_at"=now()
WHERE lower("email")='braedon.mulder@lightspeedsystems.com'
  AND NOT EXISTS (SELECT 1 FROM "users" u2 WHERE lower(u2."email")='braedon.mulder@lsscorp.net');

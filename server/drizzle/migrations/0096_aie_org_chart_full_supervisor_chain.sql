-- AIE 2026-07-28 — org chart, corrected to use the FULL supervisor chain
-- (spreadsheet columns I–M: Reports_to_Position, Primary, Secondary, Tertiary,
-- Quaternary supervisor). Rule: a person's manager = their NEAREST NON-VACANT
-- supervisor. When the direct seat (col I/J) is a Vacant position, fall through
-- to Secondary (K) → Tertiary (L) → Quaternary (M). Manager resolved by HR
-- employee code → users.external_id (name-independent). Supersedes 0094 for the
-- two people whose direct seat is vacant: Matthew Burg & Gregory Artzt now sit
-- under Carson/Robert Mcmillan (CTO, A0QN). 224 managed, 1 root (Brian Thomas).
-- Idempotent. Then re-syncs user_managers to mirror the single manager.

UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0QN' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('John Genter');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0P6' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Jason Isaac');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0QD' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Brock Meadors');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0QN' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Kenneth Chitwood');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0QD' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Bryan Anderson');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0QN' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Ryan Bond');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0O2' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Robert Mcmillan');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0P6' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Mitchell Laurren-ring');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0QD' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Preston Matheson');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0QD' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Andrew Hecht');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0PO' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Robert Bruce');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0QD' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Kevin Lasher');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0QD' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Perry Sittser');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0PO' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Eric Cruz');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0PO' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Jack Mcdonnell');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0PO' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Van Mualcin');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0QD' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Carl Ahlstrand');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0PO' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Steven Landwehr');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0QD' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Alex Wade');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0P6' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Neil Shaw');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0P6' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Nathan Johnson');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0PO' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Wengel Huluka');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0QN' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Jai Pandu');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A111' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Gerard Jr Dantel');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A111' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Aiyana Mathew');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0PO' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Justin Woolverton');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0PU' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Bryan Steele');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0OT' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Winter Rhoden');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0OX' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Alexander Woods');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0ZZ' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Michael Waszazak');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0Q7' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Vernie Ogden');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0Q7' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Rebecca Gould');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0PU' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Hadley James');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0QN' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Matthew Burg');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0ZZ' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Caitlin Mcdermott');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0Q7' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Derek Laurie');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0U9' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Jared Varner');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0QN' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Jennifer Duer');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0QN' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Gregory Artzt');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0UC' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Alexander Szabo');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0Q7' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Michelle Mcgovern');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0VH' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Christian Trahan');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0P7' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Brian Truong');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0VH' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Niels Dhollander-barclay');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0VH' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Alexander Doria');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0UN' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Brandon Jones');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0Q7' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Jeffrey Smith');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0QN' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Jared Accardo');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0OX' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Trung Pham');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0SS' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Nicholas Chambers');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0SS' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Andrew Cribari');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0OX' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Charushila Awhad');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0OX' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Gijo Johny');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0RM' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Madhuri Balasubramanya');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0UN' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Jeffrey Zwick');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0OX' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Jenisha Karmacharya');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0RM' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Michelle Vargas');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0TE' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Kyle Escobar');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0OX' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Ava Friloux');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0Q7' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Leigh Morris');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0T7' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Enrique Michel');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A10T' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Juan Rodriguez Maldonado');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0T7' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Chasity Lyson');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A10T' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Marie Wittry');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A10T' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Wing Mar');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A10T' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Abraham Ybarra');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A11L' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Alyssa Ann Silva');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A10T' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Saul Trejo');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0T7' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Cameron Meyer');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A10T' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Dylan Claiborne');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0QJ' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Travis Bullock');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A10T' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Frank Romero');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A1CR' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Katy Shawcross');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A10T' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Syed Muhammad Hassaan Gillani');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0QJ' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Andy Bennetta');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A1CR' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Jide Oke');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A1CR' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Khaled Uddin');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A1CR' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Lewis Brown');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A10T' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Tu Ngo');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0VF' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Jason Veselka');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0VF' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Sinead Williams');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0Y0' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('December Wilks');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0VF' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Colleen Clark');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A11A' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Whitney Veatch');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0VF' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Angela Mazza');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0VF' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Christina Mares');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0VF' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Nykayla Carter');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0VF' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Shanna Johnson');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0VF' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Danielle Rubio');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0VF' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Cristal Cuellar');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0VF' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Nathan Davila');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A1FH' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Jolie Boodansingh');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A1FH' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Lydell Craig');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0Y0' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Tracy Craig');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A11A' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Jerry Flores');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A1FH' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Jason Montes');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0VF' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Zakkiyya Purnell');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0VF' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Katelin Revels');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0VF' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Shakira Romero');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0VF' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Kurstye Tillmon');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0VF' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Armahn Turk');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0VF' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Tichiere Womble');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A11A' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Tameka Smith');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A11A' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Marlisa Mungo');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A1FH' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Kian Curran');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0VF' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Danielle Adams');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A11A' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Albert Garcia');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A1FH' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Rashida Brown');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A1FH' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Nathan Estrada');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0Y0' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Ricky Salter');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0OX' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Chase Masiel');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0OX' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Hailey Thomas');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0T7' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Ryan Stufflebeam');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0T7' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Ramy Sahouri');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0QJ' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Wesley Cunningham');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0T7' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Quinten Oldaker');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0T7' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Christina Atkinson');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0T7' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Dante Munoz');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0P7' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Christopher Newkirk');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0P7' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Joseph Decarlo');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0P7' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Ryan Oglesby');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0P7' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Matthew Ames');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0P7' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Esteban Diocares');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0P7' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Anita Krueger');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0O2' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Christopher Travis');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0P8' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Michael Durando');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0P8' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Michael Boggess');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0Q5' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Scott Meeks');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0PM' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Sergio Villegas');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0PM' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Alecia Boggess');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0Q5' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Ross Mcaden');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0PM' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Keaton Smith');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0PM' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Jake De La Garrigue');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0PM' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Michael Roddey');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0Q5' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Christopher Dunn');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0Q5' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Casey Butera');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A112' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Brooke Brown');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0P8' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Kevin Askew');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A113' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Nicholas Zema');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A113' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Erika Johnson');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A113' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Ann Marie Martinez');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0Q5' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Spencer Smith');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0Q5' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Andrew Fowler');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0PM' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Lauren Mcnair');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A1D2' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Tania Mackie');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A1FN' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Sam Howard');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0Q5' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Nicole Greig');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0PM' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Jaeden Richards');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A112' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Nicole Tribo');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A1FN' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Christopher Spink');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0P8' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Colin Mccabe');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A1FN' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Harry Saunders');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A1D2' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Kiah Long');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A1D2' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Shaun Phillips');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0QJ' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('William Long');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A1AJ' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Trevor Davis');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A1C0' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Matthew Nelson');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A1AJ' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Robert Hancock');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A1C0' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Austin Sweet');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0QJ' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Bradley Rowe');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A1C0' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Daniel Dunn');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A1AJ' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Alexander Crouse');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A1C0' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Alexander Sands');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0QJ' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Charles Bryant');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0QJ' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Shad Mcgaha');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A1FG' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Colin Fulton');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A1FG' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Joel Walmsley');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0QJ' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Richard Chown');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A112' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Krista Delk');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0X6' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Teresa Reuter');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A112' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Cindy Moore');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A112' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Samantha Revels');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0X6' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Alyssa Russo');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A112' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Casey Hann');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0SL' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Luke Shearin');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0O2' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Amy Bennett');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0NV' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Amanda Gorena');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0SY' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Grace Mellette');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0NV' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Marcos Suarez');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0Y9' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Olivia Gibbons');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0Y9' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Emma Stewart');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0NV' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Liam Roberts');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A1DU' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Megan Black');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0NV' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Kyle Olson');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0NV' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Madelyne Stewart');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0NV' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Larissa Negreiros Somaio');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0NV' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Jiana Khazma');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0O2' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Kirk Orgeldinger');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=NULL, "updated_at"=now() WHERE lower("name")=lower('Brian Thomas');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0X6' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Robert Mccartney');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0NU' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Katherine Williamson');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0NU' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Kevin Chiang');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0NU' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Kevin Lawrence');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0X6' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Zachary Horn');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0X6' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Brock Anderson');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0NT' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Juliana Morris');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0O2' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Donal Mcmahon');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0Y0' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Jonathan Adkins');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A120' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Steven Miller');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A110' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Sabrina Drouin');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A120' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Ryan Passanisi');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A1B9' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Benjamin Thomas');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0X6' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Jade Friedman');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0X6' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Brooke Friedman');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0X6' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Heather James');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0O5' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Lillian Fox');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0O5' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Jody Parry');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0O5' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Lena Murray');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0SL' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Gregory Funk');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0V8' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Douglas Dietert');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0SL' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Scott Dunham');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0NT' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Adrienne Synos');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0V8' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Megan Duhon');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0UE' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('James Laprocido');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0UE' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Jake Bowman');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0V8' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Thayer Kacher');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0UE' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Dhillon Reddy');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0X6' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Patrick Chapa');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0PV' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Adrian Rios Alvarez');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0PV' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Alexander Hesse');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0PV' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Paul Chapa');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0PV' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('William Hellems-moody');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0OT' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Bradley White');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A11E' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Braedon Mulder');
--> statement-breakpoint
UPDATE "users" SET "manager_id"=(SELECT id FROM "users" WHERE "external_id"='A0QL' LIMIT 1), "updated_at"=now() WHERE lower("name")=lower('Joseph Coffey');
--> statement-breakpoint
DELETE FROM "user_managers";
--> statement-breakpoint
INSERT INTO "user_managers" ("user_id","manager_id") SELECT id, manager_id FROM "users" WHERE manager_id IS NOT NULL;

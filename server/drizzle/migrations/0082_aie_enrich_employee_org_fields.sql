-- AIE 2026-07-27 — enrich existing employees with Work Location, Business Unit,
-- Hire Date, and ELT Leader from the HR export. UPDATE-ONLY, keyed by the
-- canonical email already in the app (no INSERTs => cannot create duplicates).
-- Also (re)links department_id/job_title_id from the managed lookups. Idempotent.
-- Matched 219 of 225 existing employees. 6 unmatched (handled separately).

UPDATE "users" SET
  "location" = '12013 FITZHUGH ROAD',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2005, "hire_month" = 11, "hire_day" = 1,
  "elt_leader" = 'Carson Mcmillan',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Product Development') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('CISO') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('john.genter@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = 'Remote',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2007, "hire_month" = 6, "hire_day" = 4,
  "elt_leader" = 'Carson Mcmillan',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Product Development') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Staff Software Engineer') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('jason.isaac@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = 'Remote',
  "business_unit" = 'Lightspeed',
  "hire_year" = 1999, "hire_month" = 8, "hire_day" = 30,
  "elt_leader" = 'Carson Mcmillan',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Product Development') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Senior Engineering Manager') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('brock.meadors@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = 'Remote',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2007, "hire_month" = 4, "hire_day" = 9,
  "elt_leader" = 'Carson Mcmillan',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Product Development') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Director Site Reliability') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('kenneth.chitwood@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = 'Remote',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2019, "hire_month" = 5, "hire_day" = 9,
  "elt_leader" = 'Carson Mcmillan',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Product Development') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Senior Engineering Manager') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('bryan.anderson@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = '12013 FITZHUGH ROAD',
  "business_unit" = 'Lightspeed',
  "hire_year" = 1999, "hire_month" = 7, "hire_day" = 1,
  "elt_leader" = 'Carson Mcmillan',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Product Development') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('VP Engineering') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('ryan.bond@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = '12013 FITZHUGH ROAD',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2001, "hire_month" = 8, "hire_day" = 13,
  "elt_leader" = 'Brian Thomas',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Product Development') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Chief Technology Officer') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('robert.mcmillan@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = 'Remote',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2018, "hire_month" = 5, "hire_day" = 29,
  "elt_leader" = 'Carson Mcmillan',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Product Development') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Staff Software Engineer') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('mitchell.laurrenring@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = 'Remote',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2019, "hire_month" = 2, "hire_day" = 15,
  "elt_leader" = 'Carson Mcmillan',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Product Development') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Lead Software Engineer') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('preston.matheson@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = 'Remote',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2008, "hire_month" = 11, "hire_day" = 4,
  "elt_leader" = 'Carson Mcmillan',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Product Development') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Solutions Architect') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('andrew.hecht@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = 'Remote',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2019, "hire_month" = 5, "hire_day" = 6,
  "elt_leader" = 'Carson Mcmillan',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Product Development') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Lead Software Engineer') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('robert.bruce@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = 'Remote',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2021, "hire_month" = 6, "hire_day" = 14,
  "elt_leader" = 'Carson Mcmillan',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Product Development') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Senior Front-End Engineer') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('kevin.lasher@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = 'Remote',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2021, "hire_month" = 7, "hire_day" = 6,
  "elt_leader" = 'Carson Mcmillan',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Product Development') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Lead Software Engineer') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('perry.sittser@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = '12013 FITZHUGH ROAD',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2021, "hire_month" = 8, "hire_day" = 2,
  "elt_leader" = 'Carson Mcmillan',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Product Development') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Software Engineer') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('eric.cruz@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = 'Remote',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2021, "hire_month" = 10, "hire_day" = 11,
  "elt_leader" = 'Carson Mcmillan',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Product Development') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Software Engineer') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('jack.mcdonnell@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = 'Remote',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2021, "hire_month" = 11, "hire_day" = 22,
  "elt_leader" = 'Carson Mcmillan',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Product Development') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Lead Senior Software Engineer') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('van.mualcin@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = 'Remote',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2022, "hire_month" = 2, "hire_day" = 28,
  "elt_leader" = 'Carson Mcmillan',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Product Development') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Lead Software Engineer') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('carl.ahlstrand@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = 'Remote',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2022, "hire_month" = 3, "hire_day" = 14,
  "elt_leader" = 'Carson Mcmillan',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Product Development') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Senior Software Engineer') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('steven.landwehr@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = 'Remote',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2022, "hire_month" = 4, "hire_day" = 4,
  "elt_leader" = 'Carson Mcmillan',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Product Development') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Staff Frontend Engineer') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('alex.wade@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = 'Remote',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2022, "hire_month" = 7, "hire_day" = 11,
  "elt_leader" = 'Carson Mcmillan',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Product Development') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Senior Software Engineer') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('neil.shaw@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = 'Remote',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2023, "hire_month" = 4, "hire_day" = 3,
  "elt_leader" = 'Carson Mcmillan',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Product Development') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Senior Staff Software Engineer') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('nathan.johnson@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = 'Remote',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2024, "hire_month" = 2, "hire_day" = 26,
  "elt_leader" = 'Carson Mcmillan',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Product Development') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Front-End Engineer') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('wengel.huluka@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = 'Remote',
  "business_unit" = 'STOPit Solutions',
  "hire_year" = 2025, "hire_month" = 3, "hire_day" = 1,
  "elt_leader" = 'Carson Mcmillan',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Product Development') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('VP Engineering') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('jai.pandu@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = 'Remote',
  "business_unit" = 'STOPit Solutions',
  "hire_year" = 2025, "hire_month" = 3, "hire_day" = 1,
  "elt_leader" = 'Carson Mcmillan',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Product Development') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Senior Director Engineering') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('gerard.jr.dantel@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = 'Remote',
  "business_unit" = 'STOPit Solutions',
  "hire_year" = 2025, "hire_month" = 3, "hire_day" = 1,
  "elt_leader" = 'Carson Mcmillan',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Product Development') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Lead Senior Software Engineer') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('aiyana.mathew@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = '12013 FITZHUGH ROAD',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2025, "hire_month" = 5, "hire_day" = 20,
  "elt_leader" = 'Carson Mcmillan',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Product Development') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Lead Software Engineer') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('justin.woolverton@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = 'Remote',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2026, "hire_month" = 5, "hire_day" = 26,
  "elt_leader" = 'Jennifer Duer',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Product Development') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Intern') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('bryan.steele@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = '12013 FITZHUGH ROAD',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2026, "hire_month" = 5, "hire_day" = 26,
  "elt_leader" = 'Carson Mcmillan',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Product Development') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Intern') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('winter.rhoden@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = '12013 FITZHUGH ROAD',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2015, "hire_month" = 8, "hire_day" = 3,
  "elt_leader" = 'Carson Mcmillan',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Product Management') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Associate Technical Product Manager') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('alexander.woods@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = 'Remote',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2019, "hire_month" = 1, "hire_day" = 11,
  "elt_leader" = 'Jennifer Duer',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Product Management') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Manager Product Design') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('michael.waszazak@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = '12013 FITZHUGH ROAD',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2012, "hire_month" = 10, "hire_day" = 22,
  "elt_leader" = 'Carson Mcmillan',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Product Management') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Technical Product Manager') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('vernie.ogden@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = '12013 FITZHUGH ROAD',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2020, "hire_month" = 7, "hire_day" = 27,
  "elt_leader" = 'Carson Mcmillan',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Product Management') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Principal Technical Product Manager') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('rebecca.gould@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = '12013 FITZHUGH ROAD',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2024, "hire_month" = 5, "hire_day" = 6,
  "elt_leader" = 'Jennifer Duer',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Product Management') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Intern') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('hadley.james@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = 'Remote',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2024, "hire_month" = 6, "hire_day" = 24,
  "elt_leader" = 'Jennifer Duer',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Product Management') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('VP, Product IT Solutions') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('matthew.burg@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = 'Remote',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2021, "hire_month" = 5, "hire_day" = 24,
  "elt_leader" = 'Jennifer Duer',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Product Management') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Director of Product Management Analytics') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('caitlin.mcdermott@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = 'Remote',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2021, "hire_month" = 6, "hire_day" = 22,
  "elt_leader" = 'Carson Mcmillan',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Product Management') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Director Technical Product Management') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('derek.laurie@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = 'Remote',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2022, "hire_month" = 7, "hire_day" = 25,
  "elt_leader" = 'Jennifer Duer',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Product Management') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Business Analyst') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('jared.varner@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = 'Remote',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2024, "hire_month" = 1, "hire_day" = 8,
  "elt_leader" = 'Carson Mcmillan',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Product Management') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('EVP Product') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('jennifer.duer@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = 'Remote',
  "business_unit" = 'STOPit Solutions',
  "hire_year" = 2025, "hire_month" = 3, "hire_day" = 1,
  "elt_leader" = 'Jennifer Duer',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Product Management') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Senior Director Product Management') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('gregory.artzt@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = '12013 FITZHUGH ROAD',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2026, "hire_month" = 6, "hire_day" = 23,
  "elt_leader" = 'Carson Mcmillan',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Product Management') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Business Analyst') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('alexander.szabo@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = '12013 FITZHUGH ROAD',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2020, "hire_month" = 11, "hire_day" = 16,
  "elt_leader" = 'Carson Mcmillan',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Scrum') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Technical Product Manager') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('michelle.mcgovern@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = 'Remote',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2008, "hire_month" = 10, "hire_day" = 20,
  "elt_leader" = 'Carson Mcmillan',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Data Science') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Software Engineer') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('christian.trahan@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = '12013 FITZHUGH ROAD',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2021, "hire_month" = 10, "hire_day" = 18,
  "elt_leader" = 'Carson Mcmillan',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Data Science') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Data Platform Manager') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('brian.truong@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = 'Remote',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2021, "hire_month" = 11, "hire_day" = 8,
  "elt_leader" = 'Carson Mcmillan',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Data Science') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Senior Data Engineer') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('niels.dhollanderbarclay@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = 'Remote',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2023, "hire_month" = 4, "hire_day" = 10,
  "elt_leader" = 'Carson Mcmillan',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Data Science') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Machine Learning Engineer') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('alexander.doria@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = '12013 FITZHUGH ROAD',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2017, "hire_month" = 1, "hire_day" = 26,
  "elt_leader" = 'Carson Mcmillan',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('QAT') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('QA Engineer') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('brandon.jones@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = '12013 FITZHUGH ROAD',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2008, "hire_month" = 5, "hire_day" = 27,
  "elt_leader" = 'Carson Mcmillan',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('QAT') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Customer Quality Manager') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('jeffrey.smith@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = 'Remote',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2014, "hire_month" = 8, "hire_day" = 18,
  "elt_leader" = 'Carson Mcmillan',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('QAT') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('VP Product Delivery') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('jared.accardo@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = '12013 FITZHUGH ROAD',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2017, "hire_month" = 9, "hire_day" = 25,
  "elt_leader" = 'Carson Mcmillan',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('QAT') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Lead QA Automation Engineer') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('trung.pham@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = '12013 FITZHUGH ROAD',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2020, "hire_month" = 3, "hire_day" = 23,
  "elt_leader" = 'Carson Mcmillan',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('QAT') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('QA Engineer') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('nicholas.chambers@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = '12013 FITZHUGH ROAD',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2020, "hire_month" = 3, "hire_day" = 6,
  "elt_leader" = 'Carson Mcmillan',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('QAT') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Senior QA Engineer') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('andrew.cribari@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = 'Remote',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2021, "hire_month" = 6, "hire_day" = 28,
  "elt_leader" = 'Carson Mcmillan',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('QAT') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('QA Automation Engineer') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('charushila.awhad@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = 'Remote',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2021, "hire_month" = 7, "hire_day" = 26,
  "elt_leader" = 'Carson Mcmillan',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('QAT') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Senior QA Automation Engineer') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('gijo.johny@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = '12013 FITZHUGH ROAD',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2021, "hire_month" = 10, "hire_day" = 4,
  "elt_leader" = 'Carson Mcmillan',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('QAT') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('QA Engineer') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('madhuri.balasubramanya@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = 'Remote',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2021, "hire_month" = 10, "hire_day" = 25,
  "elt_leader" = 'Carson Mcmillan',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('QAT') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Senior QA Engineer') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('jeffrey.zwick@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = 'Remote',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2022, "hire_month" = 2, "hire_day" = 28,
  "elt_leader" = 'Carson Mcmillan',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('QAT') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Senior QA Automation Engineer') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('jenisha.karmacharya@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = '12013 FITZHUGH ROAD',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2022, "hire_month" = 8, "hire_day" = 15,
  "elt_leader" = 'Carson Mcmillan',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('QAT') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Lead QA Engineer') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('michelle.vargas@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = 'Remote',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2023, "hire_month" = 10, "hire_day" = 4,
  "elt_leader" = 'Carson Mcmillan',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('QAT') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Junior QA Engineer') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('kyle.escobar@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = '12013 FITZHUGH ROAD',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2026, "hire_month" = 5, "hire_day" = 26,
  "elt_leader" = 'Carson Mcmillan',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('QAT') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Intern') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('ava.friloux@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = '169 NEW LONDON ROAD',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2012, "hire_month" = 10, "hire_day" = 1,
  "elt_leader" = 'Carson Mcmillan',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('QAT') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Technical Product Manager') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('leigh.morris@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = 'Remote',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2016, "hire_month" = 2, "hire_day" = 22,
  "elt_leader" = 'Wes Lawrence',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Customer Service') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Technical Escalation Engineer') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('enrique.michel@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = '12013 FITZHUGH ROAD',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2026, "hire_month" = 1, "hire_day" = 13,
  "elt_leader" = 'Wes Lawrence',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Customer Service') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Technical Support Specialist') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('juan.rodriguez.maldonado@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = 'Remote',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2019, "hire_month" = 5, "hire_day" = 10,
  "elt_leader" = 'Wes Lawrence',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Customer Service') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Technical Escalation Engineer') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('chasity.lyson@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = '12013 FITZHUGH ROAD',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2014, "hire_month" = 9, "hire_day" = 29,
  "elt_leader" = 'Wes Lawrence',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Customer Service') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Technical Support Specialist') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('marie.wittry@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = '12013 FITZHUGH ROAD',
  "business_unit" = 'Lightspeed',
  "hire_year" = 1999, "hire_month" = 7, "hire_day" = 1,
  "elt_leader" = 'Wes Lawrence',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Customer Service') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Senior Technical Support Specialist') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('wing.mar@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = '12013 FITZHUGH ROAD',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2020, "hire_month" = 3, "hire_day" = 2,
  "elt_leader" = 'Wes Lawrence',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Customer Service') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Lead Technical Support Specialist') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('abraham.ybarra@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = 'Remote',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2023, "hire_month" = 1, "hire_day" = 3,
  "elt_leader" = 'Wes Lawrence',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Customer Service') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Customer Operations Analyst') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('alyssa.ann.silva@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = 'Remote',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2024, "hire_month" = 4, "hire_day" = 22,
  "elt_leader" = 'Wes Lawrence',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Customer Service') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Customer Service Representative') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('saul.trejo@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = '12013 FITZHUGH ROAD',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2024, "hire_month" = 4, "hire_day" = 29,
  "elt_leader" = 'Wes Lawrence',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Customer Service') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Technical Escalation Engineer') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('cameron.meyer@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = 'Remote',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2024, "hire_month" = 5, "hire_day" = 28,
  "elt_leader" = 'Wes Lawrence',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Customer Service') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Lead Technical Support Specialist') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('dylan.claiborne@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = 'Remote',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2024, "hire_month" = 8, "hire_day" = 5,
  "elt_leader" = 'Wes Lawrence',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Customer Service') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Technical Support Manager') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('travis.bullock@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = '12013 FITZHUGH ROAD',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2025, "hire_month" = 5, "hire_day" = 6,
  "elt_leader" = 'Wes Lawrence',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Customer Service') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Technical Support Specialist') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('frank.romero@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = '169 NEW LONDON ROAD',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2026, "hire_month" = 4, "hire_day" = 7,
  "elt_leader" = 'Wes Lawrence',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Customer Service') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Customer Service Representative') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('katy.shawcross@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = '12013 FITZHUGH ROAD',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2026, "hire_month" = 6, "hire_day" = 2,
  "elt_leader" = 'Wes Lawrence',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Customer Service') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Associate Technical Support Specialist') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('syed.muhammad.hassaan.gillani@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = '169 NEW LONDON ROAD',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2025, "hire_month" = 6, "hire_day" = 16,
  "elt_leader" = 'Wes Lawrence',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Customer Service') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Team Lead Technical Support') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('andy.bennetta@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = '169 NEW LONDON ROAD',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2025, "hire_month" = 5, "hire_day" = 27,
  "elt_leader" = 'Wes Lawrence',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Customer Service') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Technical Support Specialist') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('jide.oke@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = '169 NEW LONDON ROAD',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2025, "hire_month" = 6, "hire_day" = 23,
  "elt_leader" = 'Wes Lawrence',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Customer Service') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Technical Support Specialist') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('khaled.uddin@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = '169 NEW LONDON ROAD',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2020, "hire_month" = 8, "hire_day" = 5,
  "elt_leader" = 'Wes Lawrence',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Customer Service') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Technical Support Specialist') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('lewis.brown@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = '12013 FITZHUGH ROAD',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2025, "hire_month" = 10, "hire_day" = 21,
  "elt_leader" = 'Wes Lawrence',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Customer Service') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Associate Technical Support Specialist') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('tu.ngo@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = '12013 FITZHUGH ROAD',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2021, "hire_month" = 4, "hire_day" = 12,
  "elt_leader" = 'Wes Lawrence',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Student Safety') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Lead Student Safety Specialist') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('jason.veselka@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = '12013 FITZHUGH ROAD',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2021, "hire_month" = 8, "hire_day" = 16,
  "elt_leader" = 'Wes Lawrence',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Student Safety') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Senior Student Safety Specialist') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('sinead.williams@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = '12013 FITZHUGH ROAD',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2021, "hire_month" = 10, "hire_day" = 11,
  "elt_leader" = 'Wes Lawrence',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Student Safety') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Student Safety Manager') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('december.wilks@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = 'Remote',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2022, "hire_month" = 10, "hire_day" = 17,
  "elt_leader" = 'Wes Lawrence',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Student Safety') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Student Safety Specialist') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('colleen.clark@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = 'Remote',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2023, "hire_month" = 3, "hire_day" = 27,
  "elt_leader" = 'Wes Lawrence',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Student Safety') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Senior Student Safety Specialist') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('whitney.veatch@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = 'Remote',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2023, "hire_month" = 6, "hire_day" = 5,
  "elt_leader" = 'Wes Lawrence',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Student Safety') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Senior Student Safety Specialist') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('angela.mazza@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = 'Remote',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2023, "hire_month" = 12, "hire_day" = 4,
  "elt_leader" = 'Wes Lawrence',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Student Safety') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Student Safety Specialist') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('christina.mares@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = 'Remote',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2023, "hire_month" = 12, "hire_day" = 4,
  "elt_leader" = 'Wes Lawrence',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Student Safety') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Senior Student Safety Specialist') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('nykayla.carter@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = 'Remote',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2023, "hire_month" = 12, "hire_day" = 4,
  "elt_leader" = 'Wes Lawrence',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Student Safety') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Student Safety Specialist') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('shanna.johnson@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = 'Remote',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2023, "hire_month" = 12, "hire_day" = 4,
  "elt_leader" = 'Wes Lawrence',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Student Safety') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Student Safety Specialist') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('danielle.rubio@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = 'Remote',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2024, "hire_month" = 5, "hire_day" = 13,
  "elt_leader" = 'Wes Lawrence',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Student Safety') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Student Safety Specialist') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('cristal.cuellar@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = 'Remote',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2024, "hire_month" = 5, "hire_day" = 20,
  "elt_leader" = 'Wes Lawrence',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Student Safety') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Student Safety Specialist') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('nathan.davila@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = 'Remote',
  "business_unit" = 'STOPit Solutions',
  "hire_year" = 2025, "hire_month" = 3, "hire_day" = 1,
  "elt_leader" = 'Wes Lawrence',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Student Safety') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Student Safety Specialist') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('jolie.boodansingh@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = 'Remote',
  "business_unit" = 'STOPit Solutions',
  "hire_year" = 2025, "hire_month" = 3, "hire_day" = 1,
  "elt_leader" = 'Wes Lawrence',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Student Safety') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Student Safety Specialist') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('lydell.craig@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = 'Remote',
  "business_unit" = 'STOPit Solutions',
  "hire_year" = 2025, "hire_month" = 3, "hire_day" = 1,
  "elt_leader" = 'Wes Lawrence',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Student Safety') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Student Safety Manager') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('tracy.craig@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = 'Remote',
  "business_unit" = 'STOPit Solutions',
  "hire_year" = 2025, "hire_month" = 3, "hire_day" = 1,
  "elt_leader" = 'Wes Lawrence',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Student Safety') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Student Safety Specialist') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('jerry.flores@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = 'Remote',
  "business_unit" = 'STOPit Solutions',
  "hire_year" = 2025, "hire_month" = 3, "hire_day" = 1,
  "elt_leader" = 'Wes Lawrence',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Student Safety') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Student Safety Specialist') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('jason.montes@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = 'Remote',
  "business_unit" = 'STOPit Solutions',
  "hire_year" = 2025, "hire_month" = 3, "hire_day" = 1,
  "elt_leader" = 'Wes Lawrence',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Student Safety') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Senior Student Safety Specialist') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('zakkiyya.purnell@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = 'Remote',
  "business_unit" = 'STOPit Solutions',
  "hire_year" = 2025, "hire_month" = 3, "hire_day" = 1,
  "elt_leader" = 'Wes Lawrence',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Student Safety') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Student Safety Specialist') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('katelin.revels@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = 'Remote',
  "business_unit" = 'STOPit Solutions',
  "hire_year" = 2025, "hire_month" = 3, "hire_day" = 1,
  "elt_leader" = 'Wes Lawrence',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Student Safety') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Student Safety Specialist') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('shakira.romero@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = 'Remote',
  "business_unit" = 'STOPit Solutions',
  "hire_year" = 2025, "hire_month" = 3, "hire_day" = 1,
  "elt_leader" = 'Wes Lawrence',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Student Safety') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Senior Student Safety Specialist') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('kurstye.tillmon@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = 'Remote',
  "business_unit" = 'STOPit Solutions',
  "hire_year" = 2025, "hire_month" = 3, "hire_day" = 1,
  "elt_leader" = 'Wes Lawrence',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Student Safety') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Student Safety Specialist') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('armahn.turk@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = 'Remote',
  "business_unit" = 'STOPit Solutions',
  "hire_year" = 2025, "hire_month" = 3, "hire_day" = 1,
  "elt_leader" = 'Wes Lawrence',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Student Safety') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Lead Student Safety Specialist') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('tichiere.womble@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = 'Remote',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2025, "hire_month" = 12, "hire_day" = 1,
  "elt_leader" = 'Wes Lawrence',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Student Safety') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Student Safety Specialist') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('tameka.smith@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = 'Remote',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2025, "hire_month" = 12, "hire_day" = 8,
  "elt_leader" = 'Wes Lawrence',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Student Safety') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Student Safety Specialist') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('marlisa.mungo@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = '169 NEW LONDON ROAD',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2026, "hire_month" = 3, "hire_day" = 9,
  "elt_leader" = 'Wes Lawrence',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Student Safety') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Student Safety Specialist') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('kian.curran@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = 'Remote',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2026, "hire_month" = 3, "hire_day" = 9,
  "elt_leader" = 'Wes Lawrence',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Student Safety') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Student Safety Specialist') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('danielle.adams@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = 'Remote',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2026, "hire_month" = 3, "hire_day" = 9,
  "elt_leader" = 'Wes Lawrence',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Student Safety') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Student Safety Specialist') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('albert.garcia@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = 'Remote',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2026, "hire_month" = 3, "hire_day" = 9,
  "elt_leader" = 'Wes Lawrence',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Student Safety') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Student Safety Specialist') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('rashida.brown@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = 'Remote',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2026, "hire_month" = 3, "hire_day" = 30,
  "elt_leader" = 'Wes Lawrence',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Student Safety') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Student Safety Specialist') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('nathan.estrada@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = '169 NEW LONDON ROAD',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2021, "hire_month" = 8, "hire_day" = 2,
  "elt_leader" = 'Wes Lawrence',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Student Safety') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Student Safety Manager') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('ricky.salter@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = '12013 FITZHUGH ROAD',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2021, "hire_month" = 2, "hire_day" = 16,
  "elt_leader" = 'Carson Mcmillan',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Content Categorization') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Content Categorization Specialist') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('chase.masiel@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = 'Remote',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2022, "hire_month" = 5, "hire_day" = 25,
  "elt_leader" = 'Carson Mcmillan',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Content Categorization') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Content Categorization Specialist') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('hailey.thomas@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = 'Remote',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2026, "hire_month" = 3, "hire_day" = 16,
  "elt_leader" = 'Wes Lawrence',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Customer Success Engineering') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Senior Technical Escalation Engineer') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('ryan.stufflebeam@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = '12013 FITZHUGH ROAD',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2019, "hire_month" = 9, "hire_day" = 20,
  "elt_leader" = 'Wes Lawrence',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Customer Success Engineering') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Solutions Engineer') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('ramy.sahouri@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = 'Remote',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2020, "hire_month" = 10, "hire_day" = 19,
  "elt_leader" = 'Wes Lawrence',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Customer Success Engineering') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Senior Manager, Solutions Engineering') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('wesley.cunningham@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = 'Remote',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2022, "hire_month" = 12, "hire_day" = 12,
  "elt_leader" = 'Wes Lawrence',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Customer Success Engineering') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Solutions Engineer') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('quinten.oldaker@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = 'Remote',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2023, "hire_month" = 4, "hire_day" = 3,
  "elt_leader" = 'Wes Lawrence',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Customer Success Engineering') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Solutions Engineer') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('christina.atkinson@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = '12013 FITZHUGH ROAD',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2026, "hire_month" = 5, "hire_day" = 19,
  "elt_leader" = 'Wes Lawrence',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Customer Success Engineering') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Solutions Engineer') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('dante.munoz@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = 'Remote',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2004, "hire_month" = 12, "hire_day" = 13,
  "elt_leader" = 'Carson Mcmillan',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Security and Hosting') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Lead Site Reliability Engineer') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('christopher.newkirk@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = 'Remote',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2017, "hire_month" = 11, "hire_day" = 6,
  "elt_leader" = 'Carson Mcmillan',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Security and Hosting') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Junior Site Reliability Engineer') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('joseph.decarlo@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = 'Remote',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2021, "hire_month" = 4, "hire_day" = 19,
  "elt_leader" = 'Carson Mcmillan',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Security and Hosting') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Site Reliability Engineer') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('ryan.oglesby@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = 'Remote',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2021, "hire_month" = 7, "hire_day" = 6,
  "elt_leader" = 'Carson Mcmillan',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Security and Hosting') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Junior Software Engineer') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('matthew.ames@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = '12013 FITZHUGH ROAD',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2021, "hire_month" = 7, "hire_day" = 20,
  "elt_leader" = 'Carson Mcmillan',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Security and Hosting') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Site Reliability Engineer') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('esteban.diocares@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = '169 NEW LONDON ROAD',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2022, "hire_month" = 2, "hire_day" = 28,
  "elt_leader" = 'Carson Mcmillan',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Security and Hosting') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Site Reliability Engineer') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('anita.krueger@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = '12013 FITZHUGH ROAD',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2008, "hire_month" = 10, "hire_day" = 1,
  "elt_leader" = 'Brian Thomas',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Sales') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Chief Revenue Officer') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('christopher.travis@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = '12013 FITZHUGH ROAD',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2009, "hire_month" = 8, "hire_day" = 31,
  "elt_leader" = 'Chris Travis',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Sales') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('VP Sales') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('michael.durando@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = '12013 FITZHUGH ROAD',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2000, "hire_month" = 2, "hire_day" = 25,
  "elt_leader" = 'Chris Travis',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Sales') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('VP Sales') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('michael.boggess@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = 'Remote',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2022, "hire_month" = 6, "hire_day" = 1,
  "elt_leader" = 'Chris Travis',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Sales') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Senior Strategic Account Executive') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('scott.meeks@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = '12013 FITZHUGH ROAD',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2021, "hire_month" = 3, "hire_day" = 22,
  "elt_leader" = 'Chris Travis',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Sales') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Strategic Account Executive') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('sergio.villegas@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = 'Remote',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2021, "hire_month" = 8, "hire_day" = 16,
  "elt_leader" = 'Chris Travis',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Sales') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Strategic Account Manager') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('alecia.boggess@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = 'Remote',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2022, "hire_month" = 1, "hire_day" = 8,
  "elt_leader" = 'Chris Travis',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Sales') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Strategic Account Manager') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('ross.mcaden@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = 'Remote',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2022, "hire_month" = 7, "hire_day" = 12,
  "elt_leader" = 'Chris Travis',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Sales') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Strategic Account Executive') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('keaton.smith@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = '12013 FITZHUGH ROAD',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2022, "hire_month" = 9, "hire_day" = 6,
  "elt_leader" = 'Chris Travis',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Sales') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Associate Account Executive') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('jake.de.la.garrigue@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = '12013 FITZHUGH ROAD',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2023, "hire_month" = 5, "hire_day" = 22,
  "elt_leader" = 'Chris Travis',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Sales') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Strategic Account Manager') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('michael.roddey@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = '12013 FITZHUGH ROAD',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2024, "hire_month" = 3, "hire_day" = 4,
  "elt_leader" = 'Chris Travis',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Sales') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Associate Account Executive') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('christopher.dunn@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = 'Remote',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2024, "hire_month" = 4, "hire_day" = 3,
  "elt_leader" = 'Chris Travis',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Sales') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Strategic Account Manager') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('casey.butera@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = '12013 FITZHUGH ROAD',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2024, "hire_month" = 12, "hire_day" = 3,
  "elt_leader" = 'Kirk Orgeldinger',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Sales') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Renewals Specialist') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('brooke.brown@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = 'Remote',
  "business_unit" = 'STOPit Solutions',
  "hire_year" = 2025, "hire_month" = 3, "hire_day" = 1,
  "elt_leader" = 'Chris Travis',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Sales') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('VP Sales') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('kevin.askew@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = 'Remote',
  "business_unit" = 'STOPit Solutions',
  "hire_year" = 2025, "hire_month" = 3, "hire_day" = 1,
  "elt_leader" = 'Chris Travis',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Sales') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Strategic Account Executive') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('nicholas.zema@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = 'Remote',
  "business_unit" = 'STOPit Solutions',
  "hire_year" = 2025, "hire_month" = 3, "hire_day" = 1,
  "elt_leader" = 'Chris Travis',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Sales') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Strategic Account Manager') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('erika.johnson@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = 'Remote',
  "business_unit" = 'STOPit Solutions',
  "hire_year" = 2025, "hire_month" = 3, "hire_day" = 1,
  "elt_leader" = 'Chris Travis',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Sales') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Strategic Account Manager') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('ann.marie.martinez@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = '12013 FITZHUGH ROAD',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2025, "hire_month" = 9, "hire_day" = 2,
  "elt_leader" = 'Chris Travis',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Sales') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Account Executive') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('spencer.smith@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = '12013 FITZHUGH ROAD',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2025, "hire_month" = 10, "hire_day" = 28,
  "elt_leader" = 'Chris Travis',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Sales') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Account Executive') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('andrew.fowler@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = '12013 FITZHUGH ROAD',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2026, "hire_month" = 1, "hire_day" = 6,
  "elt_leader" = 'Chris Travis',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Sales') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Strategic Account Manager') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('lauren.mcnair@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = '12013 FITZHUGH ROAD',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2026, "hire_month" = 3, "hire_day" = 3,
  "elt_leader" = 'Chris Travis',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Sales') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Associate Account Manager') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('nicole.greig@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = 'Remote',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2026, "hire_month" = 3, "hire_day" = 16,
  "elt_leader" = 'Chris Travis',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Sales') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Strategic Account Executive') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('jaeden.richards@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = '12013 FITZHUGH ROAD',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2026, "hire_month" = 5, "hire_day" = 5,
  "elt_leader" = 'Kirk Orgeldinger',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Sales') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Renewals Specialist') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('nicole.tribo@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = '169 NEW LONDON ROAD',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2023, "hire_month" = 5, "hire_day" = 9,
  "elt_leader" = 'Colin Mccabe',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Sales') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Strategic Account Executive') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('christopher.spink@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = '169 NEW LONDON ROAD',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2022, "hire_month" = 8, "hire_day" = 1,
  "elt_leader" = 'Chris Travis',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Sales') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('General Manager International') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('colin.mccabe@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = '169 NEW LONDON ROAD',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2024, "hire_month" = 6, "hire_day" = 4,
  "elt_leader" = 'Colin Mccabe',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Sales') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Account Manager') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('harry.saunders@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = '169 NEW LONDON ROAD',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2017, "hire_month" = 3, "hire_day" = 1,
  "elt_leader" = 'Colin Mccabe',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Sales') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Account Manager') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('kiah.long@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = '169 NEW LONDON ROAD',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2022, "hire_month" = 4, "hire_day" = 4,
  "elt_leader" = 'Colin Mccabe',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Sales') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Acting Director of Sales EMEIA') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('shaun.phillips@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = 'Remote',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2011, "hire_month" = 4, "hire_day" = 25,
  "elt_leader" = 'Wes Lawrence',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Sales Engineers') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Manager, Strategic Solutions Engineering') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('william.long@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = 'Remote',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2022, "hire_month" = 6, "hire_day" = 27,
  "elt_leader" = 'Wes Lawrence',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Sales Engineers') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Strategic Solutions Engineer') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('trevor.davis@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = 'Remote',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2022, "hire_month" = 11, "hire_day" = 7,
  "elt_leader" = 'Wes Lawrence',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Sales Engineers') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Strategic Solutions Engineer') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('matthew.nelson@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = 'Remote',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2024, "hire_month" = 6, "hire_day" = 24,
  "elt_leader" = 'Wes Lawrence',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Sales Engineers') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Strategic Solutions Engineer') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('robert.hancock@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = 'Remote',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2025, "hire_month" = 3, "hire_day" = 17,
  "elt_leader" = 'Wes Lawrence',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Sales Engineers') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Strategic Solutions Engineer') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('austin.sweet@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = 'Remote',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2025, "hire_month" = 9, "hire_day" = 29,
  "elt_leader" = 'Wes Lawrence',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Sales Engineers') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Manager, Strategic Solutions Engineering') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('bradley.rowe@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = 'Remote',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2025, "hire_month" = 9, "hire_day" = 30,
  "elt_leader" = 'Wes Lawrence',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Sales Engineers') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Strategic Solutions Engineer') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('daniel.dunn@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = 'Remote',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2025, "hire_month" = 12, "hire_day" = 2,
  "elt_leader" = 'Wes Lawrence',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Sales Engineers') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Strategic Solutions Engineer') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('alexander.crouse@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = 'Remote',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2026, "hire_month" = 2, "hire_day" = 9,
  "elt_leader" = 'Wes Lawrence',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Sales Engineers') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Strategic Solutions Engineer') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('alexander.sands@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = 'Remote',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2026, "hire_month" = 6, "hire_day" = 15,
  "elt_leader" = 'Wes Lawrence',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Sales Engineers') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Manager, Strategic Solutions Engineering') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('charles.bryant@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = 'Remote',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2026, "hire_month" = 6, "hire_day" = 15,
  "elt_leader" = 'Wes Lawrence',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Sales Engineers') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Senior Strategic Solutions Engineer') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('shad.mcgaha@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = 'Remote',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2023, "hire_month" = 3, "hire_day" = 27,
  "elt_leader" = 'Wes Lawrence',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Sales Engineers') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Strategic Solutions Engineer') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('colin.fulton@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = '169 NEW LONDON ROAD',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2020, "hire_month" = 10, "hire_day" = 26,
  "elt_leader" = 'Wes Lawrence',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Sales Engineers') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Solutions Engineer') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('joel.walmsley@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = '169 NEW LONDON ROAD',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2015, "hire_month" = 6, "hire_day" = 10,
  "elt_leader" = 'Wes Lawrence',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Sales Engineers') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Manager, Strategic Solutions Engineering') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('richard.chown@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = 'Remote',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2023, "hire_month" = 1, "hire_day" = 9,
  "elt_leader" = 'Wes Lawrence',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Customer Success') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Training & Enablement Manager') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('krista.delk@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = 'Remote',
  "business_unit" = 'STOPit Solutions',
  "hire_year" = 2025, "hire_month" = 3, "hire_day" = 1,
  "elt_leader" = 'Wes Lawrence',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Customer Success') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Senior Director Customer Operations') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('teresa.reuter@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = 'Remote',
  "business_unit" = 'STOPit Solutions',
  "hire_year" = 2025, "hire_month" = 3, "hire_day" = 1,
  "elt_leader" = 'Wes Lawrence',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Customer Success') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Training & Enablement Manager') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('cindy.moore@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = 'Remote',
  "business_unit" = 'STOPit Solutions',
  "hire_year" = 2025, "hire_month" = 3, "hire_day" = 1,
  "elt_leader" = 'Wes Lawrence',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Customer Success') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Training & Enablement Manager') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('samantha.revels@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = 'Remote',
  "business_unit" = 'STOPit Solutions',
  "hire_year" = 2025, "hire_month" = 3, "hire_day" = 1,
  "elt_leader" = 'Wes Lawrence',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Customer Success') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Senior Customer Operations Manager') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('alyssa.russo@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = 'Remote',
  "business_unit" = 'STOPit Solutions',
  "hire_year" = 2025, "hire_month" = 3, "hire_day" = 1,
  "elt_leader" = 'Wes Lawrence',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Customer Success') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Senior Manager Customer Experience') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('casey.hann@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = 'Remote',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2023, "hire_month" = 10, "hire_day" = 23,
  "elt_leader" = 'Kirk Orgeldinger',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Sales Operations') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Team Lead, Revenue Operations') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('luke.shearin@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = 'Remote',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2010, "hire_month" = 12, "hire_day" = 1,
  "elt_leader" = 'Brian Thomas',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Marketing') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Chief of Staff') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('amy.bennett@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = '12013 FITZHUGH ROAD',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2020, "hire_month" = 8, "hire_day" = 31,
  "elt_leader" = 'Amy Bennett',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Marketing') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Director Corporate Marketing') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('amanda.gorena@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = '12013 FITZHUGH ROAD',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2024, "hire_month" = 5, "hire_day" = 14,
  "elt_leader" = 'Amy Bennett',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Marketing') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Marketing Coordinator') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('grace.mellette@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = 'Remote',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2026, "hire_month" = 3, "hire_day" = 2,
  "elt_leader" = 'Amy Bennett',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Marketing') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Marketing Manager') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('marcos.suarez@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = '12013 FITZHUGH ROAD',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2026, "hire_month" = 5, "hire_day" = 26,
  "elt_leader" = 'Amy Bennett',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Marketing') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Intern') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('olivia.gibbons@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = '12013 FITZHUGH ROAD',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2026, "hire_month" = 5, "hire_day" = 26,
  "elt_leader" = 'Amy Bennett',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Marketing') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Intern') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('emma.stewart@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = '169 NEW LONDON ROAD',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2010, "hire_month" = 5, "hire_day" = 4,
  "elt_leader" = 'Amy Bennett',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Marketing') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('International Marketing Manager') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('liam.roberts@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = '169 NEW LONDON ROAD',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2025, "hire_month" = 5, "hire_day" = 19,
  "elt_leader" = 'Amy Bennett',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Marketing') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('International Marketing Coordinator') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('megan.black@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = '12013 FITZHUGH ROAD',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2025, "hire_month" = 10, "hire_day" = 7,
  "elt_leader" = 'Amy Bennett',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Marketing') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Business Development Representative') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('kyle.olson@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = '12013 FITZHUGH ROAD',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2024, "hire_month" = 5, "hire_day" = 6,
  "elt_leader" = 'Amy Bennett',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Marketing') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Events Manager') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('madelyne.stewart@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = 'Remote',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2022, "hire_month" = 11, "hire_day" = 7,
  "elt_leader" = 'Amy Bennett',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Product Marketing') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Senior Product Marketing Manager') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('larissa.negreiros.somaio@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = '12013 FITZHUGH ROAD',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2023, "hire_month" = 1, "hire_day" = 9,
  "elt_leader" = 'Amy Bennett',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Product Marketing') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Product Marketing Manager') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('jiana.khazma@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = '12013 FITZHUGH ROAD',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2019, "hire_month" = 10, "hire_day" = 1,
  "elt_leader" = 'Brian Thomas',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Administration') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('President & CFO') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('kirk.orgeldinger@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = '12013 FITZHUGH ROAD',
  "business_unit" = 'Lightspeed',
  "hire_year" = 1999, "hire_month" = 7, "hire_day" = 19,
  "elt_leader" = NULL,
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Administration') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('CEO & Founder') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('brian.thomas@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = 'Remote',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2019, "hire_month" = 3, "hire_day" = 20,
  "elt_leader" = 'Wes Lawrence',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Administration') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Senior Director Solutions Engineering & Support') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('robert.mccartney@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = '12013 FITZHUGH ROAD',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2020, "hire_month" = 4, "hire_day" = 1,
  "elt_leader" = 'Kirk Orgeldinger',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Administration') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Front Office Coordinator/Executive Assistant') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('katherine.williamson@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = '12013 FITZHUGH ROAD',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2020, "hire_month" = 5, "hire_day" = 4,
  "elt_leader" = 'Kirk Orgeldinger',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Administration') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('EVP Finance and Corporate Development') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('kevin.chiang@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = '12013 FITZHUGH ROAD',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2022, "hire_month" = 4, "hire_day" = 18,
  "elt_leader" = 'Kirk Orgeldinger',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Administration') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('EVP, Operations') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('kevin.lawrence@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = 'Remote',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2022, "hire_month" = 6, "hire_day" = 27,
  "elt_leader" = 'Wes Lawrence',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Administration') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Director of Strategic Programs') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('zachary.horn@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = 'Remote',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2022, "hire_month" = 8, "hire_day" = 29,
  "elt_leader" = 'Wes Lawrence',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Administration') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Senior Director Strategic Programs') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('brock.anderson@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = '12013 FITZHUGH ROAD',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2025, "hire_month" = 2, "hire_day" = 25,
  "elt_leader" = 'Kevin Chiang',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Administration') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Manager, Contracts') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('juliana.morris@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = '12013 FITZHUGH ROAD',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2025, "hire_month" = 8, "hire_day" = 4,
  "elt_leader" = 'Brian Thomas',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Administration') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Chief AI Officer') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('donal.mcmahon@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = '12013 FITZHUGH ROAD',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2025, "hire_month" = 6, "hire_day" = 23,
  "elt_leader" = 'Rob Chambers',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Administration') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Internal Learning & Development Manager') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('jonathan.adkins@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = '12013 FITZHUGH ROAD',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2026, "hire_month" = 4, "hire_day" = 21,
  "elt_leader" = 'Kevin Chiang',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Administration') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Junior Contracts Administrator') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('sabrina.drouin@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = '12013 FITZHUGH ROAD',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2026, "hire_month" = 4, "hire_day" = 21,
  "elt_leader" = 'Donal Mcmahon',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Administration') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Junior AI Automation Engineer') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('ryan.passanisi@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = '12013 FITZHUGH ROAD',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2026, "hire_month" = 6, "hire_day" = 9,
  "elt_leader" = 'Donal Mcmahon',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Administration') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Intern') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('benjamin.thomas@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = '12013 FITZHUGH ROAD',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2026, "hire_month" = 6, "hire_day" = 17,
  "elt_leader" = 'Wes Lawrence',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Administration') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Intern') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('jade.friedman@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = '12013 FITZHUGH ROAD',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2026, "hire_month" = 6, "hire_day" = 11,
  "elt_leader" = 'Wes Lawrence',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Administration') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Intern') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('brooke.friedman@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = '12013 FITZHUGH ROAD',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2018, "hire_month" = 9, "hire_day" = 28,
  "elt_leader" = 'Wes Lawrence',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Human Resource') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Director Human Resources') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('heather.james@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = '12013 FITZHUGH ROAD',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2026, "hire_month" = 5, "hire_day" = 26,
  "elt_leader" = 'Wes Lawrence',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Human Resource') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Intern') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('lillian.fox@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = '12013 FITZHUGH ROAD',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2012, "hire_month" = 10, "hire_day" = 29,
  "elt_leader" = 'Kevin Chiang',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Finance') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('VP Corporate Controller') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('gregory.funk@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = 'Remote',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2019, "hire_month" = 2, "hire_day" = 11,
  "elt_leader" = 'Kevin Chiang',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Finance') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Orders and Accounts Receivables Specialist') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('douglas.dietert@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = '12013 FITZHUGH ROAD',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2021, "hire_month" = 6, "hire_day" = 1,
  "elt_leader" = 'Kevin Chiang',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Finance') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Manager Finance') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('scott.dunham@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = '12013 FITZHUGH ROAD',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2021, "hire_month" = 9, "hire_day" = 13,
  "elt_leader" = 'Kevin Chiang',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Finance') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Senior Accounting Manager') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('adrienne.synos@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = '12013 FITZHUGH ROAD',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2023, "hire_month" = 9, "hire_day" = 25,
  "elt_leader" = 'Kevin Chiang',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Finance') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Senior Accountant') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('megan.duhon@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = '12013 FITZHUGH ROAD',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2025, "hire_month" = 6, "hire_day" = 1,
  "elt_leader" = 'Kevin Chiang',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Finance') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Financial Analyst') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('james.laprocido@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = '12013 FITZHUGH ROAD',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2026, "hire_month" = 4, "hire_day" = 28,
  "elt_leader" = 'Kevin Chiang',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Finance') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Financial Analyst') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('jake.bowman@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = '12013 FITZHUGH ROAD',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2026, "hire_month" = 5, "hire_day" = 26,
  "elt_leader" = 'Kirk Orgeldinger',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Finance') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Intern') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('thayer.kacher@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = '12013 FITZHUGH ROAD',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2026, "hire_month" = 6, "hire_day" = 2,
  "elt_leader" = 'Kirk Orgeldinger',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Finance') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Intern') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('dhillon.reddy@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = '12013 FITZHUGH ROAD',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2005, "hire_month" = 7, "hire_day" = 5,
  "elt_leader" = 'Wes Lawrence',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('MIS') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Senior Director MIS') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('patrick.chapa@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = 'Remote',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2022, "hire_month" = 4, "hire_day" = 25,
  "elt_leader" = 'Wes Lawrence',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('MIS') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Salesforce Product Manager') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('adrian.rios.alvarez@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = '12013 FITZHUGH ROAD',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2022, "hire_month" = 5, "hire_day" = 2,
  "elt_leader" = 'Wes Lawrence',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('MIS') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Senior Systems Administrator') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('alexander.hesse@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = '12013 FITZHUGH ROAD',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2025, "hire_month" = 6, "hire_day" = 10,
  "elt_leader" = 'Wes Lawrence',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('MIS') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Intern') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('paul.chapa@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = '12013 FITZHUGH ROAD',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2026, "hire_month" = 1, "hire_day" = 13,
  "elt_leader" = 'Wes Lawrence',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('MIS') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Systems Administrator') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('william.hellemsmoody@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = '12013 FITZHUGH ROAD',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2007, "hire_month" = 7, "hire_day" = 2,
  "elt_leader" = 'Carson Mcmillan',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Security and Compliance') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Principal Application Security Engineer') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('bradley.white@lightspeedsystems.com');
--> statement-breakpoint
UPDATE "users" SET
  "location" = '12013 FITZHUGH ROAD',
  "business_unit" = 'Lightspeed',
  "hire_year" = 2026, "hire_month" = 5, "hire_day" = 26,
  "elt_leader" = 'Carson Mcmillan',
  "department_id" = COALESCE((SELECT id FROM "departments" WHERE lower("name")=lower('Security and Compliance') LIMIT 1), "department_id"),
  "job_title_id" = COALESCE((SELECT id FROM "job_titles" WHERE lower("title")=lower('Intern') LIMIT 1), "job_title_id"),
  "updated_at" = now()
WHERE lower("email") = lower('braedon.mulder@lightspeedsystems.com');

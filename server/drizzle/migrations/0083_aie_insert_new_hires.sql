-- AIE 2026-07-27 — insert 6 NEW hires from the HR export (confirmed new by Brooke,
-- all 2026 hires, several post-dating the 07-07 org chart). Guarded so it can never
-- duplicate: inserts only when neither the email nor the name already exists.
-- Manager linked by name to the existing directory in a second pass. Idempotent.

INSERT INTO "users" ("sub","email","name","role","is_active","location","business_unit","hire_year","hire_month","hire_day","elt_leader","department_id","job_title_id")
SELECT 'seed:tania.mackie@lightspeedsystems.com','tania.mackie@lightspeedsystems.com','Tania Mackie','user',true,
  '169 NEW LONDON ROAD','Lightspeed',2026,1,5,'Colin Mccabe',
  (SELECT id FROM "departments" WHERE lower("name")=lower('Sales') LIMIT 1),
  (SELECT id FROM "job_titles" WHERE lower("title")=lower('Director International Safeguarding & Digital Transformation') LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM "users" WHERE lower("email")=lower('tania.mackie@lightspeedsystems.com') OR lower("name")=lower('Tania Mackie'));
--> statement-breakpoint
INSERT INTO "users" ("sub","email","name","role","is_active","location","business_unit","hire_year","hire_month","hire_day","elt_leader","department_id","job_title_id")
SELECT 'seed:sam.howard@lightspeedsystems.com','sam.howard@lightspeedsystems.com','Sam Howard','user',true,
  '169 NEW LONDON ROAD','Lightspeed',2026,2,2,'Colin Mccabe',
  (SELECT id FROM "departments" WHERE lower("name")=lower('Sales') LIMIT 1),
  (SELECT id FROM "job_titles" WHERE lower("title")=lower('Strategic Account Executive') LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM "users" WHERE lower("email")=lower('sam.howard@lightspeedsystems.com') OR lower("name")=lower('Sam Howard'));
--> statement-breakpoint
INSERT INTO "users" ("sub","email","name","role","is_active","location","business_unit","hire_year","hire_month","hire_day","elt_leader","department_id","job_title_id")
SELECT 'seed:steven.miller@lightspeedsystems.com','steven.miller@lightspeedsystems.com','Steven Miller','user',true,
  'Remote','Lightspeed',2026,2,17,'Donal Mcmahon',
  (SELECT id FROM "departments" WHERE lower("name")=lower('Administration') LIMIT 1),
  (SELECT id FROM "job_titles" WHERE lower("title")=lower('Senior AI Automation Engineer') LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM "users" WHERE lower("email")=lower('steven.miller@lightspeedsystems.com') OR lower("name")=lower('Steven Miller'));
--> statement-breakpoint
INSERT INTO "users" ("sub","email","name","role","is_active","location","business_unit","hire_year","hire_month","hire_day","elt_leader","department_id","job_title_id")
SELECT 'seed:jody.parry@lightspeedsystems.com','jody.parry@lightspeedsystems.com','Jody Parry','user',true,
  '12013 FITZHUGH ROAD','Lightspeed',2026,6,22,NULL,
  (SELECT id FROM "departments" WHERE lower("name")=lower('Human Resource') LIMIT 1),
  (SELECT id FROM "job_titles" WHERE lower("title")=lower('Human Resources Contractor') LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM "users" WHERE lower("email")=lower('jody.parry@lightspeedsystems.com') OR lower("name")=lower('Jody Parry'));
--> statement-breakpoint
INSERT INTO "users" ("sub","email","name","role","is_active","location","business_unit","hire_year","hire_month","hire_day","elt_leader","department_id","job_title_id")
SELECT 'seed:lena.murray@lightspeedsystems.com','lena.murray@lightspeedsystems.com','Lena Murray','user',true,
  '12013 FITZHUGH ROAD','Lightspeed',2026,7,14,'Wes Lawrence',
  (SELECT id FROM "departments" WHERE lower("name")=lower('Human Resource') LIMIT 1),
  (SELECT id FROM "job_titles" WHERE lower("title")=lower('Human Resources Business Partner') LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM "users" WHERE lower("email")=lower('lena.murray@lightspeedsystems.com') OR lower("name")=lower('Lena Murray'));
--> statement-breakpoint
INSERT INTO "users" ("sub","email","name","role","is_active","location","business_unit","hire_year","hire_month","hire_day","elt_leader","department_id","job_title_id")
SELECT 'seed:joseph.coffey@lightspeedsystems.com','joseph.coffey@lightspeedsystems.com','Joseph Coffey','user',true,
  '12013 FITZHUGH ROAD','Lightspeed',2026,7,7,'Carson Mcmillan',
  (SELECT id FROM "departments" WHERE lower("name")=lower('Security and Compliance') LIMIT 1),
  (SELECT id FROM "job_titles" WHERE lower("title")=lower('Intern') LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM "users" WHERE lower("email")=lower('joseph.coffey@lightspeedsystems.com') OR lower("name")=lower('Joseph Coffey'));
--> statement-breakpoint
UPDATE "users" u SET "manager_id"=(SELECT id FROM "users" WHERE lower("name")=lower('Colin Mccabe') AND "is_active"=true LIMIT 1), "updated_at"=now()
WHERE lower(u."email")=lower('tania.mackie@lightspeedsystems.com') AND EXISTS (SELECT 1 FROM "users" WHERE lower("name")=lower('Colin Mccabe'));
--> statement-breakpoint
UPDATE "users" u SET "manager_id"=(SELECT id FROM "users" WHERE lower("name")=lower('Shaun Phillips') AND "is_active"=true LIMIT 1), "updated_at"=now()
WHERE lower(u."email")=lower('sam.howard@lightspeedsystems.com') AND EXISTS (SELECT 1 FROM "users" WHERE lower("name")=lower('Shaun Phillips'));
--> statement-breakpoint
UPDATE "users" u SET "manager_id"=(SELECT id FROM "users" WHERE lower("name")=lower('Donal Mcmahon') AND "is_active"=true LIMIT 1), "updated_at"=now()
WHERE lower(u."email")=lower('steven.miller@lightspeedsystems.com') AND EXISTS (SELECT 1 FROM "users" WHERE lower("name")=lower('Donal Mcmahon'));
--> statement-breakpoint
UPDATE "users" u SET "manager_id"=(SELECT id FROM "users" WHERE lower("name")=lower('Heather James') AND "is_active"=true LIMIT 1), "updated_at"=now()
WHERE lower(u."email")=lower('jody.parry@lightspeedsystems.com') AND EXISTS (SELECT 1 FROM "users" WHERE lower("name")=lower('Heather James'));
--> statement-breakpoint
UPDATE "users" u SET "manager_id"=(SELECT id FROM "users" WHERE lower("name")=lower('Heather James') AND "is_active"=true LIMIT 1), "updated_at"=now()
WHERE lower(u."email")=lower('lena.murray@lightspeedsystems.com') AND EXISTS (SELECT 1 FROM "users" WHERE lower("name")=lower('Heather James'));
--> statement-breakpoint
UPDATE "users" u SET "manager_id"=(SELECT id FROM "users" WHERE lower("name")=lower('Bradley White') AND "is_active"=true LIMIT 1), "updated_at"=now()
WHERE lower(u."email")=lower('joseph.coffey@lightspeedsystems.com') AND EXISTS (SELECT 1 FROM "users" WHERE lower("name")=lower('Bradley White'));

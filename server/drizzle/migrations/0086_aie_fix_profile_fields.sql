-- AIE 2026-07-27 — CORRECTIVE: (a) re-assert ELT leader / hire date / location /
-- business unit per person, keyed by email OR name (catches any prior email miss);
-- (b) populate the escalation chain from the ACTUAL manager graph (secondary =
-- manager's manager, etc.) — robust, no name matching. Idempotent.

UPDATE "users" SET
  "location"=COALESCE(NULLIF('12013 FITZHUGH ROAD',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2005,"hire_month"=11,"hire_day"=1,"elt_leader"='Carson Mcmillan',"updated_at"=now()
WHERE lower("email")=lower('john.genter@lightspeedsystems.com') OR lower("name")=lower('John Genter');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('Remote',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2007,"hire_month"=6,"hire_day"=4,"elt_leader"='Carson Mcmillan',"updated_at"=now()
WHERE lower("email")=lower('jason.isaac@lightspeedsystems.com') OR lower("name")=lower('Jason Isaac');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('Remote',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=1999,"hire_month"=8,"hire_day"=30,"elt_leader"='Carson Mcmillan',"updated_at"=now()
WHERE lower("email")=lower('brock.meadors@lightspeedsystems.com') OR lower("name")=lower('Brock Meadors');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('Remote',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2007,"hire_month"=4,"hire_day"=9,"elt_leader"='Carson Mcmillan',"updated_at"=now()
WHERE lower("email")=lower('kenneth.chitwood@lightspeedsystems.com') OR lower("name")=lower('Kenneth Chitwood');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('Remote',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2019,"hire_month"=5,"hire_day"=9,"elt_leader"='Carson Mcmillan',"updated_at"=now()
WHERE lower("email")=lower('bryan.anderson@lightspeedsystems.com') OR lower("name")=lower('Bryan Anderson');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('12013 FITZHUGH ROAD',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=1999,"hire_month"=7,"hire_day"=1,"elt_leader"='Carson Mcmillan',"updated_at"=now()
WHERE lower("email")=lower('ryan.bond@lightspeedsystems.com') OR lower("name")=lower('Ryan Bond');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('12013 FITZHUGH ROAD',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2001,"hire_month"=8,"hire_day"=13,"elt_leader"='Brian Thomas',"updated_at"=now()
WHERE lower("email")=lower('robert.mcmillan@lightspeedsystems.com') OR lower("name")=lower('Robert Mcmillan');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('Remote',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2018,"hire_month"=5,"hire_day"=29,"elt_leader"='Carson Mcmillan',"updated_at"=now()
WHERE lower("email")=lower('mitchell.laurrenring@lightspeedsystems.com') OR lower("name")=lower('Mitchell Laurren-Ring');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('Remote',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2019,"hire_month"=2,"hire_day"=15,"elt_leader"='Carson Mcmillan',"updated_at"=now()
WHERE lower("email")=lower('preston.matheson@lightspeedsystems.com') OR lower("name")=lower('Preston Matheson');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('Remote',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2008,"hire_month"=11,"hire_day"=4,"elt_leader"='Carson Mcmillan',"updated_at"=now()
WHERE lower("email")=lower('andrew.hecht@lightspeedsystems.com') OR lower("name")=lower('Andrew Hecht');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('Remote',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2019,"hire_month"=5,"hire_day"=6,"elt_leader"='Carson Mcmillan',"updated_at"=now()
WHERE lower("email")=lower('robert.bruce@lightspeedsystems.com') OR lower("name")=lower('Robert Bruce');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('Remote',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2021,"hire_month"=6,"hire_day"=14,"elt_leader"='Carson Mcmillan',"updated_at"=now()
WHERE lower("email")=lower('kevin.lasher@lightspeedsystems.com') OR lower("name")=lower('Kevin Lasher');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('Remote',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2021,"hire_month"=7,"hire_day"=6,"elt_leader"='Carson Mcmillan',"updated_at"=now()
WHERE lower("email")=lower('perry.sittser@lightspeedsystems.com') OR lower("name")=lower('Perry Sittser');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('12013 FITZHUGH ROAD',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2021,"hire_month"=8,"hire_day"=2,"elt_leader"='Carson Mcmillan',"updated_at"=now()
WHERE lower("email")=lower('eric.cruz@lightspeedsystems.com') OR lower("name")=lower('Eric Cruz');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('Remote',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2021,"hire_month"=10,"hire_day"=11,"elt_leader"='Carson Mcmillan',"updated_at"=now()
WHERE lower("email")=lower('jack.mcdonnell@lightspeedsystems.com') OR lower("name")=lower('Jack Mcdonnell');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('Remote',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2021,"hire_month"=11,"hire_day"=22,"elt_leader"='Carson Mcmillan',"updated_at"=now()
WHERE lower("email")=lower('van.mualcin@lightspeedsystems.com') OR lower("name")=lower('Van Mualcin');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('Remote',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2022,"hire_month"=2,"hire_day"=28,"elt_leader"='Carson Mcmillan',"updated_at"=now()
WHERE lower("email")=lower('carl.ahlstrand@lightspeedsystems.com') OR lower("name")=lower('Carl Ahlstrand');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('Remote',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2022,"hire_month"=3,"hire_day"=14,"elt_leader"='Carson Mcmillan',"updated_at"=now()
WHERE lower("email")=lower('steven.landwehr@lightspeedsystems.com') OR lower("name")=lower('Steven Landwehr');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('Remote',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2022,"hire_month"=4,"hire_day"=4,"elt_leader"='Carson Mcmillan',"updated_at"=now()
WHERE lower("email")=lower('alex.wade@lightspeedsystems.com') OR lower("name")=lower('Alex Wade');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('Remote',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2022,"hire_month"=7,"hire_day"=11,"elt_leader"='Carson Mcmillan',"updated_at"=now()
WHERE lower("email")=lower('neil.shaw@lightspeedsystems.com') OR lower("name")=lower('Neil Shaw');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('Remote',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2023,"hire_month"=4,"hire_day"=3,"elt_leader"='Carson Mcmillan',"updated_at"=now()
WHERE lower("email")=lower('nathan.johnson@lightspeedsystems.com') OR lower("name")=lower('Nathan Johnson');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('Remote',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2024,"hire_month"=2,"hire_day"=26,"elt_leader"='Carson Mcmillan',"updated_at"=now()
WHERE lower("email")=lower('wengel.huluka@lightspeedsystems.com') OR lower("name")=lower('Wengel Huluka');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('Remote',''),"location"),
  "business_unit"=COALESCE(NULLIF('STOPit Solutions',''),"business_unit"),
  "hire_year"=2025,"hire_month"=3,"hire_day"=1,"elt_leader"='Carson Mcmillan',"updated_at"=now()
WHERE lower("email")=lower('jai.pandu@lightspeedsystems.com') OR lower("name")=lower('Jai Pandu');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('Remote',''),"location"),
  "business_unit"=COALESCE(NULLIF('STOPit Solutions',''),"business_unit"),
  "hire_year"=2025,"hire_month"=3,"hire_day"=1,"elt_leader"='Carson Mcmillan',"updated_at"=now()
WHERE lower("email")=lower('gerard.jr.dantel@lightspeedsystems.com') OR lower("name")=lower('Gerard Jr Dantel');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('Remote',''),"location"),
  "business_unit"=COALESCE(NULLIF('STOPit Solutions',''),"business_unit"),
  "hire_year"=2025,"hire_month"=3,"hire_day"=1,"elt_leader"='Carson Mcmillan',"updated_at"=now()
WHERE lower("email")=lower('aiyana.mathew@lightspeedsystems.com') OR lower("name")=lower('Aiyana Mathew');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('12013 FITZHUGH ROAD',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2025,"hire_month"=5,"hire_day"=20,"elt_leader"='Carson Mcmillan',"updated_at"=now()
WHERE lower("email")=lower('justin.woolverton@lightspeedsystems.com') OR lower("name")=lower('Justin Woolverton');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('Remote',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2026,"hire_month"=5,"hire_day"=26,"elt_leader"='Jennifer Duer',"updated_at"=now()
WHERE lower("email")=lower('bryan.steele@lightspeedsystems.com') OR lower("name")=lower('Bryan Steele');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('12013 FITZHUGH ROAD',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2026,"hire_month"=5,"hire_day"=26,"elt_leader"='Carson Mcmillan',"updated_at"=now()
WHERE lower("email")=lower('winter.rhoden@lightspeedsystems.com') OR lower("name")=lower('Winter Rhoden');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('12013 FITZHUGH ROAD',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2015,"hire_month"=8,"hire_day"=3,"elt_leader"='Carson Mcmillan',"updated_at"=now()
WHERE lower("email")=lower('alexander.woods@lightspeedsystems.com') OR lower("name")=lower('Alexander Woods');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('Remote',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2019,"hire_month"=1,"hire_day"=11,"elt_leader"='Jennifer Duer',"updated_at"=now()
WHERE lower("email")=lower('michael.waszazak@lightspeedsystems.com') OR lower("name")=lower('Michael Waszazak');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('12013 FITZHUGH ROAD',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2012,"hire_month"=10,"hire_day"=22,"elt_leader"='Carson Mcmillan',"updated_at"=now()
WHERE lower("email")=lower('vernie.ogden@lightspeedsystems.com') OR lower("name")=lower('Vernie Ogden');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('12013 FITZHUGH ROAD',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2020,"hire_month"=7,"hire_day"=27,"elt_leader"='Carson Mcmillan',"updated_at"=now()
WHERE lower("email")=lower('rebecca.gould@lightspeedsystems.com') OR lower("name")=lower('Rebecca Gould');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('12013 FITZHUGH ROAD',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2024,"hire_month"=5,"hire_day"=6,"elt_leader"='Jennifer Duer',"updated_at"=now()
WHERE lower("email")=lower('hadley.james@lightspeedsystems.com') OR lower("name")=lower('Hadley James');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('Remote',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2024,"hire_month"=6,"hire_day"=24,"elt_leader"='Jennifer Duer',"updated_at"=now()
WHERE lower("email")=lower('matthew.burg@lightspeedsystems.com') OR lower("name")=lower('Matthew Burg');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('Remote',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2021,"hire_month"=5,"hire_day"=24,"elt_leader"='Jennifer Duer',"updated_at"=now()
WHERE lower("email")=lower('caitlin.mcdermott@lightspeedsystems.com') OR lower("name")=lower('Caitlin Mcdermott');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('Remote',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2021,"hire_month"=6,"hire_day"=22,"elt_leader"='Carson Mcmillan',"updated_at"=now()
WHERE lower("email")=lower('derek.laurie@lightspeedsystems.com') OR lower("name")=lower('Derek Laurie');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('Remote',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2022,"hire_month"=7,"hire_day"=25,"elt_leader"='Jennifer Duer',"updated_at"=now()
WHERE lower("email")=lower('jared.varner@lightspeedsystems.com') OR lower("name")=lower('Jared Varner');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('Remote',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2024,"hire_month"=1,"hire_day"=8,"elt_leader"='Carson Mcmillan',"updated_at"=now()
WHERE lower("email")=lower('jennifer.duer@lightspeedsystems.com') OR lower("name")=lower('Jennifer Duer');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('Remote',''),"location"),
  "business_unit"=COALESCE(NULLIF('STOPit Solutions',''),"business_unit"),
  "hire_year"=2025,"hire_month"=3,"hire_day"=1,"elt_leader"='Jennifer Duer',"updated_at"=now()
WHERE lower("email")=lower('gregory.artzt@lightspeedsystems.com') OR lower("name")=lower('Gregory Artzt');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('12013 FITZHUGH ROAD',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2026,"hire_month"=6,"hire_day"=23,"elt_leader"='Carson Mcmillan',"updated_at"=now()
WHERE lower("email")=lower('alexander.szabo@lightspeedsystems.com') OR lower("name")=lower('Alexander Szabo');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('12013 FITZHUGH ROAD',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2020,"hire_month"=11,"hire_day"=16,"elt_leader"='Carson Mcmillan',"updated_at"=now()
WHERE lower("email")=lower('michelle.mcgovern@lightspeedsystems.com') OR lower("name")=lower('Michelle Mcgovern');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('Remote',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2008,"hire_month"=10,"hire_day"=20,"elt_leader"='Carson Mcmillan',"updated_at"=now()
WHERE lower("email")=lower('christian.trahan@lightspeedsystems.com') OR lower("name")=lower('Christian Trahan');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('12013 FITZHUGH ROAD',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2021,"hire_month"=10,"hire_day"=18,"elt_leader"='Carson Mcmillan',"updated_at"=now()
WHERE lower("email")=lower('brian.truong@lightspeedsystems.com') OR lower("name")=lower('Brian Truong');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('Remote',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2021,"hire_month"=11,"hire_day"=8,"elt_leader"='Carson Mcmillan',"updated_at"=now()
WHERE lower("email")=lower('niels.dhollanderbarclay@lightspeedsystems.com') OR lower("name")=lower('Niels Dhollander-Barclay');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('Remote',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2023,"hire_month"=4,"hire_day"=10,"elt_leader"='Carson Mcmillan',"updated_at"=now()
WHERE lower("email")=lower('alexander.doria@lightspeedsystems.com') OR lower("name")=lower('Alexander Doria');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('12013 FITZHUGH ROAD',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2017,"hire_month"=1,"hire_day"=26,"elt_leader"='Carson Mcmillan',"updated_at"=now()
WHERE lower("email")=lower('brandon.jones@lightspeedsystems.com') OR lower("name")=lower('Brandon Jones');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('12013 FITZHUGH ROAD',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2008,"hire_month"=5,"hire_day"=27,"elt_leader"='Carson Mcmillan',"updated_at"=now()
WHERE lower("email")=lower('jeffrey.smith@lightspeedsystems.com') OR lower("name")=lower('Jeffrey Smith');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('Remote',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2014,"hire_month"=8,"hire_day"=18,"elt_leader"='Carson Mcmillan',"updated_at"=now()
WHERE lower("email")=lower('jared.accardo@lightspeedsystems.com') OR lower("name")=lower('Jared Accardo');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('12013 FITZHUGH ROAD',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2017,"hire_month"=9,"hire_day"=25,"elt_leader"='Carson Mcmillan',"updated_at"=now()
WHERE lower("email")=lower('trung.pham@lightspeedsystems.com') OR lower("name")=lower('Trung Pham');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('12013 FITZHUGH ROAD',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2020,"hire_month"=3,"hire_day"=23,"elt_leader"='Carson Mcmillan',"updated_at"=now()
WHERE lower("email")=lower('nicholas.chambers@lightspeedsystems.com') OR lower("name")=lower('Nicholas Chambers');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('12013 FITZHUGH ROAD',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2020,"hire_month"=3,"hire_day"=6,"elt_leader"='Carson Mcmillan',"updated_at"=now()
WHERE lower("email")=lower('andrew.cribari@lightspeedsystems.com') OR lower("name")=lower('Andrew Cribari');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('Remote',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2021,"hire_month"=6,"hire_day"=28,"elt_leader"='Carson Mcmillan',"updated_at"=now()
WHERE lower("email")=lower('charushila.awhad@lightspeedsystems.com') OR lower("name")=lower('Charushila Awhad');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('Remote',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2021,"hire_month"=7,"hire_day"=26,"elt_leader"='Carson Mcmillan',"updated_at"=now()
WHERE lower("email")=lower('gijo.johny@lightspeedsystems.com') OR lower("name")=lower('Gijo Johny');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('12013 FITZHUGH ROAD',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2021,"hire_month"=10,"hire_day"=4,"elt_leader"='Carson Mcmillan',"updated_at"=now()
WHERE lower("email")=lower('madhuri.balasubramanya@lightspeedsystems.com') OR lower("name")=lower('Madhuri Balasubramanya');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('Remote',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2021,"hire_month"=10,"hire_day"=25,"elt_leader"='Carson Mcmillan',"updated_at"=now()
WHERE lower("email")=lower('jeffrey.zwick@lightspeedsystems.com') OR lower("name")=lower('Jeffrey Zwick');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('Remote',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2022,"hire_month"=2,"hire_day"=28,"elt_leader"='Carson Mcmillan',"updated_at"=now()
WHERE lower("email")=lower('jenisha.karmacharya@lightspeedsystems.com') OR lower("name")=lower('Jenisha Karmacharya');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('12013 FITZHUGH ROAD',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2022,"hire_month"=8,"hire_day"=15,"elt_leader"='Carson Mcmillan',"updated_at"=now()
WHERE lower("email")=lower('michelle.vargas@lightspeedsystems.com') OR lower("name")=lower('Michelle Vargas');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('Remote',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2023,"hire_month"=10,"hire_day"=4,"elt_leader"='Carson Mcmillan',"updated_at"=now()
WHERE lower("email")=lower('kyle.escobar@lightspeedsystems.com') OR lower("name")=lower('Kyle Escobar');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('12013 FITZHUGH ROAD',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2026,"hire_month"=5,"hire_day"=26,"elt_leader"='Carson Mcmillan',"updated_at"=now()
WHERE lower("email")=lower('ava.friloux@lightspeedsystems.com') OR lower("name")=lower('Ava Friloux');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('169 NEW LONDON ROAD',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2012,"hire_month"=10,"hire_day"=1,"elt_leader"='Carson Mcmillan',"updated_at"=now()
WHERE lower("email")=lower('leigh.morris@lightspeedsystems.com') OR lower("name")=lower('Leigh Morris');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('Remote',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2016,"hire_month"=2,"hire_day"=22,"elt_leader"='Wes Lawrence',"updated_at"=now()
WHERE lower("email")=lower('enrique.michel@lightspeedsystems.com') OR lower("name")=lower('Enrique Michel');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('12013 FITZHUGH ROAD',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2026,"hire_month"=1,"hire_day"=13,"elt_leader"='Wes Lawrence',"updated_at"=now()
WHERE lower("email")=lower('juan.rodriguez.maldonado@lightspeedsystems.com') OR lower("name")=lower('Juan Rodriguez Maldonado');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('Remote',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2019,"hire_month"=5,"hire_day"=10,"elt_leader"='Wes Lawrence',"updated_at"=now()
WHERE lower("email")=lower('chasity.lyson@lightspeedsystems.com') OR lower("name")=lower('Chasity Lyson');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('12013 FITZHUGH ROAD',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2014,"hire_month"=9,"hire_day"=29,"elt_leader"='Wes Lawrence',"updated_at"=now()
WHERE lower("email")=lower('marie.wittry@lightspeedsystems.com') OR lower("name")=lower('Marie Wittry');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('12013 FITZHUGH ROAD',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=1999,"hire_month"=7,"hire_day"=1,"elt_leader"='Wes Lawrence',"updated_at"=now()
WHERE lower("email")=lower('wing.mar@lightspeedsystems.com') OR lower("name")=lower('Wing Mar');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('12013 FITZHUGH ROAD',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2020,"hire_month"=3,"hire_day"=2,"elt_leader"='Wes Lawrence',"updated_at"=now()
WHERE lower("email")=lower('abraham.ybarra@lightspeedsystems.com') OR lower("name")=lower('Abraham Ybarra');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('Remote',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2023,"hire_month"=1,"hire_day"=3,"elt_leader"='Wes Lawrence',"updated_at"=now()
WHERE lower("email")=lower('alyssa.ann.silva@lightspeedsystems.com') OR lower("name")=lower('Alyssa Ann Silva');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('Remote',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2024,"hire_month"=4,"hire_day"=22,"elt_leader"='Wes Lawrence',"updated_at"=now()
WHERE lower("email")=lower('saul.trejo@lightspeedsystems.com') OR lower("name")=lower('Saul Trejo');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('12013 FITZHUGH ROAD',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2024,"hire_month"=4,"hire_day"=29,"elt_leader"='Wes Lawrence',"updated_at"=now()
WHERE lower("email")=lower('cameron.meyer@lightspeedsystems.com') OR lower("name")=lower('Cameron Meyer');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('Remote',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2024,"hire_month"=5,"hire_day"=28,"elt_leader"='Wes Lawrence',"updated_at"=now()
WHERE lower("email")=lower('dylan.claiborne@lightspeedsystems.com') OR lower("name")=lower('Dylan Claiborne');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('Remote',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2024,"hire_month"=8,"hire_day"=5,"elt_leader"='Wes Lawrence',"updated_at"=now()
WHERE lower("email")=lower('travis.bullock@lightspeedsystems.com') OR lower("name")=lower('Travis Bullock');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('12013 FITZHUGH ROAD',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2025,"hire_month"=5,"hire_day"=6,"elt_leader"='Wes Lawrence',"updated_at"=now()
WHERE lower("email")=lower('frank.romero@lightspeedsystems.com') OR lower("name")=lower('Frank Romero');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('169 NEW LONDON ROAD',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2026,"hire_month"=4,"hire_day"=7,"elt_leader"='Wes Lawrence',"updated_at"=now()
WHERE lower("email")=lower('katy.shawcross@lightspeedsystems.com') OR lower("name")=lower('Katy Shawcross');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('12013 FITZHUGH ROAD',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2026,"hire_month"=6,"hire_day"=2,"elt_leader"='Wes Lawrence',"updated_at"=now()
WHERE lower("email")=lower('syed.muhammad.hassaan.gillani@lightspeedsystems.com') OR lower("name")=lower('Syed Muhammad Hassaan Gillani');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('169 NEW LONDON ROAD',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2025,"hire_month"=6,"hire_day"=16,"elt_leader"='Wes Lawrence',"updated_at"=now()
WHERE lower("email")=lower('andy.bennetta@lightspeedsystems.com') OR lower("name")=lower('Andy Bennetta');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('169 NEW LONDON ROAD',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2025,"hire_month"=5,"hire_day"=27,"elt_leader"='Wes Lawrence',"updated_at"=now()
WHERE lower("email")=lower('jide.oke@lightspeedsystems.com') OR lower("name")=lower('Jide Oke');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('169 NEW LONDON ROAD',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2025,"hire_month"=6,"hire_day"=23,"elt_leader"='Wes Lawrence',"updated_at"=now()
WHERE lower("email")=lower('khaled.uddin@lightspeedsystems.com') OR lower("name")=lower('Khaled Uddin');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('169 NEW LONDON ROAD',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2020,"hire_month"=8,"hire_day"=5,"elt_leader"='Wes Lawrence',"updated_at"=now()
WHERE lower("email")=lower('lewis.brown@lightspeedsystems.com') OR lower("name")=lower('Lewis Brown');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('12013 FITZHUGH ROAD',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2025,"hire_month"=10,"hire_day"=21,"elt_leader"='Wes Lawrence',"updated_at"=now()
WHERE lower("email")=lower('tu.ngo@lightspeedsystems.com') OR lower("name")=lower('Tu Ngo');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('12013 FITZHUGH ROAD',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2021,"hire_month"=4,"hire_day"=12,"elt_leader"='Wes Lawrence',"updated_at"=now()
WHERE lower("email")=lower('jason.veselka@lightspeedsystems.com') OR lower("name")=lower('Jason Veselka');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('12013 FITZHUGH ROAD',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2021,"hire_month"=8,"hire_day"=16,"elt_leader"='Wes Lawrence',"updated_at"=now()
WHERE lower("email")=lower('sinead.williams@lightspeedsystems.com') OR lower("name")=lower('Sinead Williams');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('12013 FITZHUGH ROAD',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2021,"hire_month"=10,"hire_day"=11,"elt_leader"='Wes Lawrence',"updated_at"=now()
WHERE lower("email")=lower('december.wilks@lightspeedsystems.com') OR lower("name")=lower('December Wilks');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('Remote',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2022,"hire_month"=10,"hire_day"=17,"elt_leader"='Wes Lawrence',"updated_at"=now()
WHERE lower("email")=lower('colleen.clark@lightspeedsystems.com') OR lower("name")=lower('Colleen Clark');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('Remote',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2023,"hire_month"=3,"hire_day"=27,"elt_leader"='Wes Lawrence',"updated_at"=now()
WHERE lower("email")=lower('whitney.veatch@lightspeedsystems.com') OR lower("name")=lower('Whitney Veatch');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('Remote',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2023,"hire_month"=6,"hire_day"=5,"elt_leader"='Wes Lawrence',"updated_at"=now()
WHERE lower("email")=lower('angela.mazza@lightspeedsystems.com') OR lower("name")=lower('Angela Mazza');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('Remote',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2023,"hire_month"=12,"hire_day"=4,"elt_leader"='Wes Lawrence',"updated_at"=now()
WHERE lower("email")=lower('christina.mares@lightspeedsystems.com') OR lower("name")=lower('Christina Mares');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('Remote',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2023,"hire_month"=12,"hire_day"=4,"elt_leader"='Wes Lawrence',"updated_at"=now()
WHERE lower("email")=lower('nykayla.carter@lightspeedsystems.com') OR lower("name")=lower('Nykayla Carter');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('Remote',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2023,"hire_month"=12,"hire_day"=4,"elt_leader"='Wes Lawrence',"updated_at"=now()
WHERE lower("email")=lower('shanna.johnson@lightspeedsystems.com') OR lower("name")=lower('Shanna Johnson');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('Remote',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2023,"hire_month"=12,"hire_day"=4,"elt_leader"='Wes Lawrence',"updated_at"=now()
WHERE lower("email")=lower('danielle.rubio@lightspeedsystems.com') OR lower("name")=lower('Danielle Rubio');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('Remote',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2024,"hire_month"=5,"hire_day"=13,"elt_leader"='Wes Lawrence',"updated_at"=now()
WHERE lower("email")=lower('cristal.cuellar@lightspeedsystems.com') OR lower("name")=lower('Cristal Cuellar');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('Remote',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2024,"hire_month"=5,"hire_day"=20,"elt_leader"='Wes Lawrence',"updated_at"=now()
WHERE lower("email")=lower('nathan.davila@lightspeedsystems.com') OR lower("name")=lower('Nathan Davila');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('Remote',''),"location"),
  "business_unit"=COALESCE(NULLIF('STOPit Solutions',''),"business_unit"),
  "hire_year"=2025,"hire_month"=3,"hire_day"=1,"elt_leader"='Wes Lawrence',"updated_at"=now()
WHERE lower("email")=lower('jolie.boodansingh@lightspeedsystems.com') OR lower("name")=lower('Jolie Boodansingh');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('Remote',''),"location"),
  "business_unit"=COALESCE(NULLIF('STOPit Solutions',''),"business_unit"),
  "hire_year"=2025,"hire_month"=3,"hire_day"=1,"elt_leader"='Wes Lawrence',"updated_at"=now()
WHERE lower("email")=lower('lydell.craig@lightspeedsystems.com') OR lower("name")=lower('Lydell Craig');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('Remote',''),"location"),
  "business_unit"=COALESCE(NULLIF('STOPit Solutions',''),"business_unit"),
  "hire_year"=2025,"hire_month"=3,"hire_day"=1,"elt_leader"='Wes Lawrence',"updated_at"=now()
WHERE lower("email")=lower('tracy.craig@lightspeedsystems.com') OR lower("name")=lower('Tracy Craig');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('Remote',''),"location"),
  "business_unit"=COALESCE(NULLIF('STOPit Solutions',''),"business_unit"),
  "hire_year"=2025,"hire_month"=3,"hire_day"=1,"elt_leader"='Wes Lawrence',"updated_at"=now()
WHERE lower("email")=lower('jerry.flores@lightspeedsystems.com') OR lower("name")=lower('Jerry Flores');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('Remote',''),"location"),
  "business_unit"=COALESCE(NULLIF('STOPit Solutions',''),"business_unit"),
  "hire_year"=2025,"hire_month"=3,"hire_day"=1,"elt_leader"='Wes Lawrence',"updated_at"=now()
WHERE lower("email")=lower('jason.montes@lightspeedsystems.com') OR lower("name")=lower('Jason Montes');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('Remote',''),"location"),
  "business_unit"=COALESCE(NULLIF('STOPit Solutions',''),"business_unit"),
  "hire_year"=2025,"hire_month"=3,"hire_day"=1,"elt_leader"='Wes Lawrence',"updated_at"=now()
WHERE lower("email")=lower('zakkiyya.purnell@lightspeedsystems.com') OR lower("name")=lower('Zakkiyya Purnell');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('Remote',''),"location"),
  "business_unit"=COALESCE(NULLIF('STOPit Solutions',''),"business_unit"),
  "hire_year"=2025,"hire_month"=3,"hire_day"=1,"elt_leader"='Wes Lawrence',"updated_at"=now()
WHERE lower("email")=lower('katelin.revels@lightspeedsystems.com') OR lower("name")=lower('Katelin Revels');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('Remote',''),"location"),
  "business_unit"=COALESCE(NULLIF('STOPit Solutions',''),"business_unit"),
  "hire_year"=2025,"hire_month"=3,"hire_day"=1,"elt_leader"='Wes Lawrence',"updated_at"=now()
WHERE lower("email")=lower('shakira.romero@lightspeedsystems.com') OR lower("name")=lower('Shakira Romero');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('Remote',''),"location"),
  "business_unit"=COALESCE(NULLIF('STOPit Solutions',''),"business_unit"),
  "hire_year"=2025,"hire_month"=3,"hire_day"=1,"elt_leader"='Wes Lawrence',"updated_at"=now()
WHERE lower("email")=lower('kurstye.tillmon@lightspeedsystems.com') OR lower("name")=lower('Kurstye Tillmon');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('Remote',''),"location"),
  "business_unit"=COALESCE(NULLIF('STOPit Solutions',''),"business_unit"),
  "hire_year"=2025,"hire_month"=3,"hire_day"=1,"elt_leader"='Wes Lawrence',"updated_at"=now()
WHERE lower("email")=lower('armahn.turk@lightspeedsystems.com') OR lower("name")=lower('Armahn Turk');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('Remote',''),"location"),
  "business_unit"=COALESCE(NULLIF('STOPit Solutions',''),"business_unit"),
  "hire_year"=2025,"hire_month"=3,"hire_day"=1,"elt_leader"='Wes Lawrence',"updated_at"=now()
WHERE lower("email")=lower('tichiere.womble@lightspeedsystems.com') OR lower("name")=lower('Tichiere Womble');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('Remote',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2025,"hire_month"=12,"hire_day"=1,"elt_leader"='Wes Lawrence',"updated_at"=now()
WHERE lower("email")=lower('tameka.smith@lightspeedsystems.com') OR lower("name")=lower('Tameka Smith');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('Remote',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2025,"hire_month"=12,"hire_day"=8,"elt_leader"='Wes Lawrence',"updated_at"=now()
WHERE lower("email")=lower('marlisa.mungo@lightspeedsystems.com') OR lower("name")=lower('Marlisa Mungo');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('169 NEW LONDON ROAD',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2026,"hire_month"=3,"hire_day"=9,"elt_leader"='Wes Lawrence',"updated_at"=now()
WHERE lower("email")=lower('kian.curran@lightspeedsystems.com') OR lower("name")=lower('Kian Curran');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('Remote',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2026,"hire_month"=3,"hire_day"=9,"elt_leader"='Wes Lawrence',"updated_at"=now()
WHERE lower("email")=lower('danielle.adams@lightspeedsystems.com') OR lower("name")=lower('Danielle Adams');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('Remote',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2026,"hire_month"=3,"hire_day"=9,"elt_leader"='Wes Lawrence',"updated_at"=now()
WHERE lower("email")=lower('albert.garcia@lightspeedsystems.com') OR lower("name")=lower('Albert Garcia');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('Remote',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2026,"hire_month"=3,"hire_day"=9,"elt_leader"='Wes Lawrence',"updated_at"=now()
WHERE lower("email")=lower('rashida.brown@lightspeedsystems.com') OR lower("name")=lower('Rashida Brown');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('Remote',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2026,"hire_month"=3,"hire_day"=30,"elt_leader"='Wes Lawrence',"updated_at"=now()
WHERE lower("email")=lower('nathan.estrada@lightspeedsystems.com') OR lower("name")=lower('Nathan Estrada');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('169 NEW LONDON ROAD',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2021,"hire_month"=8,"hire_day"=2,"elt_leader"='Wes Lawrence',"updated_at"=now()
WHERE lower("email")=lower('ricky.salter@lightspeedsystems.com') OR lower("name")=lower('Ricky Salter');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('12013 FITZHUGH ROAD',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2021,"hire_month"=2,"hire_day"=16,"elt_leader"='Carson Mcmillan',"updated_at"=now()
WHERE lower("email")=lower('chase.masiel@lightspeedsystems.com') OR lower("name")=lower('Chase Masiel');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('Remote',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2022,"hire_month"=5,"hire_day"=25,"elt_leader"='Carson Mcmillan',"updated_at"=now()
WHERE lower("email")=lower('hailey.thomas@lightspeedsystems.com') OR lower("name")=lower('Hailey Thomas');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('Remote',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2026,"hire_month"=3,"hire_day"=16,"elt_leader"='Wes Lawrence',"updated_at"=now()
WHERE lower("email")=lower('ryan.stufflebeam@lightspeedsystems.com') OR lower("name")=lower('Ryan Stufflebeam');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('12013 FITZHUGH ROAD',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2019,"hire_month"=9,"hire_day"=20,"elt_leader"='Wes Lawrence',"updated_at"=now()
WHERE lower("email")=lower('ramy.sahouri@lightspeedsystems.com') OR lower("name")=lower('Ramy Sahouri');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('Remote',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2020,"hire_month"=10,"hire_day"=19,"elt_leader"='Wes Lawrence',"updated_at"=now()
WHERE lower("email")=lower('wesley.cunningham@lightspeedsystems.com') OR lower("name")=lower('Wesley Cunningham');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('Remote',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2022,"hire_month"=12,"hire_day"=12,"elt_leader"='Wes Lawrence',"updated_at"=now()
WHERE lower("email")=lower('quinten.oldaker@lightspeedsystems.com') OR lower("name")=lower('Quinten Oldaker');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('Remote',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2023,"hire_month"=4,"hire_day"=3,"elt_leader"='Wes Lawrence',"updated_at"=now()
WHERE lower("email")=lower('christina.atkinson@lightspeedsystems.com') OR lower("name")=lower('Christina Atkinson');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('12013 FITZHUGH ROAD',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2026,"hire_month"=5,"hire_day"=19,"elt_leader"='Wes Lawrence',"updated_at"=now()
WHERE lower("email")=lower('dante.munoz@lightspeedsystems.com') OR lower("name")=lower('Dante Munoz');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('Remote',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2004,"hire_month"=12,"hire_day"=13,"elt_leader"='Carson Mcmillan',"updated_at"=now()
WHERE lower("email")=lower('christopher.newkirk@lightspeedsystems.com') OR lower("name")=lower('Christopher Newkirk');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('Remote',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2017,"hire_month"=11,"hire_day"=6,"elt_leader"='Carson Mcmillan',"updated_at"=now()
WHERE lower("email")=lower('joseph.decarlo@lightspeedsystems.com') OR lower("name")=lower('Joseph Decarlo');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('Remote',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2021,"hire_month"=4,"hire_day"=19,"elt_leader"='Carson Mcmillan',"updated_at"=now()
WHERE lower("email")=lower('ryan.oglesby@lightspeedsystems.com') OR lower("name")=lower('Ryan Oglesby');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('Remote',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2021,"hire_month"=7,"hire_day"=6,"elt_leader"='Carson Mcmillan',"updated_at"=now()
WHERE lower("email")=lower('matthew.ames@lightspeedsystems.com') OR lower("name")=lower('Matthew Ames');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('12013 FITZHUGH ROAD',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2021,"hire_month"=7,"hire_day"=20,"elt_leader"='Carson Mcmillan',"updated_at"=now()
WHERE lower("email")=lower('esteban.diocares@lightspeedsystems.com') OR lower("name")=lower('Esteban Diocares');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('169 NEW LONDON ROAD',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2022,"hire_month"=2,"hire_day"=28,"elt_leader"='Carson Mcmillan',"updated_at"=now()
WHERE lower("email")=lower('anita.krueger@lightspeedsystems.com') OR lower("name")=lower('Anita Krueger');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('12013 FITZHUGH ROAD',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2008,"hire_month"=10,"hire_day"=1,"elt_leader"='Brian Thomas',"updated_at"=now()
WHERE lower("email")=lower('christopher.travis@lightspeedsystems.com') OR lower("name")=lower('Christopher Travis');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('12013 FITZHUGH ROAD',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2009,"hire_month"=8,"hire_day"=31,"elt_leader"='Chris Travis',"updated_at"=now()
WHERE lower("email")=lower('michael.durando@lightspeedsystems.com') OR lower("name")=lower('Michael Durando');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('12013 FITZHUGH ROAD',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2000,"hire_month"=2,"hire_day"=25,"elt_leader"='Chris Travis',"updated_at"=now()
WHERE lower("email")=lower('michael.boggess@lightspeedsystems.com') OR lower("name")=lower('Michael Boggess');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('Remote',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2022,"hire_month"=6,"hire_day"=1,"elt_leader"='Chris Travis',"updated_at"=now()
WHERE lower("email")=lower('scott.meeks@lightspeedsystems.com') OR lower("name")=lower('Scott Meeks');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('12013 FITZHUGH ROAD',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2021,"hire_month"=3,"hire_day"=22,"elt_leader"='Chris Travis',"updated_at"=now()
WHERE lower("email")=lower('sergio.villegas@lightspeedsystems.com') OR lower("name")=lower('Sergio Villegas');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('Remote',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2021,"hire_month"=8,"hire_day"=16,"elt_leader"='Chris Travis',"updated_at"=now()
WHERE lower("email")=lower('alecia.boggess@lightspeedsystems.com') OR lower("name")=lower('Alecia Boggess');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('Remote',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2022,"hire_month"=1,"hire_day"=8,"elt_leader"='Chris Travis',"updated_at"=now()
WHERE lower("email")=lower('ross.mcaden@lightspeedsystems.com') OR lower("name")=lower('Ross Mcaden');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('Remote',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2022,"hire_month"=7,"hire_day"=12,"elt_leader"='Chris Travis',"updated_at"=now()
WHERE lower("email")=lower('keaton.smith@lightspeedsystems.com') OR lower("name")=lower('Keaton Smith');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('12013 FITZHUGH ROAD',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2022,"hire_month"=9,"hire_day"=6,"elt_leader"='Chris Travis',"updated_at"=now()
WHERE lower("email")=lower('jake.de.la.garrigue@lightspeedsystems.com') OR lower("name")=lower('Jake De La Garrigue');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('12013 FITZHUGH ROAD',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2023,"hire_month"=5,"hire_day"=22,"elt_leader"='Chris Travis',"updated_at"=now()
WHERE lower("email")=lower('michael.roddey@lightspeedsystems.com') OR lower("name")=lower('Michael Roddey');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('12013 FITZHUGH ROAD',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2024,"hire_month"=3,"hire_day"=4,"elt_leader"='Chris Travis',"updated_at"=now()
WHERE lower("email")=lower('christopher.dunn@lightspeedsystems.com') OR lower("name")=lower('Christopher Dunn');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('Remote',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2024,"hire_month"=4,"hire_day"=3,"elt_leader"='Chris Travis',"updated_at"=now()
WHERE lower("email")=lower('casey.butera@lightspeedsystems.com') OR lower("name")=lower('Casey Butera');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('12013 FITZHUGH ROAD',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2024,"hire_month"=12,"hire_day"=3,"elt_leader"='Kirk Orgeldinger',"updated_at"=now()
WHERE lower("email")=lower('brooke.brown@lightspeedsystems.com') OR lower("name")=lower('Brooke Brown');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('Remote',''),"location"),
  "business_unit"=COALESCE(NULLIF('STOPit Solutions',''),"business_unit"),
  "hire_year"=2025,"hire_month"=3,"hire_day"=1,"elt_leader"='Chris Travis',"updated_at"=now()
WHERE lower("email")=lower('kevin.askew@lightspeedsystems.com') OR lower("name")=lower('Kevin Askew');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('Remote',''),"location"),
  "business_unit"=COALESCE(NULLIF('STOPit Solutions',''),"business_unit"),
  "hire_year"=2025,"hire_month"=3,"hire_day"=1,"elt_leader"='Chris Travis',"updated_at"=now()
WHERE lower("email")=lower('nicholas.zema@lightspeedsystems.com') OR lower("name")=lower('Nicholas Zema');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('Remote',''),"location"),
  "business_unit"=COALESCE(NULLIF('STOPit Solutions',''),"business_unit"),
  "hire_year"=2025,"hire_month"=3,"hire_day"=1,"elt_leader"='Chris Travis',"updated_at"=now()
WHERE lower("email")=lower('erika.johnson@lightspeedsystems.com') OR lower("name")=lower('Erika Johnson');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('Remote',''),"location"),
  "business_unit"=COALESCE(NULLIF('STOPit Solutions',''),"business_unit"),
  "hire_year"=2025,"hire_month"=3,"hire_day"=1,"elt_leader"='Chris Travis',"updated_at"=now()
WHERE lower("email")=lower('ann.marie.martinez@lightspeedsystems.com') OR lower("name")=lower('Ann Marie Martinez');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('12013 FITZHUGH ROAD',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2025,"hire_month"=9,"hire_day"=2,"elt_leader"='Chris Travis',"updated_at"=now()
WHERE lower("email")=lower('spencer.smith@lightspeedsystems.com') OR lower("name")=lower('Spencer Smith');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('12013 FITZHUGH ROAD',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2025,"hire_month"=10,"hire_day"=28,"elt_leader"='Chris Travis',"updated_at"=now()
WHERE lower("email")=lower('andrew.fowler@lightspeedsystems.com') OR lower("name")=lower('Andrew Fowler');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('12013 FITZHUGH ROAD',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2026,"hire_month"=1,"hire_day"=6,"elt_leader"='Chris Travis',"updated_at"=now()
WHERE lower("email")=lower('lauren.mcnair@lightspeedsystems.com') OR lower("name")=lower('Lauren Mcnair');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('169 NEW LONDON ROAD',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2026,"hire_month"=1,"hire_day"=5,"elt_leader"='Colin Mccabe',"updated_at"=now()
WHERE lower("email")=lower('tania.mackie@lightspeedsystems.com') OR lower("name")=lower('Tania Mackie');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('169 NEW LONDON ROAD',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2026,"hire_month"=2,"hire_day"=2,"elt_leader"='Colin Mccabe',"updated_at"=now()
WHERE lower("email")=lower('sam.howard@lightspeedsystems.com') OR lower("name")=lower('Sam Howard');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('12013 FITZHUGH ROAD',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2026,"hire_month"=3,"hire_day"=3,"elt_leader"='Chris Travis',"updated_at"=now()
WHERE lower("email")=lower('nicole.greig@lightspeedsystems.com') OR lower("name")=lower('Nicole Greig');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('Remote',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2026,"hire_month"=3,"hire_day"=16,"elt_leader"='Chris Travis',"updated_at"=now()
WHERE lower("email")=lower('jaeden.richards@lightspeedsystems.com') OR lower("name")=lower('Jaeden Richards');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('12013 FITZHUGH ROAD',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2026,"hire_month"=5,"hire_day"=5,"elt_leader"='Kirk Orgeldinger',"updated_at"=now()
WHERE lower("email")=lower('nicole.tribo@lightspeedsystems.com') OR lower("name")=lower('Nicole Tribo');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('169 NEW LONDON ROAD',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2023,"hire_month"=5,"hire_day"=9,"elt_leader"='Colin Mccabe',"updated_at"=now()
WHERE lower("email")=lower('christopher.spink@lightspeedsystems.com') OR lower("name")=lower('Christopher Spink');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('169 NEW LONDON ROAD',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2022,"hire_month"=8,"hire_day"=1,"elt_leader"='Chris Travis',"updated_at"=now()
WHERE lower("email")=lower('colin.mccabe@lightspeedsystems.com') OR lower("name")=lower('Colin Mccabe');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('169 NEW LONDON ROAD',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2024,"hire_month"=6,"hire_day"=4,"elt_leader"='Colin Mccabe',"updated_at"=now()
WHERE lower("email")=lower('harry.saunders@lightspeedsystems.com') OR lower("name")=lower('Harry Saunders');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('169 NEW LONDON ROAD',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2017,"hire_month"=3,"hire_day"=1,"elt_leader"='Colin Mccabe',"updated_at"=now()
WHERE lower("email")=lower('kiah.long@lightspeedsystems.com') OR lower("name")=lower('Kiah Long');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('169 NEW LONDON ROAD',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2022,"hire_month"=4,"hire_day"=4,"elt_leader"='Colin Mccabe',"updated_at"=now()
WHERE lower("email")=lower('shaun.phillips@lightspeedsystems.com') OR lower("name")=lower('Shaun Phillips');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('Remote',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2011,"hire_month"=4,"hire_day"=25,"elt_leader"='Wes Lawrence',"updated_at"=now()
WHERE lower("email")=lower('william.long@lightspeedsystems.com') OR lower("name")=lower('William Long');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('Remote',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2022,"hire_month"=6,"hire_day"=27,"elt_leader"='Wes Lawrence',"updated_at"=now()
WHERE lower("email")=lower('trevor.davis@lightspeedsystems.com') OR lower("name")=lower('Trevor Davis');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('Remote',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2022,"hire_month"=11,"hire_day"=7,"elt_leader"='Wes Lawrence',"updated_at"=now()
WHERE lower("email")=lower('matthew.nelson@lightspeedsystems.com') OR lower("name")=lower('Matthew Nelson');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('Remote',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2024,"hire_month"=6,"hire_day"=24,"elt_leader"='Wes Lawrence',"updated_at"=now()
WHERE lower("email")=lower('robert.hancock@lightspeedsystems.com') OR lower("name")=lower('Robert Hancock');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('Remote',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2025,"hire_month"=3,"hire_day"=17,"elt_leader"='Wes Lawrence',"updated_at"=now()
WHERE lower("email")=lower('austin.sweet@lightspeedsystems.com') OR lower("name")=lower('Austin Sweet');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('Remote',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2025,"hire_month"=9,"hire_day"=29,"elt_leader"='Wes Lawrence',"updated_at"=now()
WHERE lower("email")=lower('bradley.rowe@lightspeedsystems.com') OR lower("name")=lower('Bradley Rowe');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('Remote',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2025,"hire_month"=9,"hire_day"=30,"elt_leader"='Wes Lawrence',"updated_at"=now()
WHERE lower("email")=lower('daniel.dunn@lightspeedsystems.com') OR lower("name")=lower('Daniel Dunn');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('Remote',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2025,"hire_month"=12,"hire_day"=2,"elt_leader"='Wes Lawrence',"updated_at"=now()
WHERE lower("email")=lower('alexander.crouse@lightspeedsystems.com') OR lower("name")=lower('Alexander Crouse');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('Remote',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2026,"hire_month"=2,"hire_day"=9,"elt_leader"='Wes Lawrence',"updated_at"=now()
WHERE lower("email")=lower('alexander.sands@lightspeedsystems.com') OR lower("name")=lower('Alexander Sands');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('Remote',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2026,"hire_month"=6,"hire_day"=15,"elt_leader"='Wes Lawrence',"updated_at"=now()
WHERE lower("email")=lower('charles.bryant@lightspeedsystems.com') OR lower("name")=lower('Charles Bryant');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('Remote',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2026,"hire_month"=6,"hire_day"=15,"elt_leader"='Wes Lawrence',"updated_at"=now()
WHERE lower("email")=lower('shad.mcgaha@lightspeedsystems.com') OR lower("name")=lower('Shad Mcgaha');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('Remote',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2023,"hire_month"=3,"hire_day"=27,"elt_leader"='Wes Lawrence',"updated_at"=now()
WHERE lower("email")=lower('colin.fulton@lightspeedsystems.com') OR lower("name")=lower('Colin Fulton');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('169 NEW LONDON ROAD',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2020,"hire_month"=10,"hire_day"=26,"elt_leader"='Wes Lawrence',"updated_at"=now()
WHERE lower("email")=lower('joel.walmsley@lightspeedsystems.com') OR lower("name")=lower('Joel Walmsley');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('169 NEW LONDON ROAD',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2015,"hire_month"=6,"hire_day"=10,"elt_leader"='Wes Lawrence',"updated_at"=now()
WHERE lower("email")=lower('richard.chown@lightspeedsystems.com') OR lower("name")=lower('Richard Chown');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('Remote',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2023,"hire_month"=1,"hire_day"=9,"elt_leader"='Wes Lawrence',"updated_at"=now()
WHERE lower("email")=lower('krista.delk@lightspeedsystems.com') OR lower("name")=lower('Krista Delk');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('Remote',''),"location"),
  "business_unit"=COALESCE(NULLIF('STOPit Solutions',''),"business_unit"),
  "hire_year"=2025,"hire_month"=3,"hire_day"=1,"elt_leader"='Wes Lawrence',"updated_at"=now()
WHERE lower("email")=lower('teresa.reuter@lightspeedsystems.com') OR lower("name")=lower('Teresa Reuter');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('Remote',''),"location"),
  "business_unit"=COALESCE(NULLIF('STOPit Solutions',''),"business_unit"),
  "hire_year"=2025,"hire_month"=3,"hire_day"=1,"elt_leader"='Wes Lawrence',"updated_at"=now()
WHERE lower("email")=lower('cindy.moore@lightspeedsystems.com') OR lower("name")=lower('Cindy Moore');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('Remote',''),"location"),
  "business_unit"=COALESCE(NULLIF('STOPit Solutions',''),"business_unit"),
  "hire_year"=2025,"hire_month"=3,"hire_day"=1,"elt_leader"='Wes Lawrence',"updated_at"=now()
WHERE lower("email")=lower('samantha.revels@lightspeedsystems.com') OR lower("name")=lower('Samantha Revels');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('Remote',''),"location"),
  "business_unit"=COALESCE(NULLIF('STOPit Solutions',''),"business_unit"),
  "hire_year"=2025,"hire_month"=3,"hire_day"=1,"elt_leader"='Wes Lawrence',"updated_at"=now()
WHERE lower("email")=lower('alyssa.russo@lightspeedsystems.com') OR lower("name")=lower('Alyssa Russo');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('Remote',''),"location"),
  "business_unit"=COALESCE(NULLIF('STOPit Solutions',''),"business_unit"),
  "hire_year"=2025,"hire_month"=3,"hire_day"=1,"elt_leader"='Wes Lawrence',"updated_at"=now()
WHERE lower("email")=lower('casey.hann@lightspeedsystems.com') OR lower("name")=lower('Casey Hann');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('Remote',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2023,"hire_month"=10,"hire_day"=23,"elt_leader"='Kirk Orgeldinger',"updated_at"=now()
WHERE lower("email")=lower('luke.shearin@lightspeedsystems.com') OR lower("name")=lower('Luke Shearin');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('Remote',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2010,"hire_month"=12,"hire_day"=1,"elt_leader"='Brian Thomas',"updated_at"=now()
WHERE lower("email")=lower('amy.bennett@lightspeedsystems.com') OR lower("name")=lower('Amy Bennett');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('12013 FITZHUGH ROAD',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2020,"hire_month"=8,"hire_day"=31,"elt_leader"='Amy Bennett',"updated_at"=now()
WHERE lower("email")=lower('amanda.gorena@lightspeedsystems.com') OR lower("name")=lower('Amanda Gorena');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('12013 FITZHUGH ROAD',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2024,"hire_month"=5,"hire_day"=14,"elt_leader"='Amy Bennett',"updated_at"=now()
WHERE lower("email")=lower('grace.mellette@lightspeedsystems.com') OR lower("name")=lower('Grace Mellette');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('Remote',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2026,"hire_month"=3,"hire_day"=2,"elt_leader"='Amy Bennett',"updated_at"=now()
WHERE lower("email")=lower('marcos.suarez@lightspeedsystems.com') OR lower("name")=lower('Marcos Suarez');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('12013 FITZHUGH ROAD',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2026,"hire_month"=5,"hire_day"=26,"elt_leader"='Amy Bennett',"updated_at"=now()
WHERE lower("email")=lower('olivia.gibbons@lightspeedsystems.com') OR lower("name")=lower('Olivia Gibbons');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('12013 FITZHUGH ROAD',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2026,"hire_month"=5,"hire_day"=26,"elt_leader"='Amy Bennett',"updated_at"=now()
WHERE lower("email")=lower('emma.stewart@lightspeedsystems.com') OR lower("name")=lower('Emma Stewart');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('169 NEW LONDON ROAD',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2010,"hire_month"=5,"hire_day"=4,"elt_leader"='Amy Bennett',"updated_at"=now()
WHERE lower("email")=lower('liam.roberts@lightspeedsystems.com') OR lower("name")=lower('Liam Roberts');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('169 NEW LONDON ROAD',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2025,"hire_month"=5,"hire_day"=19,"elt_leader"='Amy Bennett',"updated_at"=now()
WHERE lower("email")=lower('megan.black@lightspeedsystems.com') OR lower("name")=lower('Megan Black');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('12013 FITZHUGH ROAD',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2025,"hire_month"=10,"hire_day"=7,"elt_leader"='Amy Bennett',"updated_at"=now()
WHERE lower("email")=lower('kyle.olson@lightspeedsystems.com') OR lower("name")=lower('Kyle Olson');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('12013 FITZHUGH ROAD',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2024,"hire_month"=5,"hire_day"=6,"elt_leader"='Amy Bennett',"updated_at"=now()
WHERE lower("email")=lower('madelyne.stewart@lightspeedsystems.com') OR lower("name")=lower('Madelyne Stewart');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('Remote',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2022,"hire_month"=11,"hire_day"=7,"elt_leader"='Amy Bennett',"updated_at"=now()
WHERE lower("email")=lower('larissa.negreiros.somaio@lightspeedsystems.com') OR lower("name")=lower('Larissa Negreiros Somaio');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('12013 FITZHUGH ROAD',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2023,"hire_month"=1,"hire_day"=9,"elt_leader"='Amy Bennett',"updated_at"=now()
WHERE lower("email")=lower('jiana.khazma@lightspeedsystems.com') OR lower("name")=lower('Jiana Khazma');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('12013 FITZHUGH ROAD',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2019,"hire_month"=10,"hire_day"=1,"elt_leader"='Brian Thomas',"updated_at"=now()
WHERE lower("email")=lower('kirk.orgeldinger@lightspeedsystems.com') OR lower("name")=lower('Kirk Orgeldinger');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('12013 FITZHUGH ROAD',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=1999,"hire_month"=7,"hire_day"=19,"elt_leader"=NULL,"updated_at"=now()
WHERE lower("email")=lower('brian.thomas@lightspeedsystems.com') OR lower("name")=lower('Brian Thomas');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('Remote',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2019,"hire_month"=3,"hire_day"=20,"elt_leader"='Wes Lawrence',"updated_at"=now()
WHERE lower("email")=lower('robert.mccartney@lightspeedsystems.com') OR lower("name")=lower('Robert Mccartney');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('12013 FITZHUGH ROAD',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2020,"hire_month"=4,"hire_day"=1,"elt_leader"='Kirk Orgeldinger',"updated_at"=now()
WHERE lower("email")=lower('katherine.williamson@lightspeedsystems.com') OR lower("name")=lower('Katherine Williamson');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('12013 FITZHUGH ROAD',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2020,"hire_month"=5,"hire_day"=4,"elt_leader"='Kirk Orgeldinger',"updated_at"=now()
WHERE lower("email")=lower('kevin.chiang@lightspeedsystems.com') OR lower("name")=lower('Kevin Chiang');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('12013 FITZHUGH ROAD',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2022,"hire_month"=4,"hire_day"=18,"elt_leader"='Kirk Orgeldinger',"updated_at"=now()
WHERE lower("email")=lower('kevin.lawrence@lightspeedsystems.com') OR lower("name")=lower('Kevin Lawrence');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('Remote',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2022,"hire_month"=6,"hire_day"=27,"elt_leader"='Wes Lawrence',"updated_at"=now()
WHERE lower("email")=lower('zachary.horn@lightspeedsystems.com') OR lower("name")=lower('Zachary Horn');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('Remote',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2022,"hire_month"=8,"hire_day"=29,"elt_leader"='Wes Lawrence',"updated_at"=now()
WHERE lower("email")=lower('brock.anderson@lightspeedsystems.com') OR lower("name")=lower('Brock Anderson');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('12013 FITZHUGH ROAD',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2025,"hire_month"=2,"hire_day"=25,"elt_leader"='Kevin Chiang',"updated_at"=now()
WHERE lower("email")=lower('juliana.morris@lightspeedsystems.com') OR lower("name")=lower('Juliana Morris');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('12013 FITZHUGH ROAD',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2025,"hire_month"=8,"hire_day"=4,"elt_leader"='Brian Thomas',"updated_at"=now()
WHERE lower("email")=lower('donal.mcmahon@lightspeedsystems.com') OR lower("name")=lower('Donal Mcmahon');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('12013 FITZHUGH ROAD',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2025,"hire_month"=6,"hire_day"=23,"elt_leader"='Rob Chambers',"updated_at"=now()
WHERE lower("email")=lower('jonathan.adkins@lightspeedsystems.com') OR lower("name")=lower('Jonathan Adkins');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('Remote',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2026,"hire_month"=2,"hire_day"=17,"elt_leader"='Donal Mcmahon',"updated_at"=now()
WHERE lower("email")=lower('steven.miller@lightspeedsystems.com') OR lower("name")=lower('Steven Miller');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('12013 FITZHUGH ROAD',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2026,"hire_month"=4,"hire_day"=21,"elt_leader"='Kevin Chiang',"updated_at"=now()
WHERE lower("email")=lower('sabrina.drouin@lightspeedsystems.com') OR lower("name")=lower('Sabrina Drouin');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('12013 FITZHUGH ROAD',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2026,"hire_month"=4,"hire_day"=21,"elt_leader"='Donal Mcmahon',"updated_at"=now()
WHERE lower("email")=lower('ryan.passanisi@lightspeedsystems.com') OR lower("name")=lower('Ryan Passanisi');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('12013 FITZHUGH ROAD',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2026,"hire_month"=6,"hire_day"=9,"elt_leader"='Donal Mcmahon',"updated_at"=now()
WHERE lower("email")=lower('benjamin.thomas@lightspeedsystems.com') OR lower("name")=lower('Benjamin Thomas');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('12013 FITZHUGH ROAD',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2026,"hire_month"=6,"hire_day"=17,"elt_leader"='Wes Lawrence',"updated_at"=now()
WHERE lower("email")=lower('jade.friedman@lightspeedsystems.com') OR lower("name")=lower('Jade Friedman');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('12013 FITZHUGH ROAD',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2026,"hire_month"=6,"hire_day"=11,"elt_leader"='Wes Lawrence',"updated_at"=now()
WHERE lower("email")=lower('brooke.friedman@lightspeedsystems.com') OR lower("name")=lower('Brooke Friedman');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('12013 FITZHUGH ROAD',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2018,"hire_month"=9,"hire_day"=28,"elt_leader"='Wes Lawrence',"updated_at"=now()
WHERE lower("email")=lower('heather.james@lightspeedsystems.com') OR lower("name")=lower('Heather James');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('12013 FITZHUGH ROAD',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2026,"hire_month"=5,"hire_day"=26,"elt_leader"='Wes Lawrence',"updated_at"=now()
WHERE lower("email")=lower('lillian.fox@lightspeedsystems.com') OR lower("name")=lower('Lillian Fox');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('12013 FITZHUGH ROAD',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2026,"hire_month"=6,"hire_day"=22,"elt_leader"=NULL,"updated_at"=now()
WHERE lower("email")=lower('jody.parry@lightspeedsystems.com') OR lower("name")=lower('Jody Parry');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('12013 FITZHUGH ROAD',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2026,"hire_month"=7,"hire_day"=14,"elt_leader"='Wes Lawrence',"updated_at"=now()
WHERE lower("email")=lower('lena.murray@lightspeedsystems.com') OR lower("name")=lower('Lena Murray');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('12013 FITZHUGH ROAD',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2012,"hire_month"=10,"hire_day"=29,"elt_leader"='Kevin Chiang',"updated_at"=now()
WHERE lower("email")=lower('gregory.funk@lightspeedsystems.com') OR lower("name")=lower('Gregory Funk');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('Remote',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2019,"hire_month"=2,"hire_day"=11,"elt_leader"='Kevin Chiang',"updated_at"=now()
WHERE lower("email")=lower('douglas.dietert@lightspeedsystems.com') OR lower("name")=lower('Douglas Dietert');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('12013 FITZHUGH ROAD',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2021,"hire_month"=6,"hire_day"=1,"elt_leader"='Kevin Chiang',"updated_at"=now()
WHERE lower("email")=lower('scott.dunham@lightspeedsystems.com') OR lower("name")=lower('Scott Dunham');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('12013 FITZHUGH ROAD',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2021,"hire_month"=9,"hire_day"=13,"elt_leader"='Kevin Chiang',"updated_at"=now()
WHERE lower("email")=lower('adrienne.synos@lightspeedsystems.com') OR lower("name")=lower('Adrienne Synos');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('12013 FITZHUGH ROAD',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2023,"hire_month"=9,"hire_day"=25,"elt_leader"='Kevin Chiang',"updated_at"=now()
WHERE lower("email")=lower('megan.duhon@lightspeedsystems.com') OR lower("name")=lower('Megan Duhon');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('12013 FITZHUGH ROAD',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2025,"hire_month"=6,"hire_day"=1,"elt_leader"='Kevin Chiang',"updated_at"=now()
WHERE lower("email")=lower('james.laprocido@lightspeedsystems.com') OR lower("name")=lower('James Laprocido');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('12013 FITZHUGH ROAD',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2026,"hire_month"=4,"hire_day"=28,"elt_leader"='Kevin Chiang',"updated_at"=now()
WHERE lower("email")=lower('jake.bowman@lightspeedsystems.com') OR lower("name")=lower('Jake Bowman');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('12013 FITZHUGH ROAD',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2026,"hire_month"=5,"hire_day"=26,"elt_leader"='Kirk Orgeldinger',"updated_at"=now()
WHERE lower("email")=lower('thayer.kacher@lightspeedsystems.com') OR lower("name")=lower('Thayer Kacher');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('12013 FITZHUGH ROAD',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2026,"hire_month"=6,"hire_day"=2,"elt_leader"='Kirk Orgeldinger',"updated_at"=now()
WHERE lower("email")=lower('dhillon.reddy@lightspeedsystems.com') OR lower("name")=lower('Dhillon Reddy');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('12013 FITZHUGH ROAD',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2005,"hire_month"=7,"hire_day"=5,"elt_leader"='Wes Lawrence',"updated_at"=now()
WHERE lower("email")=lower('patrick.chapa@lightspeedsystems.com') OR lower("name")=lower('Patrick Chapa');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('Remote',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2022,"hire_month"=4,"hire_day"=25,"elt_leader"='Wes Lawrence',"updated_at"=now()
WHERE lower("email")=lower('adrian.rios.alvarez@lightspeedsystems.com') OR lower("name")=lower('Adrian Rios Alvarez');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('12013 FITZHUGH ROAD',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2022,"hire_month"=5,"hire_day"=2,"elt_leader"='Wes Lawrence',"updated_at"=now()
WHERE lower("email")=lower('alexander.hesse@lightspeedsystems.com') OR lower("name")=lower('Alexander Hesse');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('12013 FITZHUGH ROAD',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2025,"hire_month"=6,"hire_day"=10,"elt_leader"='Wes Lawrence',"updated_at"=now()
WHERE lower("email")=lower('paul.chapa@lightspeedsystems.com') OR lower("name")=lower('Paul Chapa');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('12013 FITZHUGH ROAD',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2026,"hire_month"=1,"hire_day"=13,"elt_leader"='Wes Lawrence',"updated_at"=now()
WHERE lower("email")=lower('william.hellemsmoody@lightspeedsystems.com') OR lower("name")=lower('William Hellems-Moody');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('12013 FITZHUGH ROAD',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2007,"hire_month"=7,"hire_day"=2,"elt_leader"='Carson Mcmillan',"updated_at"=now()
WHERE lower("email")=lower('bradley.white@lightspeedsystems.com') OR lower("name")=lower('Bradley White');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('12013 FITZHUGH ROAD',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2026,"hire_month"=5,"hire_day"=26,"elt_leader"='Carson Mcmillan',"updated_at"=now()
WHERE lower("email")=lower('braedon.mulder@lightspeedsystems.com') OR lower("name")=lower('Braedon Mulder');
--> statement-breakpoint
UPDATE "users" SET
  "location"=COALESCE(NULLIF('12013 FITZHUGH ROAD',''),"location"),
  "business_unit"=COALESCE(NULLIF('Lightspeed',''),"business_unit"),
  "hire_year"=2026,"hire_month"=7,"hire_day"=7,"elt_leader"='Carson Mcmillan',"updated_at"=now()
WHERE lower("email")=lower('joseph.coffey@lightspeedsystems.com') OR lower("name")=lower('Joseph Coffey');
--> statement-breakpoint
WITH lvl AS (
  SELECT u.id AS uid, m1."manager_id" AS l2, m2."manager_id" AS l3, m3."manager_id" AS l4
  FROM "users" u
  LEFT JOIN "users" m1 ON m1."id" = u."manager_id"
  LEFT JOIN "users" m2 ON m2."id" = m1."manager_id"
  LEFT JOIN "users" m3 ON m3."id" = m2."manager_id"
)
UPDATE "users" u SET
  "secondary_manager_id" = lvl.l2,
  "tertiary_manager_id" = lvl.l3,
  "quaternary_manager_id" = lvl.l4,
  "updated_at" = now()
FROM lvl WHERE lvl.uid = u."id" AND u."manager_id" IS NOT NULL;

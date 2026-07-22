-- SAMPLE / demo archived survey periods (clearly labelled '(sample)') so the
-- trend line, period selector, and date labels can be seen with more than one
-- period. NOT real data. Company overall + 10 drivers each; favorability rises
-- toward the real 2025 H1. Idempotent (ON CONFLICT DO NOTHING). To remove: delete
-- the survey_periods rows whose label ends with '(sample)' (metrics cascade).
INSERT INTO "survey_periods" ("id","label","period_date","eligible_count","response_count","source","is_current","scale_max") VALUES
  ('7e63771e-ef4c-5e22-b4c2-6efc11955ab3','2023 H2 (sample)','2023-11-15',168,144,'import',false,4),
  ('82713491-286d-51f7-8c0b-dffb90f1050b','2024 H1 (sample)','2024-05-15',182,157,'import',false,4),
  ('aea9167a-abf6-5569-a861-d7fe05b725dd','2024 H2 (sample)','2024-11-15',195,168,'import',false,4)
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
INSERT INTO "survey_metrics" ("id","period_id","scope","department","dimension","metric_key","mean","favorable_pct","unfavorable_pct","response_count","eligible_count") VALUES
  ('ea718ef7-1d84-5f37-a512-bf8dd4ebb351','7e63771e-ef4c-5e22-b4c2-6efc11955ab3','company',NULL,'overall',NULL,3.21,73.5,7.4,144,168),
  ('104704d8-e498-578e-88d1-1960f76f4ba2','7e63771e-ef4c-5e22-b4c2-6efc11955ab3','company',NULL,'driver','purpose',3.5,83.4,3.7,144,NULL),
  ('82448fdc-e18a-5b18-9bc9-475dfa44b0b1','7e63771e-ef4c-5e22-b4c2-6efc11955ab3','company',NULL,'driver','autonomy',3.33,77.6,4.9,144,NULL),
  ('4e6a99b7-6d2b-510f-ac99-01a6e451fe48','7e63771e-ef4c-5e22-b4c2-6efc11955ab3','company',NULL,'driver','utilization',2.97,65.6,7.6,144,NULL),
  ('f9545b50-eed2-5837-af76-7c4e581f6da4','7e63771e-ef4c-5e22-b4c2-6efc11955ab3','company',NULL,'driver','capacity',3.17,72.5,6.0,144,NULL),
  ('a2cb0fdb-fd94-5dc4-8fee-edb90e9792dc','7e63771e-ef4c-5e22-b4c2-6efc11955ab3','company',NULL,'driver','manager_relationship',3.23,74.3,5.7,144,NULL),
  ('6e3f70ad-f6a6-5647-8900-a88120cdb355','7e63771e-ef4c-5e22-b4c2-6efc11955ab3','company',NULL,'driver','manager_effectiveness',3.22,74.0,5.7,144,NULL),
  ('163449f6-3709-5874-959d-d7e062c5b195','7e63771e-ef4c-5e22-b4c2-6efc11955ab3','company',NULL,'driver','coworkers',3.49,83.1,3.7,144,NULL),
  ('2039effb-4bfd-57f6-9068-54f668d0623d','7e63771e-ef4c-5e22-b4c2-6efc11955ab3','company',NULL,'driver','leadership',2.88,62.5,8.2,144,NULL),
  ('d0b575b2-b123-5f7c-ad38-b21a0a126ba1','7e63771e-ef4c-5e22-b4c2-6efc11955ab3','company',NULL,'driver','rewards_fairness',2.57,52.3,10.5,144,NULL),
  ('61633cf5-25df-57b4-a141-bc5a8a6900ac','7e63771e-ef4c-5e22-b4c2-6efc11955ab3','company',NULL,'driver','commitment',3.15,71.5,6.3,144,NULL),
  ('f1086a2b-230e-5a62-b848-407cb42a2996','82713491-286d-51f7-8c0b-dffb90f1050b','company',NULL,'overall',NULL,3.3,76.8,6.5,157,182),
  ('7a45dc2c-93e2-51b6-9e91-db23c7ff24bc','82713491-286d-51f7-8c0b-dffb90f1050b','company',NULL,'driver','purpose',3.6,86.7,2.9,157,NULL),
  ('53f161fd-141a-5851-b1bc-f2e6b84e9eb3','82713491-286d-51f7-8c0b-dffb90f1050b','company',NULL,'driver','autonomy',3.43,80.9,4.2,157,NULL),
  ('4b3da04e-ad20-58a8-8d02-598a5aef6602','82713491-286d-51f7-8c0b-dffb90f1050b','company',NULL,'driver','utilization',3.07,68.9,6.8,157,NULL),
  ('98d834d1-c3ae-5372-9090-ad144ef7c21d','82713491-286d-51f7-8c0b-dffb90f1050b','company',NULL,'driver','capacity',3.27,75.8,5.3,157,NULL),
  ('ae2b1aa7-f331-5873-8986-5b5d7d6d84f8','82713491-286d-51f7-8c0b-dffb90f1050b','company',NULL,'driver','manager_relationship',3.33,77.6,4.9,157,NULL),
  ('7a0501c8-b5f1-5154-8f00-24833935dda2','82713491-286d-51f7-8c0b-dffb90f1050b','company',NULL,'driver','manager_effectiveness',3.32,77.3,5.0,157,NULL),
  ('bdbc5296-b511-5d40-8501-6c80b002e5b8','82713491-286d-51f7-8c0b-dffb90f1050b','company',NULL,'driver','coworkers',3.59,86.4,3.0,157,NULL),
  ('dad1c7e7-3097-56eb-a359-c2ff8a9d7aff','82713491-286d-51f7-8c0b-dffb90f1050b','company',NULL,'driver','leadership',2.97,65.8,7.5,157,NULL),
  ('fa5cf36b-e2cf-51f3-80a6-81e5a3e8b61f','82713491-286d-51f7-8c0b-dffb90f1050b','company',NULL,'driver','rewards_fairness',2.67,55.6,9.8,157,NULL),
  ('834f8bdc-7fea-5ed7-bc14-034edb8bdf72','82713491-286d-51f7-8c0b-dffb90f1050b','company',NULL,'driver','commitment',3.24,74.8,5.5,157,NULL),
  ('62f50386-d132-5194-9183-6ee186c1bbb7','aea9167a-abf6-5569-a861-d7fe05b725dd','company',NULL,'overall',NULL,3.38,79.2,5.8,168,195),
  ('8092f8a2-4083-5619-b1ad-2a08e5e1a144','aea9167a-abf6-5569-a861-d7fe05b725dd','company',NULL,'driver','purpose',3.67,89.1,2.4,168,NULL),
  ('60101f7e-edc7-5062-8356-e71059e517f5','aea9167a-abf6-5569-a861-d7fe05b725dd','company',NULL,'driver','autonomy',3.5,83.3,3.7,168,NULL),
  ('6555f5b9-1151-5206-8d13-8e7cd301c0bf','aea9167a-abf6-5569-a861-d7fe05b725dd','company',NULL,'driver','utilization',3.14,71.3,6.3,168,NULL),
  ('9aef094e-4fa6-5dfc-8cbe-8d9c90c7fb96','aea9167a-abf6-5569-a861-d7fe05b725dd','company',NULL,'driver','capacity',3.35,78.2,4.8,168,NULL),
  ('f7f77e03-9bd8-5a30-a793-5a691e94e818','aea9167a-abf6-5569-a861-d7fe05b725dd','company',NULL,'driver','manager_relationship',3.4,80.0,4.4,168,NULL),
  ('ba0840f3-d1a2-59c8-8c34-fb7538e429f5','aea9167a-abf6-5569-a861-d7fe05b725dd','company',NULL,'driver','manager_effectiveness',3.39,79.7,4.5,168,NULL),
  ('bf408a9a-457d-57aa-b0df-438b25e2cc48','aea9167a-abf6-5569-a861-d7fe05b725dd','company',NULL,'driver','coworkers',3.66,88.8,2.5,168,NULL),
  ('2c0491de-4bb5-5185-9af0-627c9d9c3186','aea9167a-abf6-5569-a861-d7fe05b725dd','company',NULL,'driver','leadership',3.05,68.2,7.0,168,NULL),
  ('1e815539-4a1d-58bb-a4f8-f69ef668be45','aea9167a-abf6-5569-a861-d7fe05b725dd','company',NULL,'driver','rewards_fairness',2.74,58.0,9.2,168,NULL),
  ('15eaec1f-380d-55e1-8d25-3b409334e012','aea9167a-abf6-5569-a861-d7fe05b725dd','company',NULL,'driver','commitment',3.32,77.2,5.0,168,NULL)
ON CONFLICT ("id") DO NOTHING;

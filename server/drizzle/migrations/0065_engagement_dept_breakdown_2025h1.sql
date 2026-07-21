-- H1 2025 per-department engagement breakdown (15Five export dated 2026-07-16).
-- Adds ONLY department-scope rows for the existing 2025 H1 period (877619f5-00df-5542-b61b-32e0247f84e5,
-- inserted by 0026). Company/driver/question rows are untouched (no duplication).
-- Excludes the company-overall row and the two hierarchy rollups (Kirk/Craig) to
-- avoid double-counting. favorable_pct holds 15Five's 0-100 engagement Score (the
-- only per-department metric the export provides, scored on the same basis as the
-- company overall row). Idempotent: DELETE dept rows for this period, then INSERT.
DELETE FROM "survey_metrics" WHERE "period_id" = '877619f5-00df-5542-b61b-32e0247f84e5' AND "scope" = 'department';
--> statement-breakpoint
INSERT INTO "survey_metrics" ("id","period_id","scope","department","dimension","metric_key","mean","favorable_pct","unfavorable_pct","response_count","eligible_count") VALUES
  ('05f502b5-01d0-565a-8746-2a99627295bf','877619f5-00df-5542-b61b-32e0247f84e5','department','Site Reliability Engineering','overall',NULL,NULL,92.86,NULL,3,4),
  ('4262fcc1-9bb6-570f-950c-872307b31e36','877619f5-00df-5542-b61b-32e0247f84e5','department','STOPit Solutions','overall',NULL,NULL,88.32,NULL,26,27),
  ('6efd791c-9e4c-5643-9b6b-5529701506a2','877619f5-00df-5542-b61b-32e0247f84e5','department','Student Safety','overall',NULL,NULL,86.29,NULL,25,27),
  ('ebfd6150-988a-5e06-96b1-3d225b06ce68','877619f5-00df-5542-b61b-32e0247f84e5','department','Administration','overall',NULL,NULL,85.71,NULL,8,9),
  ('8ab20787-bacf-5699-9b95-94710fa1b4b7','877619f5-00df-5542-b61b-32e0247f84e5','department','Finance','overall',NULL,NULL,85.2,NULL,7,7),
  ('f9d5d5ea-a59d-5615-a16a-9b4fd1de14f8','877619f5-00df-5542-b61b-32e0247f84e5','department','Sales','overall',NULL,NULL,83.82,NULL,17,21),
  ('429662fc-1f8a-5590-b0a8-a161ddb96c8a','877619f5-00df-5542-b61b-32e0247f84e5','department','Sales Engineers','overall',NULL,NULL,83.67,NULL,7,8),
  ('eca0fd84-8840-5484-97d2-fe7ae87f884b','877619f5-00df-5542-b61b-32e0247f84e5','department','Product Engineering','overall',NULL,NULL,82.74,NULL,18,28),
  ('92457ea9-f66a-5efd-b4b6-19d1e933d5ef','877619f5-00df-5542-b61b-32e0247f84e5','department','QAT','overall',NULL,NULL,80.66,NULL,12,14),
  ('b5febb9a-8e08-5325-a5b6-7e89ef25b402','877619f5-00df-5542-b61b-32e0247f84e5','department','MIS','overall',NULL,NULL,78.57,NULL,4,4),
  ('faa0ef73-f8b3-5181-a1e0-4eacb92ea83b','877619f5-00df-5542-b61b-32e0247f84e5','department','Customer Support','overall',NULL,NULL,78.02,NULL,13,13),
  ('22655f95-3d5e-5238-935c-c158f930fc06','877619f5-00df-5542-b61b-32e0247f84e5','department','Product Management','overall',NULL,NULL,73.98,NULL,14,15),
  ('b88a8089-7a01-5246-83a4-5c9861de5a8e','877619f5-00df-5542-b61b-32e0247f84e5','department','Customer Success','overall',NULL,NULL,72.96,NULL,14,17),
  ('0b4b4328-5580-5926-9e57-4309de9fb0e3','877619f5-00df-5542-b61b-32e0247f84e5','department','Marketing','overall',NULL,NULL,69.84,NULL,9,9),
  ('0dae69e7-da82-551f-a920-c0fc41d4daf9','877619f5-00df-5542-b61b-32e0247f84e5','department','Solution Engineering','overall',NULL,NULL,68.3,NULL,8,8),
  ('2cfc43ad-c6cd-50e6-a2f3-2ad0763939a2','877619f5-00df-5542-b61b-32e0247f84e5','department','Human Resource','overall',NULL,NULL,64.29,NULL,3,3),
  ('957dacdb-635e-5943-9613-4e445c99ea72','877619f5-00df-5542-b61b-32e0247f84e5','department','Technical Product Management','overall',NULL,NULL,62.86,NULL,5,5),
  ('f3900d04-2033-53e4-94d5-f22d7ddbcaaf','877619f5-00df-5542-b61b-32e0247f84e5','department','Revenue Operations','overall',NULL,NULL,57.14,NULL,3,3)
ON CONFLICT ("id") DO NOTHING;

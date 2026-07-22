-- change_log.entity_id was uuid, but some entities use text keys (e.g. the
-- engagement survey question bank: 'work_1', 'custom_…'). Widen to varchar so
-- audit logging works for every entity type. Existing uuid values remain valid.
-- Idempotent: USING cast; re-running on an already-varchar column is a no-op.
ALTER TABLE "change_log" ALTER COLUMN "entity_id" TYPE varchar(64) USING "entity_id"::varchar;

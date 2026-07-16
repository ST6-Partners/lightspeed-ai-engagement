-- An objective is the whole goal, so its own weight is 100% (its results divide
-- that 100 among themselves). Only meaningful as a display convention since
-- top-level objectives have no parent to roll into. Idempotent.
UPDATE okr_nodes SET weight = 100 WHERE type = 'objective';

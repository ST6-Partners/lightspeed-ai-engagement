-- Relative weight per OKR node vs. its siblings (for weighted progress rollup).
ALTER TABLE okr_nodes ADD COLUMN IF NOT EXISTS weight integer NOT NULL DEFAULT 1;

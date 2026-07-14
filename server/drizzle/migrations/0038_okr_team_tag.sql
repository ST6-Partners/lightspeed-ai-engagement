-- Optional explicit team tag on OKRs (department), independent of the owner.
ALTER TABLE okr_nodes ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES departments(id) ON DELETE SET NULL;

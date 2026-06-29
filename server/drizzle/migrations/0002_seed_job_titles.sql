-- Seed the shared job_titles lookup with a starter set of software-company
-- titles so the PIP "Role / Level" and Exit Survey role pickers are populated
-- on first deploy. Idempotent: ON CONFLICT (title) DO NOTHING means re-running
-- never duplicates, and (because Drizzle records applied migrations) it runs
-- exactly once — it will not resurrect titles an admin later deletes.
INSERT INTO "job_titles" ("title", "level", "department", "sort_order") VALUES
  ('Software Engineer I',         'L2', 'Engineering',     10),
  ('Software Engineer II',        'L3', 'Engineering',     20),
  ('Senior Software Engineer',    'L4', 'Engineering',     30),
  ('Staff Engineer',              'L5', 'Engineering',     40),
  ('Engineering Manager',         'M1', 'Engineering',     50),
  ('Product Manager',             'L4', 'Product',         60),
  ('Senior Product Manager',      'L5', 'Product',         70),
  ('Product Designer',            'L3', 'Design',          80),
  ('Designer',                    'L3', 'Design',          90),
  ('Data Scientist',              'L4', 'Analytics',      100),
  ('Senior Analyst',              'L4', 'Analytics',      110),
  ('Analyst',                     'L3', 'Analytics',      120),
  ('Account Executive',           'L3', 'Sales',          130),
  ('Support Specialist',          'L2', 'Customer Success',140),
  ('Support Lead',                'L3', 'Customer Success',150)
ON CONFLICT ("title") DO NOTHING;

-- 0022 Put the executive team under the CEO. Brian Thomas is the org root; the
-- other five ELT leaders become his direct reports, so the Org tree renders
-- them indented and collapsible beneath him (the tree already draws a caret for
-- any node that has children — this is purely a reporting-line data fix).
-- Idempotent UPDATEs keyed by seeded email; forces the structure regardless of
-- any prior manual manager assignments.
DO $$
DECLARE
  dom text := '@lightspeedsystems.com';
  ceo uuid;
BEGIN
  SELECT id INTO ceo FROM users WHERE email = 'bthomas' || dom;
  IF ceo IS NULL THEN RETURN; END IF;

  -- CEO sits at the top of the tree.
  UPDATE users SET manager_id = NULL, updated_at = now() WHERE id = ceo;

  -- The other ELT leaders report directly to the CEO.
  UPDATE users SET manager_id = ceo, updated_at = now()
  WHERE email IN (
    'korgeldinger' || dom,
    'dmcmahon'     || dom,
    'kchiang'      || dom,
    'wlawrence'    || dom,
    'cmccabe'      || dom
  );
END $$;

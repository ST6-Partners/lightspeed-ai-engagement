-- ============================================================
-- 0108 AIE 2026-08-05 — EMPLOYEE NAME CLEANUP + ELT LEADER RESOLUTION
--
-- Prompted by the phase-1 activation work (0107): the first-time password is
-- derived from users.name and the sign-in screen lets a person find themselves
-- by name, so a wrong or duplicated display name stops being cosmetic.
--
-- The derivation rule (services/activation.ts) normalises case, so the Mc/Mac
-- fixes below are NOT lockout fixes — 'Colin Mccabe' and 'Colin McCabe' both
-- produce ColinMccabe123!. They are here because the names are wrong on screen
-- and the roster is internally inconsistent: migration 0055 already produced a
-- properly-cased Kate McDermott, Michelle McGovern and Lauren McNair sitting
-- beside these seven.
--
-- Every statement is idempotent and keyed on the OLD value, so a replay under
-- migrate-on-boot matches nothing. Nothing here deletes an employee record.
-- ============================================================

-- ── 1. Mc / Mac surnames lower-cased by the 0023 org-chart source ──────────
-- Source: 'Lightspeed Systems — Org Chart' (2026-07-07) arrived with these
-- surnames in sentence case. Keyed on the chart email, which never changed.
UPDATE "users" SET "name"='Colin McCabe', "updated_at"=now()
WHERE lower("email")='colin.mccabe@lightspeedsystems.com' AND "name"='Colin Mccabe';
--> statement-breakpoint
UPDATE "users" SET "name"='Donal McMahon', "updated_at"=now()
WHERE lower("email")='donal.mcmahon@lightspeedsystems.com' AND "name"='Donal Mcmahon';
--> statement-breakpoint
UPDATE "users" SET "name"='Jack McDonnell', "updated_at"=now()
WHERE lower("email")='jack.mcdonnell@lightspeedsystems.com' AND "name"='Jack Mcdonnell';
--> statement-breakpoint
UPDATE "users" SET "name"='Robert McCartney', "updated_at"=now()
WHERE lower("email")='robert.mccartney@lightspeedsystems.com' AND "name"='Robert Mccartney';
--> statement-breakpoint
UPDATE "users" SET "name"='Robert McMillan', "updated_at"=now()
WHERE lower("email")='robert.mcmillan@lightspeedsystems.com' AND "name"='Robert Mcmillan';
--> statement-breakpoint
UPDATE "users" SET "name"='Ross McAden', "updated_at"=now()
WHERE lower("email")='ross.mcaden@lightspeedsystems.com' AND "name"='Ross Mcaden';
--> statement-breakpoint
UPDATE "users" SET "name"='Shad McGaha', "updated_at"=now()
WHERE lower("email")='shad.mcgaha@lightspeedsystems.com' AND "name"='Shad Mcgaha';
--> statement-breakpoint

-- 0023's addresses were synthesised from these same names and 0099 corrected a
-- large batch of addresses, so a chart email is not guaranteed to still be there.
-- Catch anyone whose address has moved by keying on the old display name instead.
-- Belt and braces; matches nothing if the statements above already fired.
UPDATE "users" SET "name"='Colin McCabe',     "updated_at"=now() WHERE "name"='Colin Mccabe';
--> statement-breakpoint
UPDATE "users" SET "name"='Donal McMahon',    "updated_at"=now() WHERE "name"='Donal Mcmahon';
--> statement-breakpoint
UPDATE "users" SET "name"='Jack McDonnell',   "updated_at"=now() WHERE "name"='Jack Mcdonnell';
--> statement-breakpoint
UPDATE "users" SET "name"='Robert McCartney', "updated_at"=now() WHERE "name"='Robert Mccartney';
--> statement-breakpoint
UPDATE "users" SET "name"='Robert McMillan',  "updated_at"=now() WHERE "name"='Robert Mcmillan';
--> statement-breakpoint
UPDATE "users" SET "name"='Ross McAden',      "updated_at"=now() WHERE "name"='Ross Mcaden';
--> statement-breakpoint
UPDATE "users" SET "name"='Shad McGaha',      "updated_at"=now() WHERE "name"='Shad Mcgaha';
--> statement-breakpoint

-- ── 2. Suffix that landed in the middle of the name ────────────────────────
-- 'Gerard Jr Dantel', email gerard.jr.dantel@ — the source carried 'Jr' in a
-- middle-name field. PM to confirm whether he is Gerard Dantel Jr; if so the
-- display name wants to be 'Gerard Dantel Jr' and this reverts to that.
UPDATE "users" SET "name"='Gerard Dantel', "updated_at"=now()
WHERE "name"='Gerard Jr Dantel';
--> statement-breakpoint

-- ── 3. Honorifics concatenated onto the name ───────────────────────────────
-- Three 0023 rows carried an honorific from the source's title column:
-- 'Sam Howard Mr', 'Steven Miller Junior', 'Tania Mackie Mrs'. AQ #2500.
-- 'Junior' sits in the same batch as 'Mr'/'Mrs' so it is read as an honorific
-- too — PM to confirm Steven Miller is not genuinely a Jr.
UPDATE "users" SET "name"='Sam Howard',    "updated_at"=now() WHERE "name"='Sam Howard Mr';
--> statement-breakpoint
UPDATE "users" SET "name"='Steven Miller', "updated_at"=now() WHERE "name"='Steven Miller Junior';
--> statement-breakpoint
UPDATE "users" SET "name"='Tania Mackie',  "updated_at"=now() WHERE "name"='Tania Mackie Mrs';
--> statement-breakpoint

-- ── 4. Merge the duplicate half of each of those three people ─────────────
-- 0083 tried to insert these three as new hires. Its NOT EXISTS guard tested the
-- clean name, which did not match the suffixed row, so it created a SECOND record
-- for each. Step 3 has now made both records read identically.
--
-- Verified against a full replay of the migration chain: neither side is empty,
-- they hold complementary halves.
--   the 0023 row  — free-text title, org-chart position (Steven Miller has a
--                   direct report), and a synthesised email carrying the honorific
--   the 0083 row  — the REAL work email (0099 rewrote the 0083 addresses to the
--                   HR export's; the 0023 *.mr@ / *.junior@ / *.mrs@ synthesised
--                   ones survive untouched, which is why keying on them below
--                   works), plus location, business unit, hire year, ELT leader
--
-- So this is a merge, not a delete. The record with the real email survives,
-- because an address is the one field a person actually uses; the other row's
-- title and reporting line move across, then it is ARCHIVED rather than deleted
-- so nothing it does hold is destroyed.
--
-- Keyed on the three known synthesised addresses — explicit and auditable, the
-- same approach 0099 took. Idempotent: once the row is archived it stops matching.
DO $$
DECLARE
  pair RECORD;
  keep_id uuid;
  drop_id uuid;
  drop_title text;
  moved int;
BEGIN
  FOR pair IN
    SELECT * FROM (VALUES
      ('sam.howard.mr@lightspeedsystems.com'),
      ('steven.miller.junior@lightspeedsystems.com'),
      ('tania.mackie.mrs@lightspeedsystems.com')
    ) AS t(old_email)
  LOOP
    SELECT "id", "title" INTO drop_id, drop_title
    FROM "users" WHERE lower("email") = pair.old_email AND "archived_at" IS NULL;
    CONTINUE WHEN drop_id IS NULL;

    -- The survivor: same display name, still live, different row.
    SELECT "id" INTO keep_id
    FROM "users"
    WHERE "name" = (SELECT "name" FROM "users" WHERE "id" = drop_id)
      AND "archived_at" IS NULL AND "id" <> drop_id
    ORDER BY "created_at"
    LIMIT 1;

    IF keep_id IS NULL THEN
      RAISE NOTICE '0108: % has no duplicate to merge into — left as-is', pair.old_email;
      CONTINUE;
    END IF;

    -- Carry over anything the survivor is missing.
    UPDATE "users" SET
      "title" = COALESCE("title", drop_title),
      "job_title_id" = COALESCE("job_title_id", (SELECT "job_title_id" FROM "users" WHERE "id" = drop_id)),
      "department_id" = COALESCE("department_id", (SELECT "department_id" FROM "users" WHERE "id" = drop_id)),
      "manager_id" = COALESCE("manager_id", (SELECT "manager_id" FROM "users" WHERE "id" = drop_id)),
      "leader_badge" = COALESCE("leader_badge", (SELECT "leader_badge" FROM "users" WHERE "id" = drop_id)),
      "updated_at" = now()
    WHERE "id" = keep_id;

    -- Re-point anyone who reported to the row being retired. The `id <> keep_id`
    -- guard matters: if the survivor's own manager was the retired duplicate, a
    -- blind re-point would set manager_id = id, and the org tree's depth walk has
    -- no cycle guard — the Organization page would hang the browser tab.
    UPDATE "users" SET "manager_id" = keep_id, "updated_at" = now()
    WHERE "manager_id" = drop_id AND "id" <> keep_id;
    GET DIAGNOSTICS moved = ROW_COUNT;
    -- The survivor cannot report to a record that no longer exists, and must not
    -- report to itself. Fall back to the retired row's own manager.
    UPDATE "users" SET "manager_id" = (SELECT "manager_id" FROM "users" WHERE "id" = drop_id), "updated_at" = now()
    WHERE "id" = keep_id AND "manager_id" = drop_id;
    UPDATE "users" SET "manager_id" = NULL, "updated_at" = now()
    WHERE "id" = keep_id AND "manager_id" = keep_id;

    -- Same for the multi-manager join table, without creating a duplicate edge or
    -- a self-edge.
    UPDATE "user_managers" SET "manager_id" = keep_id
    WHERE "manager_id" = drop_id
      AND "user_id" <> keep_id
      AND NOT EXISTS (SELECT 1 FROM "user_managers" x WHERE x."user_id" = "user_managers"."user_id" AND x."manager_id" = keep_id);
    DELETE FROM "user_managers" WHERE "manager_id" = drop_id;
    DELETE FROM "user_managers" WHERE "user_id" = drop_id;
    DELETE FROM "user_managers" WHERE "user_id" = "manager_id";

    -- Retire the row. Archived, never deleted.
    UPDATE "users"
    SET "archived_at" = now(), "is_active" = false, "login_enabled" = false, "updated_at" = now()
    WHERE "id" = drop_id;

    RAISE NOTICE '0108: merged % into the surviving record (% direct report(s) re-pointed)', pair.old_email, moved;
  END LOOP;
END $$;
--> statement-breakpoint

-- ── 5. ELT leader values that match no employee record ────────────────────
-- users.elt_leader is free text and the Org rollup, the profile card and the
-- ELT filter all join on it by name. Three values matched nobody:
--   'Chris Travis'    -> Christopher Travis, Chief Revenue Officer
--   'Carson Mcmillan' -> Robert McMillan, Chief Technology Officer (Carson is
--                        presumably his preferred name; if so, prefer renaming
--                        HIS RECORD to 'Carson McMillan' and re-running this)
--   'Rob Chambers'    -> the only Chambers on the roster is Nicholas Chambers,
--                        a QA Engineer. See the WARNING below.
--
-- Resolution rule, set by the PM 2026-08-05: match on LAST NAME. Written
-- generically rather than as three hard-coded updates so it also repairs future
-- drift, and it fires ONLY where exactly one employee shares that surname —
-- an ambiguous surname is left alone and reported.
--
-- WARNING, deliberately not suppressed: for 'Rob Chambers' the rule resolves to
-- Nicholas Chambers, a QA Engineer, which is almost certainly not an ELT leader.
-- The likeliest truth is that Rob Chambers has left and his reports need
-- reassigning. The statement is written as instructed and the NOTICE names every
-- rewrite it makes, so this one is visible in the deploy log and revertible with
-- a single UPDATE.
-- First, normalise CASING. Step 1 renamed the employee records, but any
-- elt_leader value still spelled 'Colin Mccabe' matches 'Colin McCabe' only
-- case-insensitively — the join works, the label on screen stays wrong. Align the
-- stored text with the employee record's own spelling.
UPDATE "users" u SET "elt_leader" = m."name", "updated_at" = now()
FROM "users" m
WHERE u."elt_leader" IS NOT NULL
  AND lower(u."elt_leader") = lower(m."name")
  AND u."elt_leader" <> m."name"
  AND m."archived_at" IS NULL;
--> statement-breakpoint

DO $$
DECLARE
  bad RECORD;
  match_count int;
  canonical text;
BEGIN
  FOR bad IN
    SELECT DISTINCT "elt_leader" AS v
    FROM "users"
    WHERE "elt_leader" IS NOT NULL AND btrim("elt_leader") <> ''
      AND NOT EXISTS (SELECT 1 FROM "users" m WHERE lower(m."name") = lower("users"."elt_leader"))
  LOOP
    -- Last whitespace-separated word of the unmatched value.
    WITH target AS (
      SELECT lower((regexp_split_to_array(btrim(bad.v), '\s+'))[
        array_length(regexp_split_to_array(btrim(bad.v), '\s+'), 1)
      ]) AS surname
    )
    SELECT count(*), min(m."name")
      INTO match_count, canonical
    FROM "users" m, target t
    WHERE m."archived_at" IS NULL
      AND lower((regexp_split_to_array(btrim(m."name"), '\s+'))[
            array_length(regexp_split_to_array(btrim(m."name"), '\s+'), 1)
          ]) = t.surname;

    IF match_count = 1 THEN
      UPDATE "users" SET "elt_leader" = canonical, "updated_at" = now()
      WHERE "elt_leader" = bad.v;
      RAISE NOTICE '0108: elt_leader "%" resolved by surname to "%"', bad.v, canonical;
    ELSE
      RAISE NOTICE '0108: elt_leader "%" left as-is — % employees share that surname', bad.v, match_count;
    END IF;
  END LOOP;
END $$;

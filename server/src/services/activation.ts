// ============================================================
// ACTIVATION SERVICE — Phase 1 user activation (AIE 2026-08-05)
//
// Phase 1 of a three-phase auth plan (PM, 2026-08-05):
//   1. THIS — sysadmin flips a per-person login flag; the person picks their
//      name on the sign-in screen and enters a derived first-time password.
//   2. Microsoft Entra sign-in (the handler already exists in
//      http/microsoftSso.ts but is deliberately not mounted).
//   3. A further identity system, TBD.
//
// Everything here is intended to be thrown away at phase 2 EXCEPT the
// `login_enabled` flag, which stays useful whatever the sign-in mechanism is.
//
// WHY A SEPARATE FLAG AND NOT `is_active`:
// `users.is_active` is already load-bearing in ~15 places — the org tree,
// engagement eligibility, assignment pickers, manager rollups, cadence
// notifications. Defaulting the roster to inactive so that "not yet activated"
// meant "cannot sign in" would also empty the org chart and every headcount.
// `login_enabled` carries ONLY the sign-in meaning. This also finally separates
// the two senses of "active" that AQ #2125 flagged as a footgun.
// ============================================================

/**
 * The first-time password rule (PM, 2026-08-05).
 *
 * Take the person's display name, drop anything that is not a letter, capitalise
 * the first letter of each remaining part, join them, and append `123!`.
 *
 *   'Steven Miller'          -> 'StevenMiller123!'
 *   'William Hellems-Moody'  -> 'WilliamHellemsMoody123!'
 *   'Jake de la Garrigue'    -> 'JakeDeLaGarrigue123!'
 *   'Adrian Rios Alvarez'    -> 'AdrianRiosAlvarez123!'
 *
 * The point of normalising case rather than preserving it is that the answer is
 * then the same however the name happens to be stored. All four of
 * 'Colin Mccabe', 'Colin McCabe', 'COLIN MCCABE' and 'colin mccabe' produce
 * `ColinMccabe123!`, so the roster's inconsistent Mc/Mac capitalisation cannot
 * lock anyone out — those renames are cosmetic, not blocking.
 *
 * Throws when the name yields fewer than 4 letters, because the result would
 * fall under the app's 8-character minimum. Better a named failure at
 * activation time than an account nobody can get into.
 */
export function defaultPasswordFor(name: string | null | undefined): string {
  const parts = (name ?? '').split(/[^A-Za-z]+/).filter(Boolean);
  const letters = parts.join('');
  if (letters.length < 4) {
    throw new Error(
      `Cannot derive a first-time password from the name "${name ?? ''}" — it has fewer than 4 letters. ` +
      'Give this person a longer display name, or set their password by hand.',
    );
  }
  return parts.map((p) => p[0].toUpperCase() + p.slice(1).toLowerCase()).join('') + '123!';
}

/**
 * Human-readable statement of the rule, for the activation screen so a sysadmin
 * can read it out without having to remember it.
 */
export const DEFAULT_PASSWORD_RULE =
  'Their full name with no spaces or punctuation, each part capitalised, then 123! — for example Steven Miller signs in with StevenMiller123!';

/** Minimum characters accepted for a password the person chooses themselves. */
export const MIN_PASSWORD_LENGTH = 8;

/**
 * Whether the person must choose their own password before they can use the app.
 *
 * TRUE by design. The first-time password is derivable from a name that appears
 * on the sign-in screen, so while it is still in force it is a key to that
 * account for anyone who can reach the app. Requiring the change turns it into
 * a one-time handover rather than a standing credential, and costs the person a
 * single screen.
 *
 * The PM's original preference was to make this optional. Flip this constant to
 * `false` to get that behaviour — nothing else needs to change. If you do, pair
 * it with an expiry on the default instead, so the derived password stops
 * working some days after activation.
 */
export const REQUIRE_PASSWORD_CHANGE_ON_FIRST_LOGIN = true;

// Unit checks for the first-time password rule (AIE 2026-08-05).
//
// Run: npx tsx server/src/services/activation.test.ts
// (Also picked up by `npm test`, added 2026-08-05 — before that date the repo
// had no test script at all and the nine files like this one never executed.)

import assert from 'node:assert/strict';
import { defaultPasswordFor } from './activation.js';

let checks = 0;
const eq = (name: string, expected: string) => {
  assert.equal(defaultPasswordFor(name), expected, `defaultPasswordFor(${JSON.stringify(name)})`);
  checks++;
};

// ── The ordinary case ────────────────────────────────────────
eq('Steven Miller', 'StevenMiller123!');
eq('Tania Mackie', 'TaniaMackie123!');
eq('Sam Howard', 'SamHoward123!');
eq('Tu Ngo', 'TuNgo123!');            // shortest name in the roster — still 9 chars

// ── Case-insensitivity is the whole point ────────────────────
// The roster stores Mc/Mac names inconsistently (Colin Mccabe next to
// Kate McDermott). Every spelling must land on the same password, or the
// cosmetic rename below becomes a lockout.
for (const variant of ['Colin Mccabe', 'Colin McCabe', 'COLIN MCCABE', 'colin mccabe', 'CoLiN mCcAbE']) {
  eq(variant, 'ColinMccabe123!');
}
eq('Kate McDermott', 'KateMcdermott123!');

// ── Punctuation is dropped, and acts as a word break ─────────
eq('William Hellems-Moody', 'WilliamHellemsMoody123!');
eq('Mitchell Laurren-Ring', 'MitchellLaurrenRing123!');
eq('Niels Dhollander-Barclay', 'NielsDhollanderBarclay123!');
eq("Sinead O'Brien", 'SineadOBrien123!');   // no such person today; guards future rosters
eq('J. Smith', 'JSmith123!');

// ── Three or more parts ──────────────────────────────────────
eq('Adrian Rios Alvarez', 'AdrianRiosAlvarez123!');
eq('Juan Rodriguez Maldonado', 'JuanRodriguezMaldonado123!');
eq('Larissa Negreiros Somaio', 'LarissaNegreirosSomaio123!');
eq('Jake de la Garrigue', 'JakeDeLaGarrigue123!');

// ── Whitespace noise ─────────────────────────────────────────
eq('  Steven   Miller  ', 'StevenMiller123!');

// ── Names too short to make a safe password are refused ──────
for (const bad of ['Bo', 'A B', '', '   ', '!!!']) {
  assert.throws(() => defaultPasswordFor(bad), /fewer than 4 letters/, `should refuse ${JSON.stringify(bad)}`);
  checks++;
}
assert.throws(() => defaultPasswordFor(null), /fewer than 4 letters/);
assert.throws(() => defaultPasswordFor(undefined), /fewer than 4 letters/);
checks += 2;

// ── Every result clears the app's 8-character minimum ────────
for (const n of ['Tu Ngo', 'Jide Oke', 'Wing Mar', 'Alex Wade']) {
  assert.ok(defaultPasswordFor(n).length >= 8, `${n} must yield >= 8 chars`);
  checks++;
}

console.log(`activation.test.ts — ${checks} checks passed`);

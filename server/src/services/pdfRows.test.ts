// Tests for the PURE parts of PDF row extraction — prompt contract, JSON
// recovery, row coercion, dedupe and chunking. The model call itself is not
// exercised here (it costs money and is non-deterministic); everything that
// decides what reaches a write mutation is.
//
// Run: npx tsx server/src/services/pdfRows.test.ts
import {
  buildSystemPrompt, extractJsonArray, coerceRows, dedupeRows, chunkText, columnKey,
} from './pdfRows.js';

let fails = 0;
const eq = (name: string, got: unknown, want: unknown) => {
  const g = JSON.stringify(got), w = JSON.stringify(want);
  if (g !== w) { console.log(`FAIL ${name}\n  got  ${g}\n  want ${w}`); fails++; }
  else console.log(`ok   ${name}`);
};
const ok = (name: string, cond: boolean) => eq(name, cond, true);

// ---------- columnKey ----------
eq('columnKey lowercases and trims', columnKey('  BusinessUnit '), 'businessunit');

// ---------- buildSystemPrompt ----------
const prompt = buildSystemPrompt(['Email', 'Name'], 'email, name');
ok('prompt names each column key', prompt.includes('"email"') && prompt.includes('"name"'));
ok('prompt forbids invented rows', prompt.toLowerCase().includes('do not invent rows'));
ok('prompt asks for JSON only', prompt.includes('nothing else'));
ok('prompt carries the hint', prompt.includes('email, name'));
ok('prompt omits hint line when absent', !buildSystemPrompt(['a']).includes('What these columns mean'));

// ---------- extractJsonArray ----------
eq('plain array', extractJsonArray('[{"a":"1"}]'), [{ a: '1' }]);
eq('fenced array', extractJsonArray('```json\n[{"a":"1"}]\n```'), [{ a: '1' }]);
eq('array with surrounding prose', extractJsonArray('Here you go:\n[{"a":"1"}]\nHope that helps.'), [{ a: '1' }]);
try { extractJsonArray('no list at all'); console.log('FAIL non-array should throw'); fails++; }
catch (e) { eq('non-array throws readable error', (e as Error).message.includes('not a JSON list'), true); }

// ---------- coerceRows ----------
const cols = ['email', 'name', 'title'];

eq('happy path keeps all requested columns',
  coerceRows([{ email: 'a@b.com', name: 'Ada', title: 'Engineer' }], cols).rows,
  [{ email: 'a@b.com', name: 'Ada', title: 'Engineer' }]);

eq('missing column is filled with empty string',
  coerceRows([{ email: 'a@b.com' }], cols).rows,
  [{ email: 'a@b.com', name: '', title: '' }]);

eq('key casing and padding are normalized',
  coerceRows([{ ' Email ': 'a@b.com', NAME: 'Ada', Title: 'Eng' }], cols).rows,
  [{ email: 'a@b.com', name: 'Ada', title: 'Eng' }]);

eq('numbers and booleans become strings',
  coerceRows([{ email: 'a@b.com', name: 42, title: true }], cols).rows,
  [{ email: 'a@b.com', name: '42', title: 'true' }]);

eq('null becomes empty string',
  coerceRows([{ email: 'a@b.com', name: null, title: undefined }], cols).rows,
  [{ email: 'a@b.com', name: '', title: '' }]);

const unknown = coerceRows([{ email: 'a@b.com', salary: '99999' }], cols);
eq('unknown field is dropped from the row', unknown.rows, [{ email: 'a@b.com', name: '', title: '' }]);
ok('unknown field is reported, not silent', unknown.notes.some((n) => n.includes('salary')));

const blanks = coerceRows([{ email: '', name: '', title: '' }, { email: 'a@b.com' }], cols);
eq('blank row dropped', blanks.rows.length, 1);
ok('blank row drop is reported', blanks.notes.some((n) => n.includes('blank')));

const junk = coerceRows(['a string', 5, null, ['nested'], { email: 'a@b.com' }], cols);
eq('non-object items ignored', junk.rows.length, 1);
ok('non-object items reported', junk.notes.some((n) => n.includes('not rows')));

eq('non-array input yields no rows', coerceRows({ email: 'a@b.com' }, cols).rows, []);
ok('non-array input explains itself', coerceRows('nope', cols).notes.length > 0);

eq('values are trimmed',
  coerceRows([{ email: '  a@b.com  ', name: ' Ada ', title: '' }], cols).rows,
  [{ email: 'a@b.com', name: 'Ada', title: '' }]);

// ---------- dedupeRows ----------
const dupes = dedupeRows([
  { email: 'a@b.com', name: 'Ada', title: 'Eng' },
  { email: 'a@b.com', name: 'Ada', title: 'Eng' },
  { email: 'c@d.com', name: 'Grace', title: 'Eng' },
], cols);
eq('identical rows collapsed', dupes.rows.length, 2);
eq('duplicate count reported', dupes.removed, 1);
eq('rows differing in one field are both kept',
  dedupeRows([
    { email: 'a@b.com', name: 'Ada', title: 'Eng' },
    { email: 'a@b.com', name: 'Ada', title: 'Lead' },
  ], cols).rows.length, 2);

// ---------- chunkText ----------
eq('short text is one chunk', chunkText('a\nb\nc', 100).length, 1);

// Sized to split into several chunks while staying under the 8-chunk cap.
const lines = Array.from({ length: 60 }, (_, i) => `row ${i} some payload text here`).join('\n');
const chunks = chunkText(lines, 500);
ok('long text splits into several chunks', chunks.length > 1);
ok('stays under the chunk cap', chunks.length <= 8);
ok('no chunk exceeds the size budget', chunks.every((c) => c.length <= 500));
eq('chunking under the cap loses no content', chunks.join('\n'), lines);
ok('chunk boundaries fall on line breaks', chunks.every((c) => c.startsWith('row')));
ok('a single oversized line is still split', chunkText('x'.repeat(1200), 500).length >= 3);

// Over the cap, content IS dropped — extractRowsFromPdf detects this by
// comparing covered length against the original and warns the admin.
const huge = Array.from({ length: 5000 }, () => 'y'.repeat(200)).join('\n');
const capped = chunkText(huge, 500);
eq('chunk count is capped', capped.length, 8);
const coveredChars = capped.reduce((n, c) => n + c.length, 0);
ok('over-cap truncation is detectable by covered length', coveredChars < huge.length);

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAILURE(S)`);
process.exit(fails === 0 ? 0 : 1);

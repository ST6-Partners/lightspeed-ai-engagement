import ExcelJS from 'exceljs';
import { parseUploadedTable } from './tableUpload.js';
import { detectColumns, detectShape, normalizeRows } from './fifteenFiveImport.js';

let fails = 0;
const eq = (name: string, got: unknown, want: unknown) => {
  const g = JSON.stringify(got), w = JSON.stringify(want);
  if (g !== w) { console.log(`FAIL ${name}\n  got  ${g}\n  want ${w}`); fails++; }
  else console.log(`ok   ${name}`);
};

const wb = new ExcelJS.Workbook();

// sheet 1: a title row above the real header (common in exports)
const s1 = wb.addWorksheet('Company');
s1.addRow(['Engagement Survey Results — 2025 H1']);
s1.addRow([]);
s1.addRow(['Dimension', 'Statement', 'Avg. Response', 'Unfavorable', 'Neutral', 'Favorable', 'Total Responses', 'Total Possible']);
s1.addRow(['Meaning', 'The work I do on this job is very important to me.', 3.62, 1, 7, 168, 176, 205]);
s1.addRow(['Fairness', 'Decisions here about people are made using a fair process.', 2.61, 20, 55, 101, 176, 205]);

// sheet 2: department statements
const s2 = wb.addWorksheet('By Department');
s2.addRow(['Group Name', 'Dimension', 'Statement', 'Avg. Response', 'Unfavorable', 'Neutral', 'Favorable', 'Total Responses', 'Total Possible']);
s2.addRow(['Finance', 'Work Feeling', 'When I wake up I feel like going to work.', 3.43, 0, 1, 6, 7, 7]);
s2.addRow(['Marketing', 'Work Feeling', 'When I wake up I feel like going to work.', 2.22, 4, 1, 4, 9, 9]);

// sheet 3: department scores
const s3 = wb.addWorksheet('Scores');
s3.addRow(['Department', 'Engagement Score', 'Respondents', 'Total Possible']);
s3.addRow(['STOPit Solutions', 88.32, 26, 27]);

// sheet 4: junk the importer should skip, not crash on
const s4 = wb.addWorksheet('Notes');
s4.addRow(['Prepared by', 'HR']);
s4.addRow(['Exported', new Date('2026-07-16')]);

// sheet 5: empty
wb.addWorksheet('Blank');

const buf = await wb.xlsx.writeBuffer();
const b64 = Buffer.from(buf as ArrayBuffer).toString('base64');

const sheets = await parseUploadedTable(b64, 'engagement-2025h1.xlsx');
eq('sheets parsed (empty one dropped)', sheets.map((s) => s.sheet), ['Company', 'By Department', 'Scores', 'Notes']);
eq('title row skipped -> real headers', Object.keys(sheets[0].rows[0]).slice(0, 3), ['dimension', 'statement', 'avg. response']);
eq('company rows', sheets[0].rows.length, 2);
eq('numeric cell as string', sheets[0].rows[0]['avg. response'], '3.62');

const shapeOf = (i: number) => detectShape(detectColumns(Object.keys(sheets[i].rows[0])));
eq('sheet1 shape', shapeOf(0), 'company-statements');
eq('sheet2 shape', shapeOf(1), 'department-statements');
eq('sheet3 shape', shapeOf(2), 'department-scores');
eq('sheet4 (notes) unrecognised', shapeOf(3), 'unknown');

const n2 = normalizeRows(sheets[1].rows, detectColumns(Object.keys(sheets[1].rows[0])));
eq('dept normalized rows', n2.rows.length, 2);
eq('dept group', n2.rows[0].groupName, 'Finance');
eq('dept favPct 6/7', n2.rows[0].favorablePct, 85.71);

const n3 = normalizeRows(sheets[2].rows, detectColumns(Object.keys(sheets[2].rows[0])));
eq('score row', n3.rows[0].score, 88.32);

// CSV still works through the same entry point
const csv = 'Dimension,Statement,Favorable,Total Responses\nMeaning,"I feel, truly, valued.",10,20';
const csvSheets = await parseUploadedTable(Buffer.from(csv).toString('base64'), 'x.csv');
eq('csv single sheet', csvSheets.length, 1);
eq('csv quoted comma preserved', csvSheets[0].rows[0].statement, 'I feel, truly, valued.');

// .xls guard
try {
  await parseUploadedTable(Buffer.from([0xd0, 0xcf, 0x11, 0xe0]).toString('base64'), 'old.xls');
  console.log('FAIL .xls should throw'); fails++;
} catch (e) {
  eq('.xls guidance', (e as Error).message.includes('save as .xlsx'), true);
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAILURE(S)`);
process.exit(fails === 0 ? 0 : 1);

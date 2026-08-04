// ============================================================
// IMPORT PARSE ROUTER — shared file-reading for every admin data import.
//
// The 13 "Import …" buttons across Core Data, Org Data and the question lists
// all funnel through here so a new file format is added ONCE, not thirteen
// times. Nothing in this router writes: it turns a file into candidate rows and
// hands them back. The screen's own import mutation (which keeps its own
// permission checks) does the writing.
//
//   .csv            → parsed in the browser (src/lib/csv.ts), never reaches here
//   .xlsx           → `table`, deterministic read via services/tableUpload.ts
//   .xls (old)      → `table`, rejected with re-save guidance
//   .pdf            → `pdf`, AI-assisted via services/pdfRows.ts + admin preview
// ============================================================
// AUTHORIZATION — deliberately `protectedProcedure` (any signed-in user) and
// deliberately NOT `requireAdmin`. Three reasons:
//
//  1. Nothing here reads stored data. Both procedures take a file the caller
//     just uploaded and hand its contents back to that same caller, so there is
//     nothing to disclose.
//  2. The 13 import screens are guarded by TWO different systems: most write
//     mutations use `requireAdmin` (the role tier user/manager/admin/sysadmin),
//     but `engagementSurveyQuestions.import` and `managerSurveyQuestions.import`
//     use `requireAction(...)` (the capability model, where ELT and HR hold
//     survey.editQuestions / managerSurvey.editQuestions). A role-tier check
//     here would 403 an HR or ELT user for Excel and PDF while CSV — parsed in
//     their browser — kept working. Parsing must not be narrower than the write
//     it feeds, or the file format silently decides who can import.
//  3. Authorization is unchanged overall: the screen's own import mutation still
//     enforces its own guard before anything is written.
//
// The PDF path costs a Claude call, which matches the app's existing posture —
// `chat.sendMessage` is also `protectedProcedure`.
import { z } from 'zod';
import { router, protectedProcedure } from '../trpc.js';
import { parseUploadedTable } from '../services/tableUpload.js';
import { extractRowsFromPdf } from '../services/pdfRows.js';

/** ~15MB of base64 ≈ an 11MB file. Matches the inbound-email webhook ceiling. */
const MAX_BASE64 = 15 * 1024 * 1024;

const fileInput = z.object({
  fileBase64: z.string().min(1).max(MAX_BASE64, 'That file is too large to import. Split it or save it as CSV.'),
  fileName: z.string().min(1),
});

export const importParseRouter = router({
  /**
   * Reads a spreadsheet into one entry per sheet that has data.
   * The client decides what to do when there is more than one sheet.
   */
  table: protectedProcedure
    .input(fileInput)
    .mutation(async ({ input }) => {
      const sheets = await parseUploadedTable(input.fileBase64, input.fileName);
      return {
        sheets: sheets.map((s) => ({
          sheet: s.sheet,
          rows: s.rows,
          rowCount: s.rows.length,
          columns: Object.keys(s.rows[0] ?? {}),
        })),
      };
    }),

  /**
   * Reads a PDF into candidate rows for the requested columns.
   * Always previewed by the admin before their screen's import mutation runs —
   * see the confirmation step in src/components/ImportButton.tsx.
   */
  pdf: protectedProcedure
    .input(fileInput.extend({
      columns: z.array(z.string().min(1)).min(1).max(40),
      hint: z.string().max(500).optional(),
    }))
    .mutation(async ({ input }) => {
      const { rows, notes, chunks } = await extractRowsFromPdf(
        input.fileBase64, input.fileName, input.columns, input.hint,
      );
      return { rows, notes, chunks, rowCount: rows.length };
    }),
});

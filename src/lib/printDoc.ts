// ============================================================
// Shared print-to-PDF helper.
// Opens a clean, branded document in a new window and triggers the browser
// print dialog (Save as PDF). Reused by PIP, Reviews, and the Organization
// talent profile. Generalizes the original Coaching Plan print pattern.
// ============================================================

export const escapeHtml = (s: string | null | undefined) =>
  (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Turn a multi-line string into <p> blocks (or an em-dash placeholder).
export const paras = (s: string | null | undefined) =>
  escapeHtml(s).split(/\n+/).filter(Boolean).map((t) => `<p>${t}</p>`).join('') || '<p class="muted">—</p>';

const DOC_CSS = `
  * { box-sizing: border-box; }
  body { font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color: #1f2937; margin: 0; padding: 48px; line-height: 1.55; }
  .brand { font-size: 12px; letter-spacing: .12em; text-transform: uppercase; color: #0891b2; font-weight: 700; }
  h1 { font-size: 26px; margin: 4px 0 2px; }
  .meta { color: #6b7280; font-size: 13px; margin-bottom: 24px; }
  h2 { font-size: 14px; text-transform: uppercase; letter-spacing: .06em; color: #374151; border-bottom: 2px solid #e5e7eb; padding-bottom: 5px; margin: 26px 0 10px; }
  p { margin: 0 0 9px; font-size: 14px; }
  .muted { color: #9ca3af; }
  .kv { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 24px; margin-bottom: 8px; }
  .kv div { font-size: 13px; }
  .kv .k { color: #6b7280; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; margin: 4px 0 10px; }
  th { text-align: left; text-transform: uppercase; font-size: 10.5px; letter-spacing: .05em; color: #6b7280; border-bottom: 1px solid #e5e7eb; padding: 6px 8px; }
  td { border-bottom: 1px solid #f1f3f5; padding: 6px 8px; vertical-align: top; }
  .card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px 14px; margin-bottom: 10px; }
  .card-h { font-weight: 700; font-size: 14px; }
  .card-sub { font-size: 13px; color: #4b5563; margin-top: 4px; }
  .badge { display: inline-block; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 999px; background: #eef2ff; color: #3730a3; }
  .score { font-weight: 700; }
  .foot { margin-top: 40px; padding-top: 12px; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 11px; }
  @media print { body { padding: 24px; } @page { margin: 18mm; } }
`;

export function openPrintDoc(opts: {
  docTitle: string;       // browser/tab + PDF filename hint
  heading: string;        // <h1>
  meta?: string;          // caller-built HTML (values already escaped)
  bodyHtml: string;       // caller-built HTML body
  footer?: string;        // plain text footer note
}) {
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(opts.docTitle)}</title>
  <style>${DOC_CSS}</style></head><body>
    <div class="brand">Lightspeed · AI Engagement</div>
    <h1>${escapeHtml(opts.heading)}</h1>
    ${opts.meta ? `<div class="meta">${opts.meta}</div>` : ''}
    ${opts.bodyHtml}
    ${opts.footer ? `<div class="foot">${escapeHtml(opts.footer)}</div>` : ''}
  </body></html>`;

  const w = window.open('', '_blank', 'width=820,height=1000');
  if (!w) { alert('Please allow pop-ups to export the PDF.'); return; }
  w.document.open(); w.document.write(html); w.document.close();
  w.onload = () => { w.focus(); w.print(); };
  // Fallback if onload already fired.
  setTimeout(() => { try { w.focus(); w.print(); } catch { /* noop */ } }, 400);
}

/* ── PDF export utility ── */

/**
 * Triggers the browser's native print dialog configured for PDF export.
 * The component is responsible for providing correct @media print CSS.
 */
export function exportToPdf(): void {
  window.print();
}

/**
 * Returns the A4 print CSS string to be injected into a report component.
 */
export const A4_PRINT_CSS = `
@media print {
  @page { size: A4 portrait; margin: 0; }
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  .no-print { display: none !important; }
  .pg-break  { page-break-before: always; }
  .no-break  { page-break-inside: avoid; }
  body { background: white !important; }
}
@media screen {
  .rpt-card { max-width: 860px; margin: 0 auto 24px; background: white; border-radius: 16px; box-shadow: 0 2px 16px rgba(0,0,0,0.07); overflow: hidden; }
  .pg-sim   { min-height: 297mm; }
}
`;

/* ── Number & date formatters — used across all pages & reports ── */

/** Format a number with Arabic locale commas, 0 decimals by default */
export const fmt = (n?: number, decimals = 0): string =>
  n != null ? n.toLocaleString('ar-SA', { maximumFractionDigits: decimals }) : '—';

/** Format as millions: 1,500,000 → "1.50 م" */
export const fmtM = (n?: number): string =>
  n != null ? `${(n / 1_000_000).toFixed(2)} م` : '—';

/** Format as percentage with 1 decimal: 25.3% → "25.3٪" */
export const pct = (n?: number): string =>
  n != null ? `${n.toFixed(1)}٪` : '—';

/** Format currency in SAR */
export const sar = (n?: number): string =>
  n != null ? `${fmt(n)} ر.س` : '—';

/** Format date to Arabic locale */
export const fmtDate = (d?: Date | string): string => {
  if (!d) return '—';
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });
};

/** Today's date formatted in Arabic */
export const today = (): string => fmtDate(new Date());

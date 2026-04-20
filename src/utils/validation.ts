/* ── Input validation helpers ── */

export function isPositive(n: unknown): boolean {
  return typeof n === 'number' && n > 0;
}

export function isValidPct(n: unknown): boolean {
  return typeof n === 'number' && n >= 0 && n <= 1;
}

export function requiresFields(
  obj: Record<string, unknown>,
  fields: string[]
): string[] {
  return fields.filter(f => !obj[f] || Number(obj[f]) <= 0);
}

export function parseNum(val: unknown, fallback = 0): number {
  const n = parseFloat(String(val));
  return isNaN(n) ? fallback : n;
}

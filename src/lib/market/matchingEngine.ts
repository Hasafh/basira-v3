import type { District, City, DistrictMatch } from '../masterData/types';

// ── Normalize: strip diacritics, lower, trim ─────────────────

export function normalize(s: string): string {
  return s
    .trim()
    .toLowerCase()
    // Arabic: remove tatweel + common diacritic variants
    .replace(/ـ/g, '')
    .replace(/[\u064B-\u065F]/g, '')
    // Map alef variants → bare alef
    .replace(/[أإآا]/g, 'ا')
    // Map teh marbuta → heh
    .replace(/ة/g, 'ه')
    // Map ya variants
    .replace(/[يى]/g, 'ي')
    // Collapse multiple spaces
    .replace(/\s+/g, ' ');
}

// ── Simple Levenshtein distance ──────────────────────────────

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function similarity(a: string, b: string): number {
  const na = normalize(a), nb = normalize(b);
  if (na === nb) return 1;
  const maxLen = Math.max(na.length, nb.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(na, nb) / maxLen;
}

// ── Match a free-text district against the master list ───────

const THRESHOLD = 0.60;

export function matchDistrict(
  input: string,
  districts: District[],
  cityId?: string,
): DistrictMatch | null {
  if (!input.trim()) return null;

  const pool = cityId ? districts.filter(d => d.cityId === cityId) : districts;
  if (pool.length === 0) return null;

  let best: DistrictMatch | null = null;

  for (const d of pool) {
    const candidates = [d.name, ...d.aliases];
    for (const cand of candidates) {
      const score = similarity(input, cand);
      if (score > (best?.score ?? 0)) {
        best = { district: d, score, matchedAlias: cand };
      }
    }
  }

  return best && best.score >= THRESHOLD ? best : null;
}

// ── Match a city ─────────────────────────────────────────────

export function matchCity(input: string, cities: City[]): City | null {
  if (!input.trim()) return null;
  const ni = normalize(input);

  // Exact first
  const exact = cities.find(c => normalize(c.name) === ni);
  if (exact) return exact;

  // Fuzzy
  let best: { city: City; score: number } | null = null;
  for (const c of cities) {
    const score = similarity(input, c.name);
    if (score > (best?.score ?? 0)) best = { city: c, score };
  }
  return best && best.score >= 0.65 ? best.city : null;
}

// ── Batch: match a list of raw strings → district IDs ────────

export interface BatchMatchResult {
  raw:     string;
  match:   DistrictMatch | null;
  status:  'matched' | 'suggestion' | 'unknown';
}

export function batchMatchDistricts(
  inputs: string[],
  districts: District[],
  cityId?: string,
): BatchMatchResult[] {
  return inputs.map(raw => {
    const match = matchDistrict(raw, districts, cityId);
    const status =
      match == null           ? 'unknown'
      : match.score === 1    ? 'matched'
      : 'suggestion';
    return { raw, match, status };
  });
}

/* ── System-wide constants ── */

export const HURDLE_RATE    = 0.08;   // 8% minimum acceptable return
export const PREFERRED_RETURN = 0.08; // 8% preferred return for institutional investors
export const SELLABLE_RATIO = 0.85;   // 85% of GFA is sellable
export const MAX_LTC        = 0.65;   // 65% max loan-to-cost ratio
export const MIN_DSCR       = 1.25;   // minimum Debt Service Coverage Ratio
export const MIN_IRR        = 0.15;   // 15% minimum IRR threshold

export const DRAWDOWN_STAGES = [
  { stage: 1, label: 'الأساسات',     pct: 0.20 },
  { stage: 2, label: 'الهيكل',        pct: 0.30 },
  { stage: 3, label: 'التشطيبات',    pct: 0.30 },
  { stage: 4, label: 'التسليم',      pct: 0.20 },
] as const;

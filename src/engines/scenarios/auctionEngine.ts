import type { AuctionBid, AuctionFallbackResult } from './types';

/* ── calculateAuctionBid (kept for backward compat) ── */
/**
 * Given construction cost (excluding land) and expected revenue,
 * derive the maximum land bid and recommended bid using RLV logic.
 *
 * Fixed from original: uses margin-on-revenue basis (not cost basis).
 */
export function calculateAuctionBid(
  constructionCostExclLand: number,
  revenue: number,
  landArea: number,
  bankPct: number,
  targetMarginPct = 20,            // e.g. 20 = 20%
): AuctionBid {
  // Max land budget = revenue × (1 − targetMargin) − construction cost
  const maxLandBudget  = Math.max(0, revenue * (1 - targetMarginPct / 100) - constructionCostExclLand);
  const maxBid         = landArea > 0 ? Math.round(maxLandBudget / landArea) : 0;
  const recommendedBid = Math.round(maxBid * 0.85);  // 15% safety buffer

  const net       = revenue - constructionCostExclLand;
  const totalDebt = constructionCostExclLand * bankPct;
  const dscr      = totalDebt > 0 ? net / totalDebt : null;
  const ltc       = (constructionCostExclLand + maxLandBudget) > 0
    ? totalDebt / (constructionCostExclLand + maxLandBudget)
    : null;

  return {
    startPrice:      Math.round(recommendedBid * 0.7),
    maxBid,
    recommendedBid,
    dscr,
    ltc,
  };
}

/* ── runAuctionFallback — matches AuctionPage local fallback exactly ── */
/**
 * Full auction analysis without API: computes RLV-based max bid,
 * three bid tiers, safety margin, and DSCR.
 *
 * @param landArea                  Land area (m²)
 * @param gcr                       Ground coverage ratio
 * @param floors                    Number of floors
 * @param buildCostPerM2            Hard build cost (SAR/m²)
 * @param sellPricePerM2            Expected sell price (SAR/m²)
 * @param bankPct                   Bank loan fraction of land cost (0–1)
 * @param softCostsPct              Soft costs fraction of build cost
 * @param contingencyPct            Contingency fraction of build cost
 * @param targetProfitPct           Required minimum margin (0–1, e.g. 0.25)
 * @param auctionStartingPricePerM2 Starting auction price — 0 if unknown
 * @param auctionPremiumPct         Urgency premium fraction for aggressive bid (e.g. 0.05)
 * @param projectDurationMonths     Project duration (months)
 * @param bankInterestRatePct       Annual interest rate, e.g. 7
 */
export function runAuctionFallback(
  landArea: number,
  gcr: number,
  floors: number,
  buildCostPerM2: number,
  sellPricePerM2: number,
  bankPct: number,
  softCostsPct: number,
  contingencyPct: number,
  targetProfitPct: number,
  auctionStartingPricePerM2: number,
  auctionPremiumPct: number,
  projectDurationMonths: number,
  bankInterestRatePct: number,
): AuctionFallbackResult {
  const gfa      = landArea * gcr * floors;
  const nla      = gfa * 0.85;
  const revenue  = nla * sellPricePerM2;
  const bldCost  = gfa * buildCostPerM2;
  const soft     = bldCost * (softCostsPct + contingencyPct);

  // Maximum land budget: revenue after required profit, minus construction
  const reqProfit     = revenue * targetProfitPct;
  const maxLandBudget = Math.max(0, revenue - bldCost - soft - reqProfit);
  const maxPerM2      = landArea > 0 ? maxLandBudget / landArea : 0;

  const startPrice    = auctionStartingPricePerM2 || 0;
  const safetyMargin  = (startPrice > 0 && maxPerM2 > 0)
    ? ((maxPerM2 - startPrice) / maxPerM2) * 100
    : null;

  // DSCR against bank debt on land purchase
  const bankInterestRate = bankInterestRatePct / 100;
  const bankAmount       = startPrice > 0 ? startPrice * landArea * bankPct : 0;
  const bankInterest     = bankAmount * bankInterestRate * projectDurationMonths / 12;
  const totalDebt        = bankAmount + bankInterest;
  const adjNet           = revenue - bldCost - soft
    - (startPrice > 0 ? startPrice * landArea : 0);
  const dscr             = totalDebt > 0 ? adjNet / totalDebt : null;

  const recommend = safetyMargin !== null
    ? (safetyMargin >= 15 ? 'يُنصح بالمشاركة'
      : safetyMargin >=  5 ? 'المشاركة بحذر'
      : 'السعر مرتفع — تجنب')
    : null;

  return {
    conservative: {
      perM2:       Math.round(maxPerM2 * 0.85),
      total:       Math.round(maxPerM2 * 0.85 * landArea),
      probability: 85,
    },
    moderate: {
      perM2:       Math.round(maxPerM2),
      total:       Math.round(maxPerM2 * landArea),
      probability: 60,
    },
    aggressive: {
      perM2:       Math.round(maxPerM2 * (1 + auctionPremiumPct)),
      total:       Math.round(maxPerM2 * (1 + auctionPremiumPct) * landArea),
      probability: 35,
    },
    maxLandPerM2:   Math.round(maxPerM2),
    breakEvenPerM2: Math.round(maxPerM2 * 0.75),
    safetyMargin,
    dscr,
    recommend,
    revenue,
    isApproximate: true,
  };
}

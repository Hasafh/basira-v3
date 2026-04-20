import type { ProfitDistributionConfig } from '../types/report';

export interface DistributionInput {
  netProfit:        number;
  constructionCost: number;
  totalCost:        number;
  durationMonths:   number;
}

export interface DistributionResult {
  bankInterestCost:          number;
  developerConstructionFee:  number;
  developerProfitShare:      number;
  developerROI:              number;
  investorProfitShare:       number;
  investorROI:               number;
}

export function calculateDistribution(
  config: ProfitDistributionConfig,
  input: DistributionInput,
): DistributionResult {
  const bankLoan   = input.totalCost * (config.bankFinancingPercent / 100);
  const equity     = input.totalCost - bankLoan;

  const bankInterestCost =
    bankLoan * (config.bankInterestRate / 100) * (input.durationMonths / 12);

  const developerConstructionFee =
    input.constructionCost * (config.developerFeeOnConstruction / 100);

  const distributableProfit = Math.max(
    0,
    input.netProfit - bankInterestCost - developerConstructionFee,
  );

  const developerProfitShare =
    distributableProfit * (config.developerProfitSharePercent / 100);
  const investorProfitShare =
    distributableProfit * (1 - config.developerProfitSharePercent / 100);

  const developerCapital = equity * (config.developerCapitalPercent / 100);
  const investorCapital  = equity * (config.investorCapitalPercent  / 100);

  const developerROI = developerCapital > 0
    ? ((developerConstructionFee + developerProfitShare) / developerCapital) * 100
    : 0;
  const investorROI = investorCapital > 0
    ? (investorProfitShare / investorCapital) * 100
    : 0;

  return {
    bankInterestCost,
    developerConstructionFee,
    developerProfitShare,
    developerROI,
    investorProfitShare,
    investorROI,
  };
}

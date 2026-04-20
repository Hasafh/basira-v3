export type {
  SensitivityVar, Scenario,
  HBUOption, HBUScenario, HBUResult,
  AuctionBid, AuctionFallbackResult, BidTier,
  TimeSensitivityRow, TimingRow, DelayRow,
  SensitivityRow, SensitivityMatrixData, SensitivityMatrixResult,
  StressTestResult, PriceDropRow, DelayScenarioRow,
} from './types';

export {
  buildSensitivityVars,
  buildScenarios,
  buildSensitivityMatrix,
  runStressTest,
}                              from './sensitivityEngine';

export {
  buildTimingRows,
  runTimingRows,
  runDelayRows,
}                              from './timingEngine';

export {
  HBU_SCENARIOS,
  runHBUAnalysis,
  runHBUFallback,
}                              from './hbuEngine';

export {
  calculateAuctionBid,
  runAuctionFallback,
}                              from './auctionEngine';

export type { ScenarioComparison } from './scenarioComparison';
export { runScenario, runDefaultScenarios } from './scenarioComparison';

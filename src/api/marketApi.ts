import { api } from './client';

/* ── Market data API (placeholder for future market data endpoints) ── */
export const marketAPI = {
  getZoning:      (code: string)   => api.get(`/market/zoning/${code}`),
  getLandPrices:  (area: string)   => api.get(`/market/land-prices?area=${area}`),
  getBuildCosts:  (type: string)   => api.get(`/market/build-costs?type=${type}`),
};

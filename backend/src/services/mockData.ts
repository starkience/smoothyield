export const tradfiHoldings = [
  { ticker: "AAPL", name: "Apple Inc.", shares: 12, priceUsd: 185.21, changePct: 1.2 },
  { ticker: "MSFT", name: "Microsoft", shares: 8, priceUsd: 402.15, changePct: -0.6 },
  { ticker: "TSLA", name: "Tesla", shares: 5, priceUsd: 203.55, changePct: 2.4 },
  { ticker: "NVDA", name: "NVIDIA", shares: 3, priceUsd: 882.4, changePct: 3.1 },
  { ticker: "SPY", name: "SPDR S&P 500 ETF", shares: 6, priceUsd: 512.3, changePct: 0.4 }
];

export const cashUsd = 12500.42;

export const totalValueUsd = tradfiHoldings.reduce(
  (sum, h) => sum + h.shares * h.priceUsd,
  cashUsd
);

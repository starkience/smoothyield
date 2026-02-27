// ─── TradFi markets (mock) ────────────────────────────────────────────────────
export const markets = [
  { ticker: "AAPL",  name: "Apple",            price: 185.21, changePct:  1.20 },
  { ticker: "MSFT",  name: "Microsoft",         price: 402.15, changePct: -0.60 },
  { ticker: "TSLA",  name: "Tesla",             price: 203.55, changePct:  2.40 },
  { ticker: "NVDA",  name: "NVIDIA",            price: 882.40, changePct:  3.10 },
  { ticker: "AMZN",  name: "Amazon",            price: 168.42, changePct: -0.20 },
  { ticker: "GOOGL", name: "Alphabet",          price: 152.10, changePct:  0.70 },
  { ticker: "META",  name: "Meta",              price: 486.30, changePct:  1.90 },
  { ticker: "SPY",   name: "S&P 500 ETF",       price: 512.30, changePct:  0.40 },
  { ticker: "QQQ",   name: "Nasdaq 100 ETF",    price: 448.90, changePct:  0.90 },
  { ticker: "VTI",   name: "Total Market ETF",  price: 243.70, changePct: -0.10 },
  { ticker: "JPM",   name: "JPMorgan",          price: 189.20, changePct:  0.30 },
  { ticker: "V",     name: "Visa",              price: 274.60, changePct:  0.80 },
  { ticker: "MA",    name: "Mastercard",        price: 468.10, changePct:  1.10 },
  { ticker: "UNH",   name: "UnitedHealth",      price: 515.40, changePct: -0.50 },
  { ticker: "XOM",   name: "Exxon Mobil",       price: 108.90, changePct:  0.20 },
  { ticker: "COST",  name: "Costco",            price: 727.30, changePct:  0.60 },
  { ticker: "HD",    name: "Home Depot",        price: 376.80, changePct: -0.40 },
  { ticker: "KO",    name: "Coca-Cola",         price:  61.20, changePct:  0.10 },
  { ticker: "PFE",   name: "Pfizer",            price:  27.50, changePct: -1.20 },
  { ticker: "NFLX",  name: "Netflix",           price: 606.40, changePct:  1.50 },
];

// ─── TradFi portfolio holdings (mock) ────────────────────────────────────────
export const portfolioHoldings = [
  { ticker: "AAPL", name: "Apple",         shares: 12, price: 185.21 },
  { ticker: "MSFT", name: "Microsoft",     shares:  8, price: 402.15 },
  { ticker: "TSLA", name: "Tesla",         shares:  5, price: 203.55 },
  { ticker: "NVDA", name: "NVIDIA",        shares:  2, price: 882.40 },
  { ticker: "SPY",  name: "S&P 500 ETF",   shares:  6, price: 512.30 },
];

// ─── Crypto assets (mock prices) ─────────────────────────────────────────────
export const cryptoAssets = [
  {
    symbol:    "BTC",
    name:      "Bitcoin",
    price:     97842.50,
    changePct: 2.40,
    iconColor: "#F7931A",
    holding:   0.05,   // mock holding in BTC
  },
  {
    symbol:    "ETH",
    name:      "Ethereum",
    price:     3124.80,
    changePct: -1.20,
    iconColor: "#627EEA",
    holding:   0.80,
  },
  {
    symbol:    "SOL",
    name:      "Solana",
    price:     182.45,
    changePct: 5.10,
    iconColor: "#9945FF",
    holding:   12.00,
  },
];

// ─── Derived totals ───────────────────────────────────────────────────────────
export const TRADFI_TOTAL = portfolioHoldings.reduce(
  (sum, h) => sum + h.shares * h.price,
  0,
);

export const CRYPTO_TOTAL = cryptoAssets.reduce(
  (sum, a) => sum + a.holding * a.price,
  0,
);

const STOCK_LOGO_BASE = "https://raw.githubusercontent.com/nvstly/icons/main/ticker_icons";

// ─── TradFi markets (mock) ────────────────────────────────────────────────────
export const markets = [
  { ticker: "AAPL",  name: "Apple",            price: 185.21, changePct:  1.20, logoUrl: `${STOCK_LOGO_BASE}/AAPL.png` },
  { ticker: "MSFT",  name: "Microsoft",         price: 402.15, changePct: -0.60, logoUrl: `${STOCK_LOGO_BASE}/MSFT.png` },
  { ticker: "TSLA",  name: "Tesla",             price: 203.55, changePct:  2.40, logoUrl: `${STOCK_LOGO_BASE}/TSLA.png` },
  { ticker: "NVDA",  name: "NVIDIA",            price: 882.40, changePct:  3.10, logoUrl: `${STOCK_LOGO_BASE}/NVDA.png` },
  { ticker: "AMZN",  name: "Amazon",            price: 168.42, changePct: -0.20, logoUrl: `${STOCK_LOGO_BASE}/AMZN.png` },
  { ticker: "GOOGL", name: "Alphabet",          price: 152.10, changePct:  0.70, logoUrl: `${STOCK_LOGO_BASE}/GOOGL.png` },
  { ticker: "META",  name: "Meta",              price: 486.30, changePct:  1.90, logoUrl: `${STOCK_LOGO_BASE}/META.png` },
  { ticker: "SPY",   name: "S&P 500 ETF",       price: 512.30, changePct:  0.40, logoUrl: `${STOCK_LOGO_BASE}/SPY.png` },
  { ticker: "QQQ",   name: "Nasdaq 100 ETF",    price: 448.90, changePct:  0.90, logoUrl: `${STOCK_LOGO_BASE}/QQQ.png` },
  { ticker: "VTI",   name: "Total Market ETF",  price: 243.70, changePct: -0.10, logoUrl: `${STOCK_LOGO_BASE}/VTI.png` },
  { ticker: "JPM",   name: "JPMorgan",          price: 189.20, changePct:  0.30, logoUrl: `${STOCK_LOGO_BASE}/JPM.png` },
  { ticker: "V",     name: "Visa",              price: 274.60, changePct:  0.80, logoUrl: `${STOCK_LOGO_BASE}/V.png` },
  { ticker: "MA",    name: "Mastercard",        price: 468.10, changePct:  1.10, logoUrl: `${STOCK_LOGO_BASE}/MA.png` },
  { ticker: "UNH",   name: "UnitedHealth",      price: 515.40, changePct: -0.50, logoUrl: `${STOCK_LOGO_BASE}/UNH.png` },
  { ticker: "XOM",   name: "Exxon Mobil",       price: 108.90, changePct:  0.20, logoUrl: `${STOCK_LOGO_BASE}/XOM.png` },
  { ticker: "COST",  name: "Costco",            price: 727.30, changePct:  0.60, logoUrl: `${STOCK_LOGO_BASE}/COST.png` },
  { ticker: "HD",    name: "Home Depot",        price: 376.80, changePct: -0.40, logoUrl: `${STOCK_LOGO_BASE}/HD.png` },
  { ticker: "KO",    name: "Coca-Cola",         price:  61.20, changePct:  0.10, logoUrl: `${STOCK_LOGO_BASE}/KO.png` },
  { ticker: "PFE",   name: "Pfizer",            price:  27.50, changePct: -1.20, logoUrl: `${STOCK_LOGO_BASE}/PFE.png` },
  { ticker: "NFLX",  name: "Netflix",           price: 606.40, changePct:  1.50, logoUrl: `${STOCK_LOGO_BASE}/NFLX.png` },
];

// ─── TradFi portfolio holdings (mock) ────────────────────────────────────────
export const portfolioHoldings = [
  { ticker: "AAPL", name: "Apple",         shares: 12, price: 185.21, logoUrl: `${STOCK_LOGO_BASE}/AAPL.png` },
  { ticker: "MSFT", name: "Microsoft",     shares:  8, price: 402.15, logoUrl: `${STOCK_LOGO_BASE}/MSFT.png` },
  { ticker: "TSLA", name: "Tesla",         shares:  5, price: 203.55, logoUrl: `${STOCK_LOGO_BASE}/TSLA.png` },
  { ticker: "NVDA", name: "NVIDIA",        shares:  2, price: 882.40, logoUrl: `${STOCK_LOGO_BASE}/NVDA.png` },
  { ticker: "SPY",  name: "S&P 500 ETF",   shares:  6, price: 512.30, logoUrl: `${STOCK_LOGO_BASE}/SPY.png` },
];

// ─── Crypto assets (mock prices, fallback icons from CoinGecko) ──────────────
export const cryptoAssets = [
  {
    symbol:    "BTC",
    name:      "Bitcoin",
    price:     97842.50,
    changePct: 2.40,
    iconColor: "#F7931A",
    image:     "https://assets.coingecko.com/coins/images/1/large/bitcoin.png",
    holding:   0.05,
  },
  {
    symbol:    "ETH",
    name:      "Ethereum",
    price:     3124.80,
    changePct: -1.20,
    iconColor: "#627EEA",
    image:     "https://assets.coingecko.com/coins/images/279/large/ethereum.png",
    holding:   0.80,
  },
  {
    symbol:    "SOL",
    name:      "Solana",
    price:     182.45,
    changePct: 5.10,
    iconColor: "#9945FF",
    image:     "https://assets.coingecko.com/coins/images/4128/large/solana.png",
    holding:   12.00,
  },
];

// ─── Derived totals ───────────────────────────────────────────────────────────
export const DEFAULT_BTC_STAKING_APY = 3.33;
export const TRADFI_TOTAL = portfolioHoldings.reduce(
  (sum, h) => sum + h.shares * h.price,
  0,
);

export const CRYPTO_TOTAL = cryptoAssets.reduce(
  (sum, a) => sum + a.holding * a.price,
  0,
);

// ─── Crypto markets (fallback; live data from useMarketData overrides) ───────
export const cryptoMarkets = [
  { symbol: "ETH",  name: "Ethereum",  price: 3124.80,  changePct: -1.20, iconColor: "#627EEA", image: "https://assets.coingecko.com/coins/images/279/large/ethereum.png" },
  { symbol: "BTC",  name: "Bitcoin",   price: 97842.50, changePct:  2.40, iconColor: "#F7931A", image: "https://assets.coingecko.com/coins/images/1/large/bitcoin.png" },
  { symbol: "SOL",  name: "Solana",    price: 182.45,   changePct:  5.10, iconColor: "#9945FF", image: "https://assets.coingecko.com/coins/images/4128/large/solana.png" },
  { symbol: "STRK", name: "Starknet",  price: 1.24,     changePct:  3.20, iconColor: "#E2491A", image: "https://assets.coingecko.com/coins/images/26433/large/starknet.png" },
  { symbol: "USDC", name: "USD Coin",  price: 1.00,     changePct:  0.00, iconColor: "#2775CA", image: "https://assets.coingecko.com/coins/images/6319/large/usdc.png" },
];

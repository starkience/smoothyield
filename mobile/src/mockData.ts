const STOCK_LOGO = "https://raw.githubusercontent.com/nvstly/icons/main/ticker_icons";
const CG_IMG = "https://assets.coingecko.com/coins/images";

// CoinGecko coin IDs for live price lookups
export const COINGECKO_IDS: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  STRK: "starknet",
  USDC: "usd-coin",
};

// ── TradFi holdings (user-owned) ──────────────────────────────────────────────
export const tradfiHoldings = [
  { symbol: "TSLA", name: "Tesla", imageUrl: `${STOCK_LOGO}/TSLA.png`, qty: 5, priceUsd: 203.55, valueUsd: 1017.75 },
  { symbol: "VOO", name: "S&P 500 ETF", imageUrl: `${STOCK_LOGO}/VOO.png`, qty: 6, priceUsd: 512.30, valueUsd: 3073.80 },
  { symbol: "AAPL", name: "Apple", imageUrl: `${STOCK_LOGO}/AAPL.png`, qty: 12, priceUsd: 185.21, valueUsd: 2222.52 },
];

// ── Crypto holdings (user-owned) ──────────────────────────────────────────────
export const cryptoHoldings = [
  { symbol: "BTC", name: "Bitcoin", qty: 0.05, priceUsd: 97842.50, valueUsd: 4892.13, imageUrl: `${CG_IMG}/1/large/bitcoin.png` },
  { symbol: "USDC", name: "USD Coin", qty: 2500, priceUsd: 1.0, valueUsd: 2500.0, imageUrl: `${CG_IMG}/6319/large/usdc.png` },
  { symbol: "STRK", name: "Starknet", qty: 1200, priceUsd: 1.24, valueUsd: 1488.0, imageUrl: `${CG_IMG}/26433/large/starknet.png` },
  { symbol: "SOL", name: "Solana", qty: 12, priceUsd: 182.45, valueUsd: 2189.4, imageUrl: `${CG_IMG}/4128/large/solana.png` },
  { symbol: "ETH", name: "Ethereum", qty: 0.8, priceUsd: 3124.80, valueUsd: 2499.84, imageUrl: `${CG_IMG}/279/large/ethereum.png` },
];

// ── User summary ──────────────────────────────────────────────────────────────
const tradfiTotal = tradfiHoldings.reduce((s, h) => s + h.valueUsd, 0);
const cryptoTotal = cryptoHoldings.reduce((s, h) => s + h.valueUsd, 0);

export const userSummary = {
  totalBalanceUsd: tradfiTotal + cryptoTotal + 3245.8,
  cashUsd: 3245.8,
};

// ── BTC staking ───────────────────────────────────────────────────────────────
export const btcStaking = {
  stakedBtcQty: 0.025,
  estApyPct: "2.5–4.0%",
  accruedBtc: 0.00012,
  status: "Earning" as const,
};

// ── Perps positions (user-held) ───────────────────────────────────────────────
export type PerpSide = "Long" | "Short";
export const perpsPositions = [
  { underlying: "SPX", side: "Long" as PerpSide, notionalUsd: 5000, entry: 5125.5, mark: 5178.3, pnlUsd: 52.8 },
  { underlying: "NVDA", side: "Short" as PerpSide, notionalUsd: 3000, entry: 882.4, mark: 870.15, pnlUsd: 41.7 },
];

// ── TradFi market list (for Invest tab browsing) ─────────────────────────────
export const tradfiMarketList = [
  { symbol: "AAPL", name: "Apple", priceUsd: 185.21, imageUrl: `${STOCK_LOGO}/AAPL.png` },
  { symbol: "MSFT", name: "Microsoft", priceUsd: 402.15, imageUrl: `${STOCK_LOGO}/MSFT.png` },
  { symbol: "TSLA", name: "Tesla", priceUsd: 203.55, imageUrl: `${STOCK_LOGO}/TSLA.png` },
  { symbol: "NVDA", name: "NVIDIA", priceUsd: 882.4, imageUrl: `${STOCK_LOGO}/NVDA.png` },
  { symbol: "AMZN", name: "Amazon", priceUsd: 168.42, imageUrl: `${STOCK_LOGO}/AMZN.png` },
  { symbol: "GOOGL", name: "Alphabet", priceUsd: 152.1, imageUrl: `${STOCK_LOGO}/GOOGL.png` },
  { symbol: "META", name: "Meta", priceUsd: 486.3, imageUrl: `${STOCK_LOGO}/META.png` },
  { symbol: "VOO", name: "Vanguard S&P 500", priceUsd: 512.3, imageUrl: `${STOCK_LOGO}/VOO.png` },
  { symbol: "QQQ", name: "Nasdaq 100 ETF", priceUsd: 448.9, imageUrl: `${STOCK_LOGO}/QQQ.png` },
  { symbol: "VTI", name: "Total Market ETF", priceUsd: 243.7, imageUrl: `${STOCK_LOGO}/VTI.png` },
  { symbol: "JPM", name: "JPMorgan", priceUsd: 189.2, imageUrl: `${STOCK_LOGO}/JPM.png` },
  { symbol: "V", name: "Visa", priceUsd: 274.6, imageUrl: `${STOCK_LOGO}/V.png` },
  { symbol: "MA", name: "Mastercard", priceUsd: 468.1, imageUrl: `${STOCK_LOGO}/MA.png` },
  { symbol: "UNH", name: "UnitedHealth", priceUsd: 515.4, imageUrl: `${STOCK_LOGO}/UNH.png` },
  { symbol: "XOM", name: "Exxon Mobil", priceUsd: 108.9, imageUrl: `${STOCK_LOGO}/XOM.png` },
  { symbol: "COST", name: "Costco", priceUsd: 727.3, imageUrl: `${STOCK_LOGO}/COST.png` },
  { symbol: "HD", name: "Home Depot", priceUsd: 376.8, imageUrl: `${STOCK_LOGO}/HD.png` },
  { symbol: "KO", name: "Coca-Cola", priceUsd: 61.2, imageUrl: `${STOCK_LOGO}/KO.png` },
  { symbol: "PFE", name: "Pfizer", priceUsd: 27.5, imageUrl: `${STOCK_LOGO}/PFE.png` },
  { symbol: "NFLX", name: "Netflix", priceUsd: 606.4, imageUrl: `${STOCK_LOGO}/NFLX.png` },
  { symbol: "AMD", name: "AMD", priceUsd: 158.3, imageUrl: `${STOCK_LOGO}/AMD.png` },
  { symbol: "MSTR", name: "MicroStrategy", priceUsd: 1652.4, imageUrl: `${STOCK_LOGO}/MSTR.png` },
];

// ── Perps market list ─────────────────────────────────────────────────────────
export const perpsMarketList = [
  { symbol: "SPX", name: "S&P 500 Index", priceUsd: 5178.3 },
  { symbol: "NDX", name: "Nasdaq 100 Index", priceUsd: 18234.5 },
  { symbol: "XAU", name: "Gold", priceUsd: 2345.6 },
  { symbol: "XAG", name: "Silver", priceUsd: 28.45 },
  { symbol: "XCU", name: "Copper", priceUsd: 4.12 },
  { symbol: "XPT", name: "Platinum", priceUsd: 1024.3 },
  { symbol: "NATGAS", name: "Natural Gas", priceUsd: 2.85 },
  { symbol: "XBR", name: "Brent Crude", priceUsd: 82.4 },
  { symbol: "GOOGL", name: "Alphabet", priceUsd: 152.1 },
  { symbol: "NVDA", name: "NVIDIA", priceUsd: 882.4 },
  { symbol: "AMZN", name: "Amazon", priceUsd: 168.42 },
  { symbol: "TSLA", name: "Tesla", priceUsd: 203.55 },
  { symbol: "AMD", name: "AMD", priceUsd: 158.3 },
  { symbol: "MSTR", name: "MicroStrategy", priceUsd: 1652.4 },
  { symbol: "EUR", name: "Euro / USD", priceUsd: 1.0845 },
];

// ── Transactions ──────────────────────────────────────────────────────────────
export const transactions = [
  { id: "1", title: "Acquired TSLA stock", subtitle: "Feb 28, 2026", amountUsd: -1017.75, category: "tradfi" },
  { id: "2", title: "Acquired S&P 500", subtitle: "Feb 25, 2026", amountUsd: -3073.8, category: "tradfi" },
  { id: "3", title: "Staked BTC", subtitle: "Feb 20, 2026", amountUsd: -2446.06, category: "crypto" },
  { id: "4", title: "Bought BTC", subtitle: "Feb 18, 2026", amountUsd: -4892.13, category: "crypto" },
  { id: "5", title: "Deposit", subtitle: "Feb 15, 2026", amountUsd: 15000.0, category: "cash" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const heldTradfiSymbols = new Set(tradfiHoldings.map((h) => h.symbol));
export const userHoldsTradfi = (symbol: string) => heldTradfiSymbols.has(symbol);

export const formatUsd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

export const formatUsdSigned = (n: number) =>
  (n >= 0 ? "+" : "") + formatUsd(n);

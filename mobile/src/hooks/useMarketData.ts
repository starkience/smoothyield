import { useCallback, useEffect, useRef, useState } from "react";
import { getApiBaseUrl } from "../api";
import { COINGECKO_IDS } from "../mockData";

export type CryptoMarket = {
  id: string;
  symbol: string;
  name: string;
  price: number;
  changePct: number;
  image: string;
};

export type StockMarket = {
  ticker: string;
  name: string;
  price: number;
  changePct: number;
  logoUrl: string;
};

const COINGECKO_IDS_CSV = Object.values(COINGECKO_IDS).join(",");
const COINGECKO_URL = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&sparkline=false&ids=${COINGECKO_IDS_CSV}`;
const REFRESH_MS = 60_000;

export function useMarketData() {
  const [crypto, setCrypto] = useState<CryptoMarket[]>([]);
  const [stocks, setStocks] = useState<StockMarket[]>([]);
  const [loading, setLoading] = useState(true);
  const timer = useRef<ReturnType<typeof setInterval>>();

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/market-data`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: { crypto: CryptoMarket[]; stocks: StockMarket[] } = await res.json();
      setCrypto(data.crypto);
      setStocks(data.stocks);
    } catch {
      // Fallback: call CoinGecko directly for crypto data
      try {
        const cgRes = await fetch(COINGECKO_URL);
        if (cgRes.ok) {
          const coins: any[] = await cgRes.json();
          setCrypto(
            coins.map((c) => ({
              id: c.id,
              symbol: c.symbol.toUpperCase(),
              name: c.name,
              price: c.current_price,
              changePct: c.price_change_percentage_24h ?? 0,
              image: c.image,
            })),
          );
        }
      } catch {}
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    timer.current = setInterval(refresh, REFRESH_MS);
    return () => clearInterval(timer.current);
  }, [refresh]);

  const cryptoPriceMap = new Map(crypto.map((c) => [c.symbol, c]));

  return { crypto, stocks, loading, refresh, cryptoPriceMap };
}

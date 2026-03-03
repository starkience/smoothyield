const COINGECKO_URL =
  "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&sparkline=false&ids=bitcoin,ethereum,solana,starknet,usd-coin,lombard-staked-btc";

const CACHE_TTL_MS = 60_000;

export type CoinMarket = {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  price_change_percentage_24h: number | null;
};

let cache: { data: CoinMarket[]; expiresAt: number } | null = null;

export async function getCryptoMarkets(): Promise<CoinMarket[]> {
  if (cache && Date.now() < cache.expiresAt) return cache.data;

  try {
    const res = await fetch(COINGECKO_URL);
    if (!res.ok) {
      console.warn("[coingecko] fetch failed:", res.status, await res.text().catch(() => ""));
      return cache?.data ?? [];
    }
    const data = (await res.json()) as CoinMarket[];
    cache = { data, expiresAt: Date.now() + CACHE_TTL_MS };
    return data;
  } catch (e: any) {
    console.warn("[coingecko] error:", e?.message);
    return cache?.data ?? [];
  }
}

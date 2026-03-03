import { useCallback, useEffect, useState } from "react";
import { createApi } from "../api";
import { useAuth } from "../context/AuthContext";
import type { CryptoMarket } from "./useMarketData";

const CG_IMG = "https://assets.coingecko.com/coins/images";

const LBTC_DECIMALS = 8;
const USDC_DECIMALS = 6;

type PortfolioRes = {
  crypto?: {
    usdcBalance?: string;
    lbtcBalance?: string;
    btcStakingApy?: number;
    btcYieldPosition?: {
      status: string;
      apy?: number;
      accruedUsd?: number;
      stakedAmountLbtc?: string | null;
    };
  };
};

export type CryptoHolding = {
  symbol: string;
  name: string;
  qty: number;
  priceUsd: number;
  valueUsd: number;
  imageUrl: string;
  changePct?: number;
  isReal: boolean;
};

const STATIC_TOKENS: CryptoHolding[] = [
  { symbol: "STRK", name: "Starknet", qty: 0, priceUsd: 0, valueUsd: 0, imageUrl: `${CG_IMG}/26433/large/starknet.png`, isReal: false },
  { symbol: "SOL", name: "Solana", qty: 0, priceUsd: 0, valueUsd: 0, imageUrl: `${CG_IMG}/4128/large/solana.png`, isReal: false },
  { symbol: "ETH", name: "Ethereum", qty: 0, priceUsd: 0, valueUsd: 0, imageUrl: `${CG_IMG}/279/large/ethereum.png`, isReal: false },
];

export function useCryptoBalances(liveCrypto: CryptoMarket[]) {
  const { sessionId } = useAuth();
  const [holdings, setHoldings] = useState<CryptoHolding[]>([]);
  const [stakingApy, setStakingApy] = useState(3.33);
  const [yieldPosition, setYieldPosition] = useState<PortfolioRes["crypto"]>();
  const [loading, setLoading] = useState(true);

  const cgMap = new Map(liveCrypto.map((c) => [c.symbol, c]));

  const refresh = useCallback(async () => {
    setLoading(true);
    const btcLive = cgMap.get("BTC");
    const usdcLive = cgMap.get("USDC");

    if (!sessionId) {
      // No session — show static entries with live prices only
      const result: CryptoHolding[] = [
        {
          symbol: "BTC",
          name: "Bitcoin",
          qty: 0,
          priceUsd: btcLive?.price ?? 0,
          valueUsd: 0,
          imageUrl: btcLive?.image ?? `${CG_IMG}/1/large/bitcoin.png`,
          changePct: btcLive?.changePct,
          isReal: false,
        },
        {
          symbol: "USDC",
          name: "USD Coin",
          qty: 0,
          priceUsd: usdcLive?.price ?? 1,
          valueUsd: 0,
          imageUrl: usdcLive?.image ?? `${CG_IMG}/6319/large/usdc.png`,
          changePct: usdcLive?.changePct,
          isReal: false,
        },
        ...STATIC_TOKENS.map((t) => {
          const live = cgMap.get(t.symbol);
          return { ...t, priceUsd: live?.price ?? t.priceUsd, imageUrl: live?.image ?? t.imageUrl, changePct: live?.changePct };
        }),
      ];
      setHoldings(result);
      setLoading(false);
      return;
    }

    try {
      const api = createApi(sessionId);
      const res = await api.get<PortfolioRes>("/api/portfolio");
      const crypto = res.crypto;

      const lbtcRaw = crypto?.lbtcBalance ?? "0";
      const usdcRaw = crypto?.usdcBalance ?? "0";

      const btcQty = Number(lbtcRaw) / 10 ** LBTC_DECIMALS;
      const usdcQty = Number(usdcRaw) / 10 ** USDC_DECIMALS;

      const btcPrice = btcLive?.price ?? 0;
      const usdcPrice = usdcLive?.price ?? 1;

      if (crypto?.btcStakingApy != null) setStakingApy(crypto.btcStakingApy);
      setYieldPosition(crypto);

      const result: CryptoHolding[] = [
        {
          symbol: "BTC",
          name: "Bitcoin",
          qty: btcQty,
          priceUsd: btcPrice,
          valueUsd: btcQty * btcPrice,
          imageUrl: btcLive?.image ?? `${CG_IMG}/1/large/bitcoin.png`,
          changePct: btcLive?.changePct,
          isReal: true,
        },
        {
          symbol: "USDC",
          name: "USD Coin",
          qty: usdcQty,
          priceUsd: usdcPrice,
          valueUsd: usdcQty * usdcPrice,
          imageUrl: usdcLive?.image ?? `${CG_IMG}/6319/large/usdc.png`,
          changePct: usdcLive?.changePct,
          isReal: true,
        },
        ...STATIC_TOKENS.map((t) => {
          const live = cgMap.get(t.symbol);
          return { ...t, priceUsd: live?.price ?? t.priceUsd, imageUrl: live?.image ?? t.imageUrl, changePct: live?.changePct };
        }),
      ];
      setHoldings(result);
    } catch {
      // On error, show static entries
      const result: CryptoHolding[] = [
        {
          symbol: "BTC", name: "Bitcoin", qty: 0,
          priceUsd: btcLive?.price ?? 0, valueUsd: 0,
          imageUrl: btcLive?.image ?? `${CG_IMG}/1/large/bitcoin.png`,
          changePct: btcLive?.changePct, isReal: false,
        },
        {
          symbol: "USDC", name: "USD Coin", qty: 0,
          priceUsd: usdcLive?.price ?? 1, valueUsd: 0,
          imageUrl: usdcLive?.image ?? `${CG_IMG}/6319/large/usdc.png`,
          changePct: usdcLive?.changePct, isReal: false,
        },
        ...STATIC_TOKENS.map((t) => {
          const live = cgMap.get(t.symbol);
          return { ...t, priceUsd: live?.price ?? t.priceUsd, imageUrl: live?.image ?? t.imageUrl, changePct: live?.changePct };
        }),
      ];
      setHoldings(result);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, liveCrypto]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { holdings, stakingApy, yieldPosition, loading, refresh };
}

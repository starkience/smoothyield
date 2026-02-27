export type SessionResponse = {
  sessionId: string;
};

export type PortfolioResponse = {
  tradfiHoldings: Array<{
    ticker: string;
    name: string;
    shares: number;
    priceUsd: number;
    changePct: number;
  }>;
  cashUsd: number;
  totalValueUsd: number;
  crypto: {
    usdcBalance: string;
    lbtcBalance: string;
    btcYieldPosition: {
      status: "none" | "staking" | "earning";
      apy?: number;
      accruedUsd?: number;
    };
  };
};

export type OnrampSessionResponse = {
  onrampUrl: string;
};

export type ConvertResponse = {
  txHash: string;
  explorerUrl: string;
  status: "submitted" | "mocked";
};

export type StakeResponse = {
  txHash: string;
  explorerUrl: string;
  status: "submitted" | "mocked";
};

export type TxStatusResponse = {
  hash: string;
  status: string;
};

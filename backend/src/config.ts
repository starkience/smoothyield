import dotenv from "dotenv";

dotenv.config();

const toBool = (v: string | undefined, fallback: boolean) => {
  if (v === undefined) return fallback;
  return v === "true" || v === "1";
};

export const config = {
  port: Number(process.env.PORT || 3001),
  devMode: toBool(process.env.DEV_MODE, true),
  network: process.env.STARKNET_NETWORK || "mainnet",
  privyAppId: process.env.PRIVY_APP_ID || "",
  privyAppSecret: process.env.PRIVY_APP_SECRET || "",
  avnuPaymasterApiKey:
    process.env.AVNU_PAYMASTER_API_KEY || "f09825f3-897f-45cc-a914-1997e876f02e",
  treasuryAddress: process.env.TREASURY_ADDRESS || "",
  integratorFeeBps: Number(process.env.INTEGRATOR_FEE_BPS || 10),
  btcStakingContractAddress: process.env.BTC_STAKING_CONTRACT_ADDRESS || "",
  btcStakingEntrypoint: process.env.BTC_STAKING_ENTRYPOINT || "stake",
  btcStakingTokenAddress: process.env.BTC_STAKING_TOKEN_ADDRESS || "",
  usdcTokenAddress: process.env.USDC_TOKEN_ADDRESS || "",
  lbtcTokenAddress: process.env.LBTC_TOKEN_ADDRESS || ""
};

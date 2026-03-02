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
  /** Explicit RPC URL (overrides Alchemy key if set). Use for custom endpoints. */
  rpcUrl: process.env.STARKNET_RPC_URL || "",
  /** Alchemy Starknet API key. Used to build RPC URL when STARKNET_RPC_URL is not set. */
  alchemyStarknetApiKey: process.env.ALCHEMY_STARKNET_API_KEY || "",
  privyAppId: (process.env.PRIVY_APP_ID || "").trim(),
  privyAppSecret: (process.env.PRIVY_APP_SECRET || "").trim(),
  /** JWKS URL to verify Privy-issued access tokens (ES256). Defaults to Privy's app JWKS. */
  privyJwksUrl:
    (process.env.PRIVY_JWKS_URL || "").trim() ||
    (process.env.PRIVY_APP_ID
      ? `https://auth.privy.io/api/v1/apps/${(process.env.PRIVY_APP_ID || "").trim()}/jwks.json`
      : ""),
  avnuPaymasterApiKey: process.env.AVNU_PAYMASTER_API_KEY || "",
  treasuryAddress: process.env.TREASURY_ADDRESS || "",
  integratorFeeBps: Number(process.env.INTEGRATOR_FEE_BPS || 10),
  btcStakingContractAddress: process.env.BTC_STAKING_CONTRACT_ADDRESS || "",
  btcStakingEntrypoint: process.env.BTC_STAKING_ENTRYPOINT || "stake",
  btcStakingTokenAddress: process.env.BTC_STAKING_TOKEN_ADDRESS || "",
  /** BTC/LBTC staking APY (%). Source: Voyager staking dashboard; set BTC_STAKING_APY to override. */
  btcStakingApy: Number(process.env.BTC_STAKING_APY || "3.33"),
  usdcTokenAddress: process.env.USDC_TOKEN_ADDRESS || "",
  lbtcTokenAddress: process.env.LBTC_TOKEN_ADDRESS || "",
  /** Base URL of this backend (for Starkzap sign callback). e.g. http://localhost:3001 or http://192.168.1.2:3001 */
  backendBaseUrl:
    process.env.BACKEND_BASE_URL || `http://localhost:${Number(process.env.PORT || 3001)}`,
  /** Secret required in /api/wallet/sign requests (Starkzap calls this URL from our backend; no session). */
  internalSignKey: process.env.BACKEND_INTERNAL_SIGN_KEY || "dev-internal-sign-key",
};

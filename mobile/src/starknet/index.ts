/**
 * Client-side Starknet + Privy integration (Starkzap).
 * Use useStarknetWallet when you want the app to drive onboarding and signing
 * via POST /api/wallet/starknet and POST /api/wallet/sign with Bearer token.
 */

export { getStarknetWallet, buildPrivyResolveResult } from "./walletClient";
export type { StarknetWalletInfo } from "./walletClient";
export { useStarknetWallet } from "./useStarknetWallet";

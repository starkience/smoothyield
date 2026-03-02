/**
 * Client-side Starkzap + Privy onboarding.
 * Uses POST /api/wallet/starknet (Bearer) and POST /api/wallet/sign (Bearer) for signing.
 *
 * @see https://docs.starknet.io/build/starkzap/integrations/privy#client-side-integration
 * @see https://docs.starknet.io/build/starkzap/integrations/privy#react-native-integration
 */

import { useState, useCallback } from "react";
import {
  StarkZap,
  OnboardStrategy,
  accountPresets,
} from "starkzap";
import type { WalletInterface } from "starkzap";
import { getStarknetWallet, buildPrivyResolveResult } from "./walletClient";

/** Network for SDK. Match backend STARKNET_NETWORK when using same backend. */
const STARKNET_NETWORK = "sepolia";

/**
 * Hook to onboard a Starknet wallet via Privy (client-side).
 * Resolve fetches wallet from backend with Bearer token; signing uses /api/wallet/sign with Bearer.
 */
export function useStarknetWallet(getAccessToken: () => Promise<string | null>) {
  const [wallet, setWallet] = useState<WalletInterface | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onboard = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const token = await getAccessToken();
      if (!token) {
        throw new Error("Not authenticated");
      }
      const walletInfo = await getStarknetWallet(token);
      const resolveResult = buildPrivyResolveResult(walletInfo, getAccessToken);

      const sdk = new StarkZap({ network: STARKNET_NETWORK });
      const result = await sdk.onboard({
        strategy: OnboardStrategy.Privy,
        accountPreset: accountPresets.argentXV050,
        privy: {
          resolve: async () => resolveResult,
        },
        deploy: "never",
      });

      setWallet(result.wallet);
      return result.wallet;
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      setError(msg);
      setWallet(null);
      throw e;
    } finally {
      setLoading(false);
    }
  }, [getAccessToken]);

  const disconnect = useCallback(() => {
    setWallet(null);
    setError(null);
  }, []);

  return { wallet, loading, error, onboard, disconnect };
}

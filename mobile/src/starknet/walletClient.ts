/**
 * Client-side Starknet + Privy integration.
 * Fetches wallet from backend and provides resolve result for Starkzap onboard(Privy).
 * Signing uses POST /api/wallet/sign with Authorization: Bearer <accessToken>.
 *
 * @see https://docs.starknet.io/build/starkzap/integrations/privy#client-side-integration
 */

import { getApiBaseUrl } from "../api";

export interface StarknetWalletInfo {
  id: string;
  address: string;
  publicKey: string;
}

/**
 * Get the user's Starknet wallet from the backend using a fresh Privy access token.
 * Backend returns { wallet: { id, address, publicKey } } (Starkzap-compatible).
 */
export async function getStarknetWallet(accessToken: string): Promise<StarknetWalletInfo> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/api/wallet/starknet`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (data as any)?.message ?? (data as any)?.error ?? `HTTP ${res.status}`;
    throw new Error(msg);
  }
  const wallet = (data as any)?.wallet;
  if (!wallet?.id || !wallet?.publicKey) {
    throw new Error("Invalid wallet response");
  }
  return {
    id: wallet.id,
    address: wallet.address ?? "",
    publicKey: wallet.publicKey,
  };
}

/**
 * Build the object to return from sdk.onboard({ strategy: OnboardStrategy.Privy, privy: { resolve } }).
 * Includes serverUrl and headers so PrivySigner sends Bearer on every sign request.
 */
export function buildPrivyResolveResult(
  wallet: StarknetWalletInfo,
  getAccessToken: () => Promise<string | null>
): {
  walletId: string;
  publicKey: string;
  serverUrl: string;
  headers: () => Promise<Record<string, string>>;
} {
  const base = getApiBaseUrl();
  const serverUrl = `${base}/api/wallet/sign`;

  return {
    walletId: wallet.id,
    publicKey: wallet.publicKey,
    serverUrl,
    headers: async () => {
      const token = await getAccessToken();
      const h: Record<string, string> = {};
      if (token) h.Authorization = `Bearer ${token}`;
      return h;
    },
  };
}

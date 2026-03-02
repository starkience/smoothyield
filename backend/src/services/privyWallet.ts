/**
 * Privy wallet creation and raw signing using the official @privy-io/node SDK.
 * Aligns with Starkzap/Starknet docs: https://docs.starknet.io/build/starkzap/integrations/privy
 *
 * Wallets created with owner: { user_id } require a user authorization signature on raw_sign.
 * The SDK's rawSign() accepts authorization_context: { user_jwts: [token] } and handles
 * request signing internally (JWT exchange + privy-authorization-signature header).
 */

import { PrivyClient } from "@privy-io/node";
import { config } from "../config";
import { normalizeStarknetAddress } from "../utils/address";
import { normalizePrivyToken, decodeJwtClaimsForLog, tokenFingerprint } from "../utils/privyToken";
import { config } from "../config";

const SIGN_TOKEN_TTL_MS = 2 * 60 * 1000; // 2 min

const signTokenCache = new Map<string, { token: string; expiresAt: number }>();

let privyClient: PrivyClient | null = null;

function getPrivyClient(): PrivyClient {
  if (!privyClient) {
    const id = config.privyAppId;
    const secret = config.privyAppSecret;
    if (!id || !secret) throw new Error("Privy app id and secret required for wallet API");
    privyClient = new PrivyClient({ appId: id, appSecret: secret });
  }
  return privyClient;
}

/** Call before a wallet action (stake, deploy, etc.) so /wallet/sign can use the user's token. */
export function setSignTokenForWallet(walletId: string, privyToken: string): void {
  const token = normalizePrivyToken(privyToken);
  if (!token) return;
  signTokenCache.set(walletId, { token, expiresAt: Date.now() + SIGN_TOKEN_TTL_MS });
}

export function getSignTokenForWallet(walletId: string): string | null {
  const entry = signTokenCache.get(walletId);
  if (!entry || Date.now() > entry.expiresAt) {
    signTokenCache.delete(walletId);
    return null;
  }
  return entry.token;
}

export type PrivyWallet = {
  id: string;
  address: string;
  public_key: string;
  chain_type: string;
};

/**
 * Create a Starknet wallet for the given Privy user (owner).
 * Uses the Starkzap-recommended @privy-io/node SDK.
 * Note: Key quorum / wallet infrastructure auth is not supported for Starknet; signing uses user JWT only.
 */
export async function createStarknetWallet(privyUserId: string): Promise<PrivyWallet> {
  const privy = getPrivyClient();
  const wallet = await privy.wallets().create({
    chain_type: "starknet",
    owner: { user_id: privyUserId },
  });
  const address = normalizeStarknetAddress(wallet.address);
  return {
    id: wallet.id,
    address,
    public_key: wallet.public_key ?? "",
    chain_type: wallet.chain_type,
  };
}

/**
 * Sign a raw hash with the wallet using the SDK's rawSign (Starkzap-expected signature flow).
 * Starknet wallets only support user JWT authorization (user_jwts); key quorum / wallet
 * infrastructure auth is not supported for Starknet. Pass the user's Privy token via
 * setSignTokenForWallet before the action, or as privyToken.
 */
export async function rawSign(
  walletId: string,
  hash: string,
  privyToken?: string | null
): Promise<string> {
  const normalizedHash = hash.startsWith("0x") ? hash : "0x" + hash;
  const rawToken = privyToken ?? getSignTokenForWallet(walletId);
  const token = rawToken ? normalizePrivyToken(rawToken) : null;

  if (token) {
    const claims = decodeJwtClaimsForLog(token);
    if (claims) {
      console.log(
        "[wallet/sign] JWT claims (aud=audience, iss=issuer, sub=user):",
        `aud=${claims.aud ?? "?"} iss=${claims.iss ?? "?"} sub=${claims.sub?.slice(0, 24) ?? "?"}… exp=${claims.exp ? new Date(claims.exp * 1000).toISOString() : "?"}`
      );
    } else {
      const preview = token.length > 20 ? token.slice(0, 20) + "…" : token.length + " chars";
      console.log("[wallet/sign] JWT decode failed (token not 3-part?): length=" + token.length, "starts with:", preview);
    }
  }

  if (!token) {
    throw new Error("No Privy token available for wallet sign. Starknet requires user JWT (key quorum not supported).");
  }

  // Defensive: re-verify the exact string we're about to send (rules out intermediary corruption).
  let reVerifyOk = false;
  if (config.privyJwksUrl) {
    try {
      const { verifyPrivyAccessTokenWithJwks } = await import("../utils/privyJwks");
      await verifyPrivyAccessTokenWithJwks(token);
      reVerifyOk = true;
    } catch (e: any) {
      console.warn("[wallet/sign] re-verify with JWKS failed before rawSign:", e?.message);
    }
  }
  console.log("[wallet/sign] token sent to Privy:", tokenFingerprint(token), reVerifyOk ? "(re-verified with JWKS)" : "");

  const privy = getPrivyClient();
  const result = await privy.wallets().rawSign(walletId, {
    params: { hash: normalizedHash },
    authorization_context: { user_jwts: [token] },
  });

  return result.signature ?? "";
}

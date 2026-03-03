/**
 * Privy wallet creation and raw signing using the official @privy-io/node SDK.
 * Matches Starkzap docs: https://docs.starknet.io/build/starkzap/integrations/privy
 *
 * Wallets are server-managed (created without owner, associated via user_id).
 * rawSign uses the app secret only (no user JWT / authorization_context needed).
 */

import { PrivyClient } from "@privy-io/node";
import { config } from "../config";
import { normalizeStarknetAddress } from "../utils/address";

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

export type PrivyWallet = {
  id: string;
  address: string;
  public_key: string;
  chain_type: string;
};

/**
 * Create a Starknet wallet (server-managed, no owner).
 * Matches Starkzap docs: the server can rawSign without authorization_context.
 * @see https://docs.starknet.io/build/starkzap/integrations/privy
 */
export async function createStarknetWallet(_privyUserId: string): Promise<PrivyWallet> {
  const privy = getPrivyClient();
  const wallet = await privy.wallets().create({
    chain_type: "starknet",
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
 * Wallets are server-managed (created without owner), so no authorization_context is needed.
 * @see https://docs.starknet.io/build/starkzap/integrations/privy
 */
export async function rawSign(
  walletId: string,
  hash: string,
): Promise<string> {
  const normalizedHash = hash.startsWith("0x") ? hash : "0x" + hash;

  console.log("[wallet/sign] rawSign walletId:", walletId, "hash:", normalizedHash.slice(0, 16) + "…");

  const privy = getPrivyClient();
  const result = await privy.wallets().rawSign(walletId, {
    params: { hash: normalizedHash },
  });

  return result.signature ?? "";
}

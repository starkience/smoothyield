import { config } from "../config";
import { RpcProvider, ec, stark, num } from "starknet";
import { queries } from "../db";

// ─── Token addresses (Starknet mainnet) ──────────────────────────────────────
// Sourced from starkzap/dist/src/erc20/token/presets.js
const TOKEN_ADDRESSES = {
  mainnet: {
    usdc: "0x033068f6539f8e6e6b131e6b2b814e6c34a5224bc66947c47dab9dfee93b35fb",
    lbtc: "0x036834a40984312f7f7de8d31e3f6305b325389eaeea5b1c0664b2fb936461a4",
  },
  sepolia: {
    usdc: "0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8",
    lbtc: "0x036834a40984312f7f7de8d31e3f6305b325389eaeea5b1c0664b2fb936461a4",
  },
};

// ─── Lazy starkzap SDK loader (ESM package, must use dynamic import) ─────────
let _sdk: any = null;
async function getSdk() {
  if (_sdk) return _sdk;
  const starkzap = await import("starkzap");
  const Cls = starkzap.StarkSDK ?? starkzap.StarkZap;
  const sdkConfig = config.rpcUrl
    ? { rpcUrl: config.rpcUrl }
    : { network: config.network };
  _sdk = new Cls(sdkConfig);
  if (_sdk.setPaymaster) {
    _sdk.setPaymaster({ provider: "avnu", apiKey: config.avnuPaymasterApiKey });
  }
  return _sdk;
}

// ─── Public helpers ───────────────────────────────────────────────────────────

export const getTokenAddresses = () => {
  const preset = config.network === "sepolia"
    ? TOKEN_ADDRESSES.sepolia
    : TOKEN_ADDRESSES.mainnet;
  const usdc = config.usdcTokenAddress || preset.usdc;
  const lbtc = config.lbtcTokenAddress || preset.lbtc;
  return { usdc, lbtc };
};

// ─── Per-user Starknet key management ────────────────────────────────────────

function getOrCreateStarkKey(privyUserId: string): { privateKey: string; publicKey: string } {
  const existing = queries.getStarkKey.get(privyUserId) as any;
  if (existing) return { privateKey: existing.private_key, publicKey: existing.public_key };

  // Generate a new STARK key pair for this user
  const privateKey = stark.randomAddress();
  const pubKeyBytes = ec.starkCurve.getPublicKey(privateKey, true);
  const publicKey = "0x" + num.toHex(BigInt("0x" + Buffer.from(pubKeyBytes).slice(1, 33).toString("hex"))).slice(2).padStart(64, "0");

  queries.upsertStarkKey.run({
    privy_user_id: privyUserId,
    private_key: privateKey,
    public_key: publicKey,
    created_at: new Date().toISOString(),
  });

  return { privateKey, publicKey };
}

export const onboardPrivyWallet = async (privyUserId: string, _privyToken?: string) => {
  const sdk = await getSdk();
  if (!sdk?.onboard) throw new Error("Starkzap SDK onboard unavailable");

  const { privateKey, publicKey } = getOrCreateStarkKey(privyUserId);

  const result = await sdk.onboard({
    strategy: "privy",
    privy: {
      resolve: async () => ({
        walletId: privyUserId,
        publicKey,
        rawSign: async (_walletId: string, messageHash: string) => {
          const hash = messageHash.startsWith("0x") ? messageHash : "0x" + messageHash;
          const sig = ec.starkCurve.sign(hash, privateKey);
          const r = num.toHex(sig.r).slice(2).padStart(64, "0");
          const s = num.toHex(sig.s).slice(2).padStart(64, "0");
          return "0x" + r + s;
        },
      }),
    },
  });
  return result?.wallet ?? result;
};

export const getBalances = async (wallet: any) => {
  const { usdc, lbtc } = getTokenAddresses();
  const usdcBalance = await wallet.balanceOf(usdc);
  const lbtcBalance = await wallet.balanceOf(lbtc);
  return { usdcBalance: String(usdcBalance), lbtcBalance: String(lbtcBalance) };
};

export const sendSponsoredTx = async (wallet: any, calls: any[]) => {
  const tx = await wallet.tx().add(calls).send({ feeMode: "sponsored" });
  return tx;
};

export const getExplorerUrl = (hash: string) => {
  const base =
    config.network === "sepolia"
      ? "https://sepolia.starkscan.co"
      : "https://starkscan.co";
  return `${base}/tx/${hash}`;
};

export const getProvider = () => {
  const nodeUrl = config.rpcUrl || (
    config.network === "sepolia"
      ? "https://starknet-sepolia.public.blastapi.io"
      : "https://starknet-mainnet.public.blastapi.io"
  );
  return new RpcProvider({ nodeUrl });
};

export const getTxStatus = async (hash: string) => {
  const provider = getProvider();
  return provider.getTransactionStatus(hash);
};

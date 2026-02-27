import { config } from "../config";
import { RpcProvider } from "starknet";

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

export const onboardPrivyWallet = async (privyToken: string) => {
  if (config.devMode && (!privyToken || privyToken === "dev")) {
    const mockHash = `0xmock${Date.now().toString(16)}`;
    return {
      address: "0xdev",
      balanceOf: async () => "0",
      tx: () => ({
        add: () => ({
          send: async () => ({ transaction_hash: mockHash }),
        }),
      }),
    };
  }

  const sdk = await getSdk();
  if (!sdk?.onboard) throw new Error("Starkzap SDK onboard unavailable");

  const result = await sdk.onboard({
    strategy: "privy",
    privy: {
      resolve: async () => {
        // In a full integration, resolve wallet ID + public key from Privy server SDK.
        // For now this path only runs with DEV_MODE=false when we have real credentials.
        throw new Error(
          "Privy wallet resolution not yet wired — set DEV_MODE=true or implement privy.resolve()"
        );
      },
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

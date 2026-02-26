import { config } from "../config";
import { RpcProvider } from "starknet";

// Starkzap SDK imports are treated as any to avoid type mismatches in early-stage MVPs.
const starkzap = require("starkzap") as any;

const tokensMainnet = require("starkzap/tokens/mainnet") as any;
const tokensSepolia = require("starkzap/tokens/sepolia") as any;

const sdk = new starkzap.StarkzapSDK({
  network: config.network
});

if (config.avnuPaymasterApiKey && sdk?.setPaymaster) {
  sdk.setPaymaster({
    provider: "avnu",
    apiKey: config.avnuPaymasterApiKey
  });
}

export const getTokenAddresses = () => {
  const preset = config.network === "sepolia" ? tokensSepolia : tokensMainnet;
  const usdc = config.usdcTokenAddress || preset.USDC?.address;
  const lbtc = config.lbtcTokenAddress || preset.LBTC?.address;

  if (!usdc || !lbtc) {
    throw new Error("Missing token address presets");
  }

  return { usdc, lbtc };
};

export const onboardPrivyWallet = async (privyToken: string) => {
  if (config.devMode && privyToken === "dev") {
    const mockHash = `0xmock${Date.now().toString(16)}`;
    return {
      address: "0xdev",
      balanceOf: async () => "0",
      tx: () => ({
        add: () => ({
          send: async () => ({ transaction_hash: mockHash })
        })
      })
    };
  }
  if (!sdk?.onboard) {
    throw new Error("Starkzap SDK onboard unavailable");
  }
  const wallet = await sdk.onboard({
    strategy: "privy",
    privyContext: { token: privyToken },
    accountClass: sdk?.AccountClassPreset?.ArgentX || "argentx"
  });

  return wallet;
};

export const getBalances = async (wallet: any) => {
  const { usdc, lbtc } = getTokenAddresses();
  const usdcBalance = await wallet.balanceOf(usdc);
  const lbtcBalance = await wallet.balanceOf(lbtc);
  return { usdcBalance: String(usdcBalance), lbtcBalance: String(lbtcBalance) };
};

export const sendSponsoredTx = async (wallet: any, calls: any[]) => {
  const tx = await wallet.tx().add(calls).send({
    feeMode: { mode: "sponsored" }
  });
  return tx;
};

export const getExplorerUrl = (hash: string) => {
  const base = config.network === "sepolia" ? "https://sepolia.starkscan.co" : "https://starkscan.co";
  return `${base}/tx/${hash}`;
};

export const getProvider = () => {
  return new RpcProvider({
    nodeUrl:
      config.network === "sepolia"
        ? "https://starknet-sepolia.public.blastapi.io"
        : "https://starknet-mainnet.public.blastapi.io"
  });
};

export const getTxStatus = async (hash: string) => {
  const provider = getProvider();
  const status = await provider.getTransactionStatus(hash);
  return status;
};

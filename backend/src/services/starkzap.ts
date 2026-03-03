import { config } from "../config";
import { RpcProvider } from "starknet";
import { normalizeStarknetAddress } from "../utils/address";

// Starkzap is ESM-only (exports only "import"); we load it via dynamic import to avoid ERR_PACKAGE_PATH_NOT_EXPORTED.
type Token = { address: string; decimals: number; symbol: string; name?: string; metadata?: unknown };

let _presets: { mainnet: { USDC: Token; USDC_E?: Token; LBTC: Token }; sepolia: { USDC: Token; USDC_E?: Token; LBTC: Token } } | null = null;
async function getPresetTokens(): Promise<{ USDC: Token; USDC_E?: Token; LBTC: Token }> {
  if (!_presets) {
    const m = await import("starkzap");
    _presets = { mainnet: m.mainnetTokens, sepolia: m.sepoliaTokens };
  }
  return config.network === "sepolia" ? _presets.sepolia : _presets.mainnet;
}

function tokenOverride(address: string, preset: Token): Token {
  return { ...preset, address };
}

/**
 * Returns ERC20 token objects from Starkzap presets.
 * Use with wallet.balanceOf(token); use .address where raw address is needed.
 */
export const getTokenAddresses = async (): Promise<{
  usdc: Token;
  usdcBridged: Token | null;
  lbtc: Token;
}> => {
  const preset = await getPresetTokens();
  const usdc = config.usdcTokenAddress
    ? tokenOverride(config.usdcTokenAddress, preset.USDC)
    : preset.USDC;
  const usdcBridged =
    "USDC_E" in preset && preset.USDC_E && !config.usdcTokenAddress
      ? preset.USDC_E
      : null;
  const lbtc = config.lbtcTokenAddress
    ? tokenOverride(config.lbtcTokenAddress, preset.LBTC)
    : preset.LBTC;
  return { usdc, usdcBridged, lbtc };
};

// ─── Lazy Starkzap SDK loader (ESM package, must use dynamic import) ─────────
// Paymaster: https://docs.starknet.io/build/starkzap/paymasters
// AVNU integration: https://docs.starknet.io/build/starkzap/integrations/avnu-paymaster
let _sdk: any = null;
async function getSdk() {
  if (_sdk) return _sdk;
  const starkzap = await import("starkzap");
  const Cls = starkzap.StarkSDK ?? starkzap.StarkZap;
  const rpcUrl =
    config.rpcUrl ||
    (config.alchemyStarknetApiKey
      ? (config.network === "sepolia"
          ? `https://starknet-sepolia.g.alchemy.com/v2/${config.alchemyStarknetApiKey}`
          : `https://starknet-mainnet.g.alchemy.com/v2/${config.alchemyStarknetApiKey}`)
      : undefined);
  const network = (config.network || "mainnet") as "mainnet" | "sepolia";
  const sdkConfig = rpcUrl
    ? { rpcUrl, network }
    : { network };

  // Gasfree mode: apiKey required (from AVNU Portal). Pass as header; omit paymaster for gasless-only.
  const paymaster =
    config.avnuPaymasterApiKey
      ? {
          nodeUrl:
            config.network === "sepolia"
              ? "https://sepolia.paymaster.avnu.fi"
              : "https://starknet.paymaster.avnu.fi",
          headers: { "x-paymaster-api-key": config.avnuPaymasterApiKey },
        }
      : undefined;

  _sdk = new Cls({
    ...sdkConfig,
    ...(paymaster && { paymaster }),
  });
  return _sdk;
}

// ─── Public helpers ───────────────────────────────────────────────────────────

/**
 * Connect a wallet using Privy (Starkzap Privy strategy).
 * Matches Starkzap docs: https://docs.starknet.io/build/starkzap/connecting-wallets and
 * https://docs.starknet.io/build/starkzap/integrations/privy
 * We use deploy: "never" so we never send a standalone DEPLOY_ACCOUNT (which was going out
 * with paymaster_data: [] and failing). The first Stake/Convert will deploy + execute in
 * one sponsored tx via wallet.execute() -> deployPaymasterWith(calls).
 */
export const onboardPrivyWallet = async (
  _privyUserId: string,
  privyWalletId: string,
  publicKey: string,
  signEndpointUrl: string
) => {
  if (!config.avnuPaymasterApiKey) {
    throw new Error(
      "AVNU_PAYMASTER_API_KEY is required for gasfree (sponsored) deploy and execute. Set it in backend .env. See https://docs.starknet.io/build/starkzap/paymasters"
    );
  }
  const sdk = await getSdk();
  if (!sdk?.onboard) throw new Error("Starkzap SDK onboard unavailable");

  const result = await sdk.onboard({
    strategy: "privy",
    privy: {
      resolve: async () => ({
        walletId: privyWalletId,
        publicKey,
        serverUrl: signEndpointUrl,
      }),
    },
    deploy: "never",
    feeMode: "sponsored",
  });
  return result?.wallet ?? result;
};

/**
 * Normalize calls so the paymaster (SNIP-29 convertCalls) always receives `to` (from contractAddress).
 * Handles SDKs that use `to`/`contract_address`/`selector` instead of `contractAddress`/`entrypoint`.
 */
function normalizeCallsForPaymaster(calls: any[]): any[] {
  console.log("[normalizeCallsForPaymaster] Input calls count:", calls?.length);
  return calls.map((c, i) => {
    console.log(`[normalizeCallsForPaymaster] call[${i}] raw keys:`, Object.keys(c ?? {}));
    console.log(`[normalizeCallsForPaymaster] call[${i}] contractAddress=${c?.contractAddress} to=${c?.to} contract_address=${c?.contract_address}`);
    console.log(`[normalizeCallsForPaymaster] call[${i}] entrypoint=${c?.entrypoint} entry_point_selector=${c?.entry_point_selector} selector=${c?.selector}`);
    console.log(`[normalizeCallsForPaymaster] call[${i}] calldata:`, JSON.stringify(c?.calldata));

    const contractAddress =
      c.contractAddress ?? c.to ?? c.contract_address;
    const addressStr =
      typeof contractAddress === "string"
        ? contractAddress
        : contractAddress != null
          ? String(contractAddress)
          : undefined;
    const entrypoint =
      c.entrypoint ?? c.entry_point_selector ?? c.selector;
    const calldata = Array.isArray(c.calldata) ? c.calldata : [];

    console.log(`[normalizeCallsForPaymaster] call[${i}] resolved → contractAddress="${addressStr}" entrypoint="${entrypoint}" calldata length=${calldata.length}`);

    if (!entrypoint) {
      throw new Error(
        `[normalizeCallsForPaymaster] call[${i}] missing entrypoint. Raw call: ${JSON.stringify(c)}`
      );
    }
    if (!addressStr) {
      throw new Error(
        `[normalizeCallsForPaymaster] call[${i}] missing contractAddress/to/contract_address. Raw call: ${JSON.stringify(c)}`
      );
    }
    // Return an object with all possible address/selector keys to satisfy different Paymaster/RPC schemas
    const normalized = {
      contractAddress: addressStr,
      contract_address: addressStr,
      to: addressStr,
      entrypoint,
      entry_point_selector: entrypoint,
      calldata,
    };
    console.log(`[normalizeCallsForPaymaster] call[${i}] normalized:`, JSON.stringify(normalized));
    return normalized;
  });
}

/** Wallet balances using Starkzap token presets and Amount (ERC20 docs). Returns raw base amounts for API. */
export const getBalances = async (wallet: any) => {
  const { usdc, usdcBridged, lbtc } = await getTokenAddresses();
  const usdcBal = await wallet.balanceOf(usdc);
  let usdcRaw = usdcBal.toBase();
  if (usdcBridged) {
    const bridgedBal = await wallet.balanceOf(usdcBridged);
    usdcRaw += bridgedBal.toBase();
  }
  const lbtcBal = await wallet.balanceOf(lbtc);
  return {
    usdcBalance: String(usdcRaw),
    lbtcBalance: String(lbtcBal.toBase()),
  };
};

/**
 * Read-only balance fetch by wallet address (no Starkzap wallet, no deploy).
 * Use this for GET /portfolio so we never trigger a deploy when just loading balances.
 * On mainnet, fetches both native USDC and bridged USDC.e and sums them for usdcBalance.
 */
export const getBalancesByAddress = async (walletAddress: string) => {
  const provider = getProvider();
  const { usdc, usdcBridged, lbtc } = await getTokenAddresses();
  const normalizedAddress = normalizeStarknetAddress(walletAddress);
  const zero = "0";

  const call = (tokenAddress: string, label: string) =>
    provider
      .callContract({
        contractAddress: tokenAddress,
        entrypoint: "balance_of",
        calldata: [normalizedAddress],
      })
      .catch((err: unknown) => {
        console.error(`[getBalancesByAddress] ${label} balance_of failed:`, err instanceof Error ? err.message : err);
        return { result: [0n, 0n] };
      });

  const toStr = (res: { result?: unknown } | unknown[]) => {
    const arr = Array.isArray(res) ? res : (res && typeof res === "object" && "result" in res && Array.isArray((res as { result: unknown }).result) ? (res as { result: unknown[] }).result : null);
    if (!arr || arr.length === 0) return zero;
    const r = arr as (bigint | string)[];
    const toBig = (v: bigint | string) => (typeof v === "string" ? BigInt(v) : v);
    if (r.length >= 2) return String((toBig(r[1]) << 128n) + toBig(r[0]));
    return String(toBig(r[0]));
  };

  const [usdcRes, lbtcRes] = await Promise.all([call(usdc.address, "USDC"), call(lbtc.address, "LBTC")]);
  let usdcBalance = toStr(usdcRes as { result?: bigint[] });

  if (usdcBridged) {
    const usdcBridgedRes = await call(usdcBridged.address, "USDC.e");
    const bridged = toStr(usdcBridgedRes as { result?: bigint[] });
    if (bridged !== zero) {
      usdcBalance = String(BigInt(usdcBalance) + BigInt(bridged));
    }
  }

  return {
    usdcBalance,
    lbtcBalance: toStr(lbtcRes as { result?: bigint[] }),
  };
};

export const sendSponsoredTx = async (wallet: any, calls: any[]) => {
  // Gasfree: feeMode "sponsored" uses SDK paymaster (AVNU when apiKey set)
  // Normalize so paymaster convertCalls always gets contractAddress (→ "to") and entrypoint.
  //
  // IMPORTANT: Do NOT use wallet.tx().add(normalizedArray).send() here.
  // TxBuilder.add() uses rest parameters (...calls), so passing an array as a single arg
  // wraps it as [[call1, call2]] in this.pending. After flat(), execute() receives [[call1, call2]]
  // instead of [call1, call2], and convertCalls() treats the inner array as a single call object —
  // call.contractAddress is undefined on an array, so "to" is missing from the paymaster request.
  // Calling wallet.execute(calls, options) directly avoids this nesting issue entirely.
  //
  // Defensive: flatten input in case SDK returns nested array (e.g. [[c1, c2]]); ensure we pass
  // a flat array of call objects to wallet.execute so convertCalls never sees an array as a call.
  const flatInput =
    Array.isArray(calls) && calls.length > 0 && Array.isArray(calls[0])
      ? (calls as any[]).flat(Infinity)
      : Array.isArray(calls)
        ? [...calls]
        : [];
  const normalized = normalizeCallsForPaymaster(flatInput);
  // Ensure we never pass a nested array (e.g. [[c1, c2]]) to execute — convertCalls would treat inner array as one call with no contractAddress → missing "to"
  let toExecute: any[] = normalized;
  while (toExecute.length === 1 && Array.isArray(toExecute[0])) toExecute = toExecute[0];
  if (toExecute.some((c) => Array.isArray(c))) toExecute = toExecute.flat(Infinity);

  console.log("[sendSponsoredTx] Input calls count:", calls?.length, "| flatInput length:", flatInput.length, "| toExecute length:", toExecute.length);
  console.log("[sendSponsoredTx] toExecute has nested array:", toExecute.some((c) => Array.isArray(c)));
  console.log("[sendSponsoredTx] Normalized calls passed to wallet.execute():", JSON.stringify(toExecute, null, 2));

  const tx = await wallet.execute(toExecute, { feeMode: "sponsored" });
  return tx;
};

/**
 * Deploy the account on-chain (sponsored) so the address shows on Voyager and can receive/hold funds.
 * Call this before any DeFi if you want the account to exist on-chain first.
 * @returns { txHash, explorerUrl } if a deploy tx was sent, or { alreadyDeployed: true } if already deployed.
 */
export const deployAccountIfNeeded = async (wallet: any): Promise<
  | { txHash: string; explorerUrl: string }
  | { alreadyDeployed: true }
> => {
  const deployed = await wallet.isDeployed?.();
  if (deployed) {
    return { alreadyDeployed: true };
  }
  const tx = await wallet.deploy?.({ feeMode: "sponsored" });
  if (!tx) {
    throw new Error("Starkzap wallet.deploy not available");
  }
  const hash = tx?.transaction_hash ?? tx?.hash ?? tx;
  return {
    txHash: String(hash),
    explorerUrl: getExplorerUrl(String(hash)),
  };
};

export const getExplorerUrl = (hash: string) => {
  const base =
    config.network === "sepolia"
      ? "https://sepolia.voyager.online"
      : "https://voyager.online";
  return `${base}/tx/${hash}`;
};

export const getProvider = () => {
  let nodeUrl = config.rpcUrl;
  if (!nodeUrl && config.alchemyStarknetApiKey) {
    const base =
      config.network === "sepolia"
        ? "https://starknet-sepolia.g.alchemy.com/v2"
        : "https://starknet-mainnet.g.alchemy.com/v2";
    nodeUrl = `${base}/${config.alchemyStarknetApiKey}`;
  }
  if (!nodeUrl) {
    nodeUrl =
      config.network === "sepolia"
        ? "https://starknet-sepolia.public.blastapi.io"
        : "https://starknet-mainnet.public.blastapi.io";
    console.warn(
      "[starkzap] No STARKNET_RPC_URL or ALCHEMY_STARKNET_API_KEY set; using Blast public RPC (deprecated). Set ALCHEMY_STARKNET_API_KEY in .env for Alchemy."
    );
  }
  return new RpcProvider({ nodeUrl });
};

export const getTxStatus = async (hash: string) => {
  const provider = getProvider();
  return provider.getTransactionStatus(hash);
};

/**
 * Resolve the native staking pool address for LBTC (Starknet delegation).
 * Uses Starkzap Staking: finds a validator that has an LBTC pool on the configured network.
 * Same ecosystem as https://dashboard.endur.fi/ (Starknet native staking dashboard).
 * Cached per network for the process lifetime.
 */
let _lbtcPoolAddress: string | null = null;
export const getLbtcPoolAddress = async (): Promise<string | null> => {
  if (_lbtcPoolAddress) return _lbtcPoolAddress;
  const provider = getProvider();
  const starkzap = await import("starkzap");
  const ChainId = starkzap.ChainId;
  const chainId = config.network === "sepolia" ? ChainId.SEPOLIA : ChainId.MAINNET;
  const stakingConfig = starkzap.getStakingPreset(chainId);
  const validators = config.network === "sepolia" ? starkzap.sepoliaValidators : starkzap.mainnetValidators;
  const validatorList = Object.values(validators) as { stakerAddress: string }[];
  for (const v of validatorList) {
    try {
      // @ts-ignore
      const pools = await starkzap.Staking.getStakerPools(provider as any, v.stakerAddress as any, stakingConfig);
      const lbtcPool = pools.find((p: { token: { symbol: string } }) => p.token.symbol === "LBTC");
      if (lbtcPool) {
        const addr = lbtcPool.poolContract;
        _lbtcPoolAddress = typeof addr === "string" ? addr : String(addr);
        return _lbtcPoolAddress;
      }
    } catch {
      continue;
    }
  }
  return null;
};

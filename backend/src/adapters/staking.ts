import { config } from "../config";
import { getTokenAddresses, sendSponsoredTx, getExplorerUrl, getLbtcPoolAddress, getProvider } from "../services/starkzap";

export type StakeResult = {
  txHash: string;
  explorerUrl: string;
  status: "submitted" | "mocked";
};

/**
 * Stake LBTC on Starknet.
 * - If BTC_STAKING_CONTRACT_ADDRESS is set: uses a single raw invoke to that contract (legacy/custom).
 * - Otherwise: uses Starkzap native staking (delegation to a validator's LBTC pool); deposits to the
 *   official staking contract and you earn real mainnet yield. Gas is sponsored when AVNU paymaster is configured.
 */
export const stakeLbtc = async (wallet: any, amount: string): Promise<StakeResult> => {
  console.log("[stakeLbtc] Called with amount:", amount, "| btcStakingContractAddress:", config.btcStakingContractAddress || "(none)");

  if (config.btcStakingContractAddress) {
    const { lbtc } = await getTokenAddresses();
    const tokenAddress = config.btcStakingTokenAddress || lbtc.address;
    const calls = [
      {
        contractAddress: config.btcStakingContractAddress,
        entrypoint: config.btcStakingEntrypoint,
        calldata: [tokenAddress, amount],
      },
    ];
    console.log("[stakeLbtc] Custom contract path. Calls:", JSON.stringify(calls, null, 2));
    const tx = await sendSponsoredTx(wallet, calls);
    const hash = tx?.transaction_hash || tx?.hash || tx;
    return {
      txHash: hash,
      explorerUrl: getExplorerUrl(hash),
      status: "submitted",
    };
  }

  // Native staking via Starkzap: find LBTC pool and call wallet.stake()
  const { lbtc } = await getTokenAddresses();
  console.log("[stakeLbtc] LBTC token:", JSON.stringify(lbtc));

  const poolAddress = await getLbtcPoolAddress();
  console.log("[stakeLbtc] Pool address:", poolAddress);
  if (!poolAddress) {
    throw new Error(
      "No LBTC staking pool found on this network. Native LBTC staking may not be enabled yet; check Starknet staking docs or set BTC_STAKING_CONTRACT_ADDRESS for a custom contract."
    );
  }

  // Native staking via Starkzap: build approve + enter/add calls, normalize for paymaster, then execute
  const starkzap = await import("starkzap");
  const { Staking, Amount, ChainId, getStakingPreset } = starkzap;
  const provider = getProvider();
  const chainId = config.network === "sepolia" ? ChainId.SEPOLIA : ChainId.MAINNET;
  const stakingConfig = getStakingPreset(chainId);
  console.log("[stakeLbtc] chainId:", chainId, "| stakingConfig:", JSON.stringify(stakingConfig));

  const staking = await Staking.fromPool(poolAddress as any, provider as any, stakingConfig);
  const walletAddress = wallet?.address ?? wallet?.accountAddress ?? wallet?.account?.address;
  console.log("[stakeLbtc] walletAddress:", walletAddress);
  if (!walletAddress) {
    throw new Error("Wallet address unavailable for staking");
  }

  let amountObj;
  try {
    const amountStr = String(amount);
    amountObj = Amount.fromRaw(amountStr, lbtc.decimals, lbtc.symbol);
    console.log("[stakeLbtc] amountObj: toBase=", amountObj?.toBase?.(), "toUnit=", amountObj?.toUnit?.());
  } catch (err: any) {
    console.error("[stakeLbtc] Amount.fromRaw failed:", err?.message, err);
    throw err;
  }

  let isMember: boolean;
  try {
    isMember = await staking.isMember(wallet);
    console.log("[stakeLbtc] isMember:", isMember);
  } catch (err: any) {
    console.error("[stakeLbtc] staking.isMember failed:", err?.message, err);
    throw err;
  }

  const rawCalls = isMember
    ? staking.populateAdd(walletAddress, amountObj)
    : staking.populateEnter(walletAddress, amountObj);

  console.log("[stakeLbtc] rawCalls from starkzap (BEFORE normalization):", JSON.stringify(rawCalls, null, 2));

  const tx = await sendSponsoredTx(wallet, rawCalls);
  const hash = tx?.transaction_hash ?? tx?.hash ?? tx;
  return {
    txHash: String(hash),
    explorerUrl: getExplorerUrl(String(hash)),
    status: "submitted",
  };
};

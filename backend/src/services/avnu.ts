import {
  fetchQuotes,
  fetchBuildExecuteTransaction,
  buildApproveTx,
} from "@avnu/avnu-sdk";
import { config } from "../config";

const SLIPPAGE = 0.005; // 0.5%

export const buildSwapCalls = async (params: {
  sellTokenAddress: string;
  buyTokenAddress: string;
  sellAmount: string;
  takerAddress: string;
}) => {
  const avnuOptions = {
    baseUrl: config.network === "sepolia" ? "https://sepolia.api.avnu.fi" : undefined,
    dev: config.network === "sepolia",
  };

  const request = {
    sellTokenAddress: params.sellTokenAddress,
    buyTokenAddress: params.buyTokenAddress,
    sellAmount: BigInt(params.sellAmount),
    takerAddress: params.takerAddress,
    integratorName: "tradfi-btc-yield",
    integratorFees: BigInt(config.integratorFeeBps ?? 0),
    integratorFeeRecipient: config.treasuryAddress || params.takerAddress,
  };

  const quotes = await fetchQuotes(request, avnuOptions);

  if (!quotes?.length) {
    throw new Error("No AVNU quotes returned");
  }

  const quote = quotes[0];

  const executeCall = await fetchBuildExecuteTransaction(
    quote.quoteId,
    undefined,
    params.takerAddress,
    SLIPPAGE,
    avnuOptions
  );

  // Normalize to Call shape { contractAddress, entrypoint, calldata } so paymaster convertCalls gets "to"
  const executeCallNormalized = {
    contractAddress:
      (executeCall as any).contract_address ?? (executeCall as any).contractAddress,
    entrypoint:
      (executeCall as any).entrypoint ?? (executeCall as any).entry_point_selector ?? "execute",
    calldata: (executeCall as any).calldata ?? [],
  };
  if (!executeCallNormalized.contractAddress) {
    throw new Error(
      "AVNU build response missing contract address (contract_address). Paymaster requires each call to have 'to'."
    );
  }

  const approveCall = buildApproveTx(
    quote.sellTokenAddress,
    quote.sellAmount,
    quote.chainId,
    avnuOptions.dev
  );

  const calls = [
    approveCall,
    executeCallNormalized,
  ];

  return { quote, calls };
};

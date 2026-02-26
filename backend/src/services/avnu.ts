import { getQuotes, quoteToCalls } from "@avnu/avnu-sdk";
import { config } from "../config";

export const buildSwapCalls = async (params: {
  sellTokenAddress: string;
  buyTokenAddress: string;
  sellAmount: string;
  takerAddress: string;
}) => {
  const quotes = await getQuotes({
    sellTokenAddress: params.sellTokenAddress,
    buyTokenAddress: params.buyTokenAddress,
    sellAmount: params.sellAmount,
    takerAddress: params.takerAddress,
    integratorName: "tradfi-btc-yield",
    integratorFees: config.integratorFeeBps,
    integratorFeeRecipient: config.treasuryAddress || params.takerAddress
  });

  if (!quotes?.length) {
    throw new Error("No AVNU quotes returned");
  }

  const quote = quotes[0];
  const calls = await quoteToCalls({
    quoteId: quote.quoteId,
    slippage: 0.5,
    takerAddress: params.takerAddress
  });

  return { quote, calls };
};

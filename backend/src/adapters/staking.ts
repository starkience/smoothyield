import { config } from "../config";
import { getTokenAddresses, sendSponsoredTx, getExplorerUrl } from "../services/starkzap";

export type StakeResult = {
  txHash: string;
  explorerUrl: string;
  status: "submitted" | "mocked";
};

export const stakeLbtc = async (wallet: any, amount: string): Promise<StakeResult> => {
  if (!config.btcStakingContractAddress) {
    const mockHash = `0xmock${Date.now().toString(16)}`;
    return {
      txHash: mockHash,
      explorerUrl: getExplorerUrl(mockHash),
      status: "mocked"
    };
  }

  const { lbtc } = getTokenAddresses();
  const tokenAddress = config.btcStakingTokenAddress || lbtc;

  const calls = [
    {
      contractAddress: config.btcStakingContractAddress,
      entrypoint: config.btcStakingEntrypoint,
      calldata: [tokenAddress, amount]
    }
  ];

  const tx = await sendSponsoredTx(wallet, calls);
  const hash = tx?.transaction_hash || tx?.hash || tx;

  return {
    txHash: hash,
    explorerUrl: getExplorerUrl(hash),
    status: "submitted"
  };
};

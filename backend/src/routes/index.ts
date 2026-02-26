import { Router } from "express";
import { z } from "zod";
import crypto from "crypto";
import { requireSession } from "../middleware";
import { queries } from "../db";
import { verifyPrivyToken } from "../services/privy";
import { config } from "../config";
import { onboardPrivyWallet, getBalances, getExplorerUrl, getTxStatus, getTokenAddresses } from "../services/starkzap";
import { tradfiHoldings, cashUsd, totalValueUsd } from "../services/mockData";
import { buildSwapCalls } from "../services/avnu";
import { sendSponsoredTx } from "../services/starkzap";
import { stakeLbtc } from "../adapters/staking";

export const apiRouter = Router();

apiRouter.post("/auth/session", async (req, res) => {
  const body = z.object({ privyToken: z.string() }).safeParse(req.body);
  if (!body.success) {
    return res.status(400).json({ error: "Invalid body" });
  }

  try {
    const user = await verifyPrivyToken(body.data.privyToken);
    queries.upsertUser.run({
      privy_user_id: user.id,
      email: user.email || null
    });

    const sessionId = crypto.randomUUID();
    queries.createSession.run({
      id: sessionId,
      privy_user_id: user.id,
      privy_token: body.data.privyToken,
      created_at: new Date().toISOString()
    });

    return res.json({ sessionId });
  } catch (err: any) {
    return res.status(401).json({ error: err?.message || "Auth failed" });
  }
});

apiRouter.post("/wallet/init", requireSession, async (req, res) => {
  try {
    const wallet = await onboardPrivyWallet(req.session!.privy_token);
    const walletAddress = wallet?.address || wallet?.accountAddress || wallet?.account?.address;

    if (!walletAddress) {
      return res.status(500).json({ error: "Wallet address unavailable" });
    }

    queries.upsertWallet.run({
      privy_user_id: req.session!.privy_user_id,
      wallet_address: walletAddress,
      created_at: new Date().toISOString()
    });

    return res.json({ ready: true });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Wallet init failed" });
  }
});

apiRouter.get("/portfolio", requireSession, async (req, res) => {
  let usdcBalance = "0";
  let lbtcBalance = "0";

  try {
    const walletRow = queries.getWallet.get(req.session!.privy_user_id) as any;
    if (walletRow) {
      const wallet = await onboardPrivyWallet(req.session!.privy_token);
      const balances = await getBalances(wallet);
      usdcBalance = balances.usdcBalance;
      lbtcBalance = balances.lbtcBalance;
    }
  } catch {
    // keep defaults
  }

  const yieldPosition = (queries.getYieldPosition.get(req.session!.privy_user_id) as any) || {
    status: "none",
    apy: 0,
    accrued_usd: 0
  };

  return res.json({
    tradfiHoldings,
    cashUsd,
    totalValueUsd,
    crypto: {
      usdcBalance,
      lbtcBalance,
      btcYieldPosition: {
        status: yieldPosition.status,
        apy: yieldPosition.apy,
        accruedUsd: yieldPosition.accrued_usd
      }
    }
  });
});

apiRouter.post("/onramp/session", requireSession, async (req, res) => {
  const sessionId = crypto.randomUUID();
  const amountUsdc = "1000000";

  queries.createOnrampSession.run({
    id: sessionId,
    privy_user_id: req.session!.privy_user_id,
    status: "created",
    amount_usdc: amountUsdc,
    created_at: new Date().toISOString()
  });

  const onrampUrl = `https://example.com/onramp?session=${sessionId}`;
  return res.json({ onrampUrl });
});

apiRouter.post("/onramp/confirm", requireSession, async (req, res) => {
  const latest = queries.getLatestOnrampSession.get(req.session!.privy_user_id) as any;
  if (!latest) {
    return res.status(404).json({ error: "No onramp session" });
  }

  queries.updateOnrampStatus.run({ id: latest.id, status: "completed" });
  return res.json({ usdcDetected: true, amountUsdc: latest.amount_usdc });
});

apiRouter.post("/yield/convert", requireSession, async (req, res) => {
  const body = z
    .object({ amountUsdc: z.string().optional(), forceOnchain: z.boolean().optional() })
    .safeParse(req.body);

  if (!body.success) {
    return res.status(400).json({ error: "Invalid body" });
  }

  if (config.devMode && !body.data.forceOnchain) {
    const mockHash = `0xmock${Date.now().toString(16)}`;
    return res.json({
      txHash: mockHash,
      explorerUrl: getExplorerUrl(mockHash),
      status: "mocked"
    });
  }

  try {
    const wallet = await onboardPrivyWallet(req.session!.privy_token);
    const walletAddress = wallet?.address || wallet?.accountAddress || wallet?.account?.address;

    if (!walletAddress) {
      return res.status(500).json({ error: "Wallet address unavailable" });
    }

    const { usdc, lbtc } = getTokenAddresses();
    const sellAmount = body.data.amountUsdc || "1000000";

    const { calls } = await buildSwapCalls({
      sellTokenAddress: usdc,
      buyTokenAddress: lbtc,
      sellAmount,
      takerAddress: walletAddress
    });

    const tx = await sendSponsoredTx(wallet, calls);
    const hash = tx?.transaction_hash || tx?.hash || tx;

    queries.upsertTx.run({
      hash,
      status: "submitted",
      created_at: new Date().toISOString()
    });

    return res.json({
      txHash: hash,
      explorerUrl: getExplorerUrl(hash),
      status: "submitted"
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Swap failed" });
  }
});

apiRouter.post("/yield/stake", requireSession, async (req, res) => {
  const body = z.object({ amountLbtc: z.string().optional() }).safeParse(req.body);
  if (!body.success) {
    return res.status(400).json({ error: "Invalid body" });
  }

  try {
    const wallet = await onboardPrivyWallet(req.session!.privy_token);
    const amount = body.data.amountLbtc || "1000000";

    const result = await stakeLbtc(wallet, amount);

    queries.upsertYieldPosition.run({
      privy_user_id: req.session!.privy_user_id,
      status: "earning",
      apy: 4.8,
      accrued_usd: 3.12
    });

    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Stake failed" });
  }
});

apiRouter.get("/tx/:hash", requireSession, async (req, res) => {
  const hash = req.params.hash;
  try {
    const cached = queries.getTx.get(hash) as any;
    if (config.devMode && cached) {
      return res.json({ hash, status: cached.status });
    }

    const status = await getTxStatus(hash);
    const statusText = status?.finality_status || status?.execution_status || "unknown";

    queries.upsertTx.run({
      hash,
      status: statusText,
      created_at: new Date().toISOString()
    });

    return res.json({ hash, status: statusText });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Status check failed" });
  }
});

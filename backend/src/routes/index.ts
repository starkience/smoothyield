import { Router } from "express";
import { z } from "zod";
import crypto from "crypto";
import { requireSession } from "../middleware";
import { queries } from "../db";
import { verifyPrivyToken } from "../services/privy";
import { verifyPrivyAccessTokenWithJwks } from "../utils/privyJwks";
import { config } from "../config";
import {
  onboardPrivyWallet,
  getBalances,
  getBalancesByAddress,
  getExplorerUrl,
  getTxStatus,
  getTokenAddresses,
  sendSponsoredTx,
  deployAccountIfNeeded,
} from "../services/starkzap";
import { createStarknetWallet, rawSign } from "../services/privyWallet";
import { normalizeStarknetAddress } from "../utils/address";
import { normalizePrivyToken } from "../utils/privyToken";
import { tradfiHoldings, cashUsd, totalValueUsd } from "../services/mockData";
import { getCryptoMarkets } from "../services/coingecko";
import { buildSwapCalls } from "../services/avnu";
import { stakeLbtc, unstakeLbtc, exitLbtc } from "../adapters/staking";

export const apiRouter = Router();

// ─── Market data (public) ────────────────────────────────────────────────────

const STOCK_LOGO_BASE = "https://raw.githubusercontent.com/nvstly/icons/main/ticker_icons";

apiRouter.get("/market-data", async (_req, res) => {
  try {
    const coins = await getCryptoMarkets();
    const crypto = coins.map((c) => ({
      id: c.id,
      symbol: c.symbol.toUpperCase(),
      name: c.name,
      price: c.current_price,
      changePct: c.price_change_percentage_24h ?? 0,
      image: c.image,
    }));

    const stocks = tradfiHoldings.map((h) => ({
      ticker: h.ticker,
      name: h.name,
      price: h.price,
      changePct: h.changePct,
      logoUrl: `${STOCK_LOGO_BASE}/${h.ticker}.png`,
    }));

    return res.json({ crypto, stocks });
  } catch (e: any) {
    console.error("[market-data]", e?.message);
    return res.status(500).json({ error: "Failed to fetch market data" });
  }
});

// ─── Auth ─────────────────────────────────────────────────────────────────────

apiRouter.post("/auth/session", async (req, res) => {
  const body = z.object({ privyToken: z.string() }).safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "Invalid body" });

  try {
    const rawToken = body.data.privyToken;
    const token = normalizePrivyToken(rawToken);
    const user = await verifyPrivyToken(token);
    queries.upsertUser.run({ privy_user_id: user.id, email: user.email || null });

    const sessionId = crypto.randomUUID();
    queries.createSession.run({
      id: sessionId,
      privy_user_id: user.id,
      privy_token: token,
      created_at: new Date().toISOString(),
    });

    return res.json({ sessionId });
  } catch (err: any) {
    return res.status(401).json({ error: err?.message || "Auth failed" });
  }
});

// ─── Wallet ───────────────────────────────────────────────────────────────────
// Starkzap Privy integration: https://docs.starknet.io/build/starkzap/connecting-wallets
// and https://docs.starknet.io/build/starkzap/integrations/privy

/**
 * POST /api/wallet/starknet
 * Starkzap-compatible endpoint: client sends Authorization: Bearer <accessToken>, backend returns
 * { wallet: { id, address, publicKey } } for use with PrivySigner / sdk.onboard({ strategy: OnboardStrategy.Privy, privy: { resolve: () => fetch this } }).
 * Creates or returns the Starknet wallet for the authenticated user.
 */
apiRouter.post("/wallet/starknet", async (req, res) => {
  const rawToken = req.headers.authorization?.replace(/^Bearer\s+/i, "")?.trim();
  const token = normalizePrivyToken(rawToken || "");
  if (!token) {
    return res.status(401).json({ error: "Authorization: Bearer <accessToken> required" });
  }

  try {
    let privyUserId: string;
    if (config.privyJwksUrl) {
      try {
        await verifyPrivyAccessTokenWithJwks(token);
      } catch {
        return res.status(401).json({ error: "Invalid or expired token" });
      }
    }
    const user = await verifyPrivyToken(token);
    privyUserId = user.id;

    queries.upsertUser.run({ privy_user_id: privyUserId, email: user.email ?? null });
    let walletRow = queries.getWallet.get(privyUserId) as any;

    if (!walletRow?.privy_wallet_id || !walletRow?.public_key) {
      const privyWallet = await createStarknetWallet(privyUserId);
      const address = normalizeStarknetAddress(privyWallet.address);
      queries.upsertWallet.run({
        privy_user_id: privyUserId,
        wallet_address: address,
        privy_wallet_id: privyWallet.id,
        public_key: privyWallet.public_key,
        created_at: new Date().toISOString(),
      });
      walletRow = queries.getWallet.get(privyUserId) as any;
    }

    return res.json({
      wallet: {
        id: walletRow.privy_wallet_id,
        address: normalizeStarknetAddress(walletRow.wallet_address),
        publicKey: walletRow.public_key ?? "",
      },
    });
  } catch (err: any) {
    const msg = err?.message || "Wallet failed";
    if (msg.includes("expired") || msg.includes("invalid") || msg.includes("verification")) {
      return res.status(401).json({ error: msg });
    }
    console.error("[wallet/starknet]", msg, err);
    return res.status(500).json({ error: msg });
  }
});

apiRouter.post("/wallet/init", requireSession, async (req, res) => {
  try {
    const privyUserId = req.session!.privy_user_id;
    let walletRow = queries.getWallet.get(privyUserId) as any;

    if (!walletRow?.wallet_address || !walletRow?.privy_wallet_id) {
      const privyWallet = await createStarknetWallet(privyUserId);
      const address = normalizeStarknetAddress(privyWallet.address);
      queries.upsertWallet.run({
        privy_user_id: privyUserId,
        wallet_address: address,
        privy_wallet_id: privyWallet.id,
        public_key: privyWallet.public_key,
        created_at: new Date().toISOString(),
      });
      walletRow = queries.getWallet.get(privyUserId) as any;
    }

    const address = normalizeStarknetAddress(walletRow!.wallet_address);

    // Always try to deploy if we have credentials and paymaster (so address shows on Voyager / balances on-chain).
    // Run for both new and existing wallets so we don't miss deploy due to race or earlier failure.
    let deployResult: { deployed?: boolean; alreadyDeployed?: boolean; txHash?: string; explorerUrl?: string; deployError?: string } = {};
    if (walletRow?.privy_wallet_id && walletRow?.public_key && config.avnuPaymasterApiKey) {
      try {
        const wallet = await onboardPrivyWallet(
          privyUserId,
          walletRow.privy_wallet_id,
          walletRow.public_key,
          getSignEndpointUrl()
        );
        const result = await deployAccountIfNeeded(wallet);
        if ("alreadyDeployed" in result) {
          deployResult = { deployed: true, alreadyDeployed: true };
          console.log("[wallet/init] account already deployed on-chain");
        } else {
          deployResult = { deployed: true, txHash: result.txHash, explorerUrl: result.explorerUrl };
          console.log("[wallet/init] deploy tx sent:", result.txHash, result.explorerUrl);
        }
      } catch (err: any) {
        deployResult = { deployed: false, deployError: err?.message || "Deploy failed" };
        console.error("[wallet/init] auto-deploy failed:", err?.message, err);
      }
    } else if (!config.avnuPaymasterApiKey) {
      console.warn("[wallet/init] AVNU_PAYMASTER_API_KEY not set; skipping deploy (address will not appear on Voyager until first Stake/Convert).");
    }

    return res.json({ ready: true, address, ...deployResult });
  } catch (err: any) {
    const message = err?.message || "Wallet init failed";
    console.error("[wallet/init]", message, err);
    return res.status(500).json({ error: message });
  }
});

// POST /api/wallet/sign — called by Starkzap (or our backend) to sign with Privy.
// Starkzap doc: "Your backend endpoint receives { walletId, hash } and must return { signature }."
// Auth: (1) query key (backend-initiated) or (2) Authorization: Bearer <accessToken> (client-side).
// Wallet is server-managed so rawSign uses app secret only (no user JWT needed).
apiRouter.post("/wallet/sign", async (req, res) => {
  const key = req.query.key as string;
  const bearerToken = req.headers.authorization?.replace(/^Bearer\s+/i, "")?.trim();
  const body = z
    .object({ walletId: z.string(), hash: z.string() })
    .safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "walletId and hash required" });

  const walletRow = queries.getWalletByPrivyWalletId.get(body.data.walletId) as any;
  if (!walletRow) {
    return res.status(403).json({ error: "Wallet not found" });
  }

  if (key === config.internalSignKey) {
    console.log("[wallet/sign] walletId:", body.data.walletId, "| auth: internal key");
  } else if (bearerToken) {
    const normalized = normalizePrivyToken(bearerToken);
    try {
      const user = await verifyPrivyToken(normalized);
      if (walletRow.privy_user_id !== user.id) {
        return res.status(403).json({ error: "Wallet does not belong to this user" });
      }
      console.log("[wallet/sign] walletId:", body.data.walletId, "| auth: Bearer (client-side)");
    } catch (e: any) {
      return res.status(401).json({ error: e?.message || "Invalid or expired token" });
    }
  } else {
    return res.status(401).json({ error: "Unauthorized: provide ?key=... or Authorization: Bearer <accessToken>" });
  }

  rawSign(body.data.walletId, body.data.hash)
    .then((signature) => res.json({ signature }))
    .catch((err: any) => {
      const msg = err?.message || "Sign failed";
      console.error("[wallet/sign]", msg, err);
      res.status(500).json({ error: msg });
    });
});

// GET /api/wallet/address
// Returns the stored Starknet wallet address for the current session user.
// Used by the Profile screen flip card — address is never exposed in the main UI.
apiRouter.get("/wallet/address", requireSession, async (req, res) => {
  const walletRow = queries.getWallet.get(req.session!.privy_user_id) as any;

  if (!walletRow) {
    // No wallet yet — return null so the client can call /api/wallet/init first
    return res.json({ address: null });
  }

  return res.json({ address: normalizeStarknetAddress(walletRow.wallet_address) });
});

// POST /api/wallet/deploy
// Deploy the account on-chain (sponsored) so the address shows on Voyager and balance is on-chain.
// Optional: call before any DeFi so the account exists; GET /portfolio already shows balance by address without deploy.
apiRouter.post("/wallet/deploy", requireSession, async (req, res) => {
  try {
    const walletRow = queries.getWallet.get(req.session!.privy_user_id) as any;
    if (!walletRow?.privy_wallet_id || !walletRow?.public_key) {
      return res.status(400).json({ error: "Wallet not initialized. Call /api/wallet/init first." });
    }
    const wallet = await onboardPrivyWallet(
      req.session!.privy_user_id,
      walletRow.privy_wallet_id,
      walletRow.public_key,
      getSignEndpointUrl()
    );
    const result = await deployAccountIfNeeded(wallet);
    return res.json(result);
  } catch (err: any) {
    const raw = err?.message || "Deploy failed";
    const msg = raw.includes("Resources bounds") || raw.includes("exceed balance (0)")
      ? "Deploy failed: gas sponsorship required. Set AVNU_PAYMASTER_API_KEY in backend .env."
      : raw;
    return res.status(500).json({ error: msg });
  }
});

// ─── Portfolio ────────────────────────────────────────────────────────────────

function getSignEndpointUrl(): string {
  return `${config.backendBaseUrl}/api/wallet/sign?key=${config.internalSignKey}`;
}

apiRouter.get("/portfolio", requireSession, async (req, res) => {
  let usdcBalance = "0";
  let lbtcBalance = "0";

  // Read balances by address only (no Starkzap wallet = no deploy). Avoids DEPLOY_ACCOUNT
  // when user opens Profile/Portfolio; deploy only happens on Stake/Convert.
  const walletRow = queries.getWallet.get(req.session!.privy_user_id) as any;
  if (walletRow?.wallet_address) {
    try {
      const address = normalizeStarknetAddress(walletRow.wallet_address);
      const balances = await getBalancesByAddress(address);
      usdcBalance = balances.usdcBalance;
      lbtcBalance = balances.lbtcBalance;
    } catch {
      // keep defaults
    }
  }

  const yieldPosition = (queries.getYieldPosition.get(
    req.session!.privy_user_id,
  ) as any) || { status: "none", apy: 0, accrued_usd: 0, staked_amount_lbtc: null };

  return res.json({
    tradfiHoldings,
    cashUsd,
    totalValueUsd,
    crypto: {
      usdcBalance,
      lbtcBalance,
      btcStakingApy: config.btcStakingApy,
      btcYieldPosition: {
        status: yieldPosition.status,
        apy: yieldPosition.apy,
        accruedUsd: yieldPosition.accrued_usd,
        stakedAmountLbtc: yieldPosition.staked_amount_lbtc ?? null,
      },
    },
  });
});

// ─── Onramp ───────────────────────────────────────────────────────────────────

apiRouter.post("/onramp/session", requireSession, async (req, res) => {
  const sessionId = crypto.randomUUID();
  const walletRow = queries.getWallet.get(req.session!.privy_user_id) as any;
  const walletAddress = walletRow?.wallet_address || "pending";

  queries.createOnrampSession.run({
    id: sessionId,
    privy_user_id: req.session!.privy_user_id,
    status: "created",
    amount_usdc: "1000000",
    created_at: new Date().toISOString(),
  });

  // Placeholder URL — replace with Transak/Ramp deep-link when integrating a real onramp.
  // walletAddress is embedded so the user's receive address is pre-filled.
  const onrampUrl = `https://example.com/onramp?session=${sessionId}&to=${walletAddress}`;
  return res.json({ onrampUrl });
});

apiRouter.post("/onramp/confirm", requireSession, async (req, res) => {
  const latest = queries.getLatestOnrampSession.get(
    req.session!.privy_user_id,
  ) as any;
  if (!latest) return res.status(404).json({ error: "No onramp session" });

  queries.updateOnrampStatus.run({ id: latest.id, status: "completed" });
  return res.json({ usdcDetected: true, amountUsdc: latest.amount_usdc });
});

// ─── Yield ────────────────────────────────────────────────────────────────────

apiRouter.post("/yield/convert", requireSession, async (req, res) => {
  const body = z
    .object({
      amountUsdc: z.string().optional(),
      forceOnchain: z.boolean().optional(),
    })
    .safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "Invalid body" });

  if (config.devMode && !body.data.forceOnchain) {
    const mockHash = `0xmock${Date.now().toString(16)}`;
    return res.json({
      txHash: mockHash,
      explorerUrl: getExplorerUrl(mockHash),
      status: "mocked",
    });
  }

  try {
    const walletRow = queries.getWallet.get(req.session!.privy_user_id) as any;
    if (!walletRow?.privy_wallet_id || !walletRow?.public_key) {
      return res.status(400).json({ error: "Wallet not initialized. Call /api/wallet/init first." });
    }
    const wallet = await onboardPrivyWallet(
      req.session!.privy_user_id,
      walletRow.privy_wallet_id,
      walletRow.public_key,
      getSignEndpointUrl()
    );
    const walletAddress = wallet?.address || wallet?.accountAddress || wallet?.account?.address;
    if (!walletAddress) {
      return res.status(500).json({ error: "Wallet address unavailable" });
    }

    const { usdc, lbtc } = await getTokenAddresses();
    const sellAmount = body.data.amountUsdc || "1000000";

    const { calls } = await buildSwapCalls({
      sellTokenAddress: usdc.address,
      buyTokenAddress: lbtc.address,
      sellAmount,
      takerAddress: walletAddress,
    });

    const tx = await sendSponsoredTx(wallet, calls);
    const hash = tx?.transaction_hash || tx?.hash || tx;

    queries.upsertTx.run({
      hash,
      status: "submitted",
      created_at: new Date().toISOString(),
    });

    return res.json({
      txHash: hash,
      explorerUrl: getExplorerUrl(hash),
      status: "submitted",
    });
  } catch (err: any) {
    const raw = err?.message || "Swap failed";
    const msg = raw.includes("Resources bounds") || raw.includes("exceed balance (0)")
      ? "Convert failed: wallet deploy needs gas sponsorship. Set AVNU_PAYMASTER_API_KEY in backend .env and ensure paymaster is used for the first deploy."
      : raw;
    return res.status(500).json({ error: msg });
  }
});

apiRouter.post("/yield/stake", requireSession, async (req, res) => {
  const body = z
    .object({
      amountLbtc: z.string().optional(),
    })
    .safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "Invalid body" });

  try {
    const walletRow = queries.getWallet.get(req.session!.privy_user_id) as any;
    if (!walletRow?.privy_wallet_id || !walletRow?.public_key) {
      return res.status(400).json({ error: "Wallet not initialized. Call /api/wallet/init first." });
    }
    const wallet = await onboardPrivyWallet(
      req.session!.privy_user_id,
      walletRow.privy_wallet_id,
      walletRow.public_key,
      getSignEndpointUrl()
    );
    const amount = body.data.amountLbtc || "1000000";
    const result = await stakeLbtc(wallet, amount);

    queries.upsertYieldPosition.run({
      privy_user_id: req.session!.privy_user_id,
      status: "earning",
      apy: config.btcStakingApy,
      accrued_usd: 3.12,
      staked_amount_lbtc: amount,
    });

    return res.json(result);
  } catch (err: any) {
    const raw = err?.message || "Stake failed";
    const msg = raw.includes("Resources bounds") || raw.includes("exceed balance (0)")
      ? "Stake failed: wallet deploy needs gas sponsorship. Set AVNU_PAYMASTER_API_KEY in backend .env and ensure paymaster is used for the first deploy."
      : raw;
    return res.status(500).json({ error: msg });
  }
});

// ─── Unstake (exit intent) ────────────────────────────────────────────────────

apiRouter.post("/yield/unstake", requireSession, async (req, res) => {
  const body = z
    .object({
      amountLbtc: z.string().optional(),
    })
    .safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "Invalid body" });

  try {
    const walletRow = queries.getWallet.get(req.session!.privy_user_id) as any;
    if (!walletRow?.privy_wallet_id || !walletRow?.public_key) {
      return res.status(400).json({ error: "Wallet not initialized. Call /api/wallet/init first." });
    }
    const wallet = await onboardPrivyWallet(
      req.session!.privy_user_id,
      walletRow.privy_wallet_id,
      walletRow.public_key,
      getSignEndpointUrl()
    );

    const amount = body.data.amountLbtc;
    if (!amount || amount === "0") {
      return res.status(400).json({ error: "Specify an amountLbtc to unstake." });
    }

    const result = await unstakeLbtc(wallet, amount);

    queries.upsertYieldPosition.run({
      privy_user_id: req.session!.privy_user_id,
      status: "unstaking",
      apy: config.btcStakingApy,
      accrued_usd: 0,
      staked_amount_lbtc: null,
    });

    return res.json(result);
  } catch (err: any) {
    const raw = err?.message || "Unstake failed";
    return res.status(500).json({ error: raw });
  }
});

// ─── Exit (finalise withdrawal after cooldown) ───────────────────────────────

apiRouter.post("/yield/exit", requireSession, async (req, res) => {
  try {
    const walletRow = queries.getWallet.get(req.session!.privy_user_id) as any;
    if (!walletRow?.privy_wallet_id || !walletRow?.public_key) {
      return res.status(400).json({ error: "Wallet not initialized." });
    }
    const wallet = await onboardPrivyWallet(
      req.session!.privy_user_id,
      walletRow.privy_wallet_id,
      walletRow.public_key,
      getSignEndpointUrl()
    );

    const result = await exitLbtc(wallet);

    queries.upsertYieldPosition.run({
      privy_user_id: req.session!.privy_user_id,
      status: "none",
      apy: 0,
      accrued_usd: 0,
      staked_amount_lbtc: null,
    });

    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Exit failed" });
  }
});

// ─── Tx status ────────────────────────────────────────────────────────────────

apiRouter.get("/tx/:hash", requireSession, async (req, res) => {
  const { hash } = req.params;
  try {
    const cached = queries.getTx.get(hash) as any;
    if (config.devMode && cached) return res.json({ hash, status: cached.status });

    const status = await getTxStatus(hash);
    const statusText =
      status?.finality_status || status?.execution_status || "unknown";

    queries.upsertTx.run({ hash, status: statusText, created_at: new Date().toISOString() });
    return res.json({ hash, status: statusText });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Status check failed" });
  }
});

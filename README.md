# SmoothYield — Add BTC Staking to Any TradFi App with Starkzap

SmoothYield is an open-source reference app that shows **web2 developers** how to add passive BTC yield to a traditional finance (TradFi) mobile app — no seed phrases, no gas fees, no blockchain UX. The entire crypto layer is powered by [**Starkzap**](https://docs.starknet.io/build/starkzap/), the official Starknet developer toolkit.

> **TL;DR** — Your users sign in with Google. Behind the scenes, Starkzap creates an invisible Starknet wallet and stakes LBTC for ~3.3% APY. All transactions are gasless (sponsored by the AVNU paymaster). Your users never see a wallet address, sign a transaction, or pay gas. They just see "Earning 3.33% APY on BTC".

---

## Table of Contents

1. [Why Add Crypto Rails to a TradFi App?](#why-add-crypto-rails-to-a-tradfi-app)
2. [Architecture Overview](#architecture-overview)
3. [Starkzap Modules Used](#starkzap-modules-used)
4. [Step-by-Step: How Starkzap Is Integrated](#step-by-step-how-starkzap-is-integrated)
   - [Step 1: Install Starkzap](#step-1-install-starkzap)
   - [Step 2: Get Your API Keys](#step-2-get-your-api-keys)
   - [Step 3: Initialize the Starkzap SDK](#step-3-initialize-the-starkzap-sdk)
   - [Step 4: Create Invisible Wallets with Privy](#step-4-create-invisible-wallets-with-privy)
   - [Step 5: Onboard a Wallet into Starkzap](#step-5-onboard-a-wallet-into-starkzap)
   - [Step 6: Read Token Balances](#step-6-read-token-balances)
   - [Step 7: Stake LBTC for Yield](#step-7-stake-lbtc-for-yield)
   - [Step 8: Unstake and Withdraw](#step-8-unstake-and-withdraw)
5. [The Paymaster: Gasless Transactions](#the-paymaster-gasless-transactions)
6. [Project Structure](#project-structure)
7. [Quick Start](#quick-start)
8. [Environment Variables](#environment-variables)
9. [API Reference](#api-reference)
10. [End-to-End Yield Flow](#end-to-end-yield-flow)
11. [Troubleshooting](#troubleshooting)
12. [Resources](#resources)

---

## Why Add Crypto Rails to a TradFi App?

Traditional finance apps (stock brokers, neobanks, portfolio trackers) can unlock new revenue streams and user retention by offering **passive crypto yield** — without rebuilding the app as a "crypto app". Here is what Starkzap enables:

| Benefit | How It Works |
|---------|-------------|
| **No wallet UX** | Privy creates invisible embedded wallets. Users sign in with Google/email — no MetaMask, no seed phrases. |
| **No gas fees** | The AVNU paymaster sponsors every transaction. Your users never need to hold ETH or STRK for gas. |
| **Real BTC yield** | LBTC staking on Starknet earns ~3.3% APY through native delegation to Starknet validators. |
| **4 npm packages** | `starkzap` + `@privy-io/expo` + `@privy-io/node` + `starknet`. That's the full crypto stack. |
| **Backend-only signing** | All transaction signing happens on your server. The mobile app never touches private keys. |

Your users see a TradFi app with stocks, cash, and a "BTC Yield" tab. Behind the scenes, Starkzap handles wallets, staking, and gas — all in a few function calls.

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                         Mobile App (Expo)                        │
│                                                                  │
│   PrivyProvider → Google OAuth → AuthContext (sessionId)         │
│   Screens: Stocks | Crypto | Portfolio | Profile                 │
│   YieldScreen: "Stake BTC now" button                           │
│                                                                  │
│   No wallet addresses shown.  No gas prompts.  No crypto UX.    │
└─────────────────────────────┬────────────────────────────────────┘
                              │  REST API (x-session-id)
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                       Backend (Express)                          │
│                                                                  │
│   Auth:  Privy token verification → session                      │
│   Wallet: Privy server SDK → create Starknet wallet              │
│   Stake: Starkzap Staking → delegate LBTC to validator pool      │
│   Gas:   AVNU Paymaster → all transactions sponsored             │
│   Sign:  Privy rawSign → server-side, no user interaction        │
│                                                                  │
│   Key service: backend/src/services/starkzap.ts                  │
└─────────────────────────────┬────────────────────────────────────┘
                              │  Starkzap SDK + Paymaster
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                         Starknet                                 │
│                                                                  │
│   Account deployment (sponsored)                                 │
│   ERC-20 token transfers (LBTC)                                  │
│   Native staking (LBTC → validator pool → yield)                │
└──────────────────────────────────────────────────────────────────┘
```

---

## Starkzap Modules Used

SmoothYield imports these modules from the `starkzap` npm package:

| Module | Purpose | Where Used |
|--------|---------|------------|
| `StarkZap` / `StarkSDK` | Main SDK class — initializes RPC, paymaster, network config | `backend/src/services/starkzap.ts` |
| `OnboardStrategy` | Enum for wallet onboarding strategies (`Privy`, `Argent`, etc.) | `mobile/src/starknet/useStarknetWallet.ts` |
| `accountPresets` | Preconfigured account types (e.g. `argentXV050`) | `mobile/src/starknet/useStarknetWallet.ts` |
| `WalletInterface` | TypeScript type for the onboarded wallet object | `mobile/src/starknet/useStarknetWallet.ts` |
| `mainnetTokens` / `sepoliaTokens` | Token presets (USDC, LBTC addresses and decimals) | `backend/src/services/starkzap.ts` |
| `Staking` | Staking class — `fromPool`, `populateEnter`, `populateAdd`, `populateExitIntent`, `populateExit`, `getStakerPools`, `isMember` | `backend/src/adapters/staking.ts` |
| `Amount` | Token amount helper — `fromRaw`, `toBase`, `toUnit` | `backend/src/adapters/staking.ts` |
| `ChainId` | Chain identifier enum (`MAINNET`, `SEPOLIA`) | `backend/src/adapters/staking.ts`, `starkzap.ts` |
| `getStakingPreset` | Returns staking configuration for a given chain | `backend/src/adapters/staking.ts`, `starkzap.ts` |
| `mainnetValidators` / `sepoliaValidators` | Validator registry for LBTC pool discovery | `backend/src/services/starkzap.ts` |

The Starkzap SDK also handles:
- **Paymaster integration** — pass your AVNU API key and all `wallet.execute()` calls become gasless.
- **Privy onboarding** — `sdk.onboard({ strategy: "privy", ... })` connects a Privy-managed wallet to Starkzap in one call.
- **Account deployment** — `wallet.deploy({ feeMode: "sponsored" })` deploys the account contract on-chain, gas-free.

---

## Step-by-Step: How Starkzap Is Integrated

This section walks through every integration point so you can replicate it in your own app. Each step includes the actual code from this repository.

### Step 1: Install Starkzap

Add the `starkzap` package to both your backend and frontend:

```bash
# Backend
cd backend
npm install starkzap starknet @privy-io/node

# Mobile / Frontend
cd mobile
npm install starkzap @privy-io/expo
```

That's it. No complex blockchain toolchains, no Solidity compilers, no ABIs. Starkzap is a pure JavaScript/TypeScript SDK.

### Step 2: Get Your API Keys

You need three services — all have free tiers:

| Service | What It Does | Where to Get It |
|---------|-------------|-----------------|
| **Privy** | User auth + embedded wallets | [dashboard.privy.io](https://dashboard.privy.io) |
| **AVNU** | Paymaster (gas sponsorship) | [portal.avnu.fi](https://portal.avnu.fi) |
| **Alchemy** (optional) | Starknet RPC node | [dashboard.alchemy.com](https://dashboard.alchemy.com) |

Set them in your backend `.env`:

```bash
PRIVY_APP_ID=your-privy-app-id
PRIVY_APP_SECRET=your-privy-app-secret
AVNU_PAYMASTER_API_KEY=your-avnu-key
ALCHEMY_STARKNET_API_KEY=your-alchemy-key   # optional
STARKNET_NETWORK=sepolia                     # or mainnet
```

### Step 3: Initialize the Starkzap SDK

The SDK is initialized once and reused. The key configuration is the **paymaster** — this is what makes every transaction gasless.

```typescript
import("starkzap").then((starkzap) => {
  const sdk = new starkzap.StarkZap({
    network: "sepolia",                    // or "mainnet"
    rpcUrl: "https://starknet-sepolia.g.alchemy.com/v2/YOUR_KEY",

    // This is the magic: AVNU paymaster makes all txs gasless
    paymaster: {
      nodeUrl: "https://sepolia.paymaster.avnu.fi",
      headers: { "x-paymaster-api-key": "YOUR_AVNU_KEY" },
    },
  });
});
```

> **Docs:** [Starkzap Paymasters](https://docs.starknet.io/build/starkzap/paymasters) and [AVNU Paymaster Integration](https://docs.starknet.io/build/starkzap/integrations/avnu-paymaster)

In SmoothYield, this lives in `backend/src/services/starkzap.ts` — the `getSdk()` function lazily initializes it:

```48:81:backend/src/services/starkzap.ts
async function getSdk() {
  if (_sdk) return _sdk;
  const starkzap = await import("starkzap");
  const Cls = starkzap.StarkSDK ?? starkzap.StarkZap;
  // ... RPC URL resolution ...

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
```

### Step 4: Create Invisible Wallets with Privy

When a user signs in with Google, your backend creates a Starknet wallet for them using Privy's server SDK. The user never sees this wallet.

```typescript
import { PrivyClient } from "@privy-io/node";

const privy = new PrivyClient({
  appId: "your-privy-app-id",
  appSecret: "your-privy-app-secret",
});

// One line to create a Starknet wallet
const wallet = await privy.wallets().create({
  chain_type: "starknet",
});

// wallet.id       → "wallet_abc123"  (used for signing)
// wallet.address  → "0x04a3..."      (Starknet address)
// wallet.public_key → "0x02b1..."    (needed for Starkzap onboard)
```

> **Docs:** [Starkzap Privy Integration](https://docs.starknet.io/build/starkzap/integrations/privy)

In SmoothYield, this lives in `backend/src/services/privyWallet.ts`:

```37:49:backend/src/services/privyWallet.ts
export async function createStarknetWallet(_privyUserId: string): Promise<PrivyWallet> {
  const privy = getPrivyClient();
  const wallet = await privy.wallets().create({
    chain_type: "starknet",
  });
  const address = normalizeStarknetAddress(wallet.address);
  return {
    id: wallet.id,
    address,
    public_key: wallet.public_key ?? "",
    chain_type: wallet.chain_type,
  };
}
```

### Step 5: Onboard a Wallet into Starkzap

This is the central integration point. `sdk.onboard()` connects the Privy wallet to Starkzap so it can execute transactions (staking, transfers) — all server-side.

```typescript
const wallet = await sdk.onboard({
  strategy: "privy",
  privy: {
    resolve: async () => ({
      walletId: "wallet_abc123",              // from Privy
      publicKey: "0x02b1...",                  // from Privy
      serverUrl: "https://your-api.com/api/wallet/sign",  // your sign endpoint
    }),
  },
  deploy: "never",          // deploy on first real tx, not eagerly
  feeMode: "sponsored",     // gasless via paymaster
});

// wallet can now execute(), balanceOf(), deploy(), etc.
```

The `serverUrl` points to your backend endpoint that signs transaction hashes using Privy's `rawSign`:

```typescript
// POST /api/wallet/sign — Starkzap calls this automatically
const result = await privy.wallets().rawSign(walletId, {
  params: { hash: "0x..." },
});
return { signature: result.signature };
```

> **Docs:** [Starkzap Connecting Wallets](https://docs.starknet.io/build/starkzap/connecting-wallets) and [Privy Integration](https://docs.starknet.io/build/starkzap/integrations/privy)

In SmoothYield, the onboard function is in `backend/src/services/starkzap.ts`:

```93:120:backend/src/services/starkzap.ts
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
```

### Step 6: Read Token Balances

Starkzap provides token presets with correct addresses and decimals for each network. Use them to read balances:

```typescript
const starkzap = await import("starkzap");

// Get token presets for the current network
const tokens = starkzap.sepoliaTokens; // or mainnetTokens

// tokens.USDC  → { address: "0x...", decimals: 6, symbol: "USDC" }
// tokens.LBTC  → { address: "0x...", decimals: 8, symbol: "LBTC" }

// Read balance using the onboarded wallet
const usdcBalance = await wallet.balanceOf(tokens.USDC);
console.log(usdcBalance.toBase());  // raw amount (e.g. "1000000" = 1 USDC)
```

In SmoothYield, `getTokenAddresses()` resolves tokens from Starkzap presets and supports optional address overrides via environment variables:

```25:42:backend/src/services/starkzap.ts
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
```

### Step 7: Swap Tokens (USDC → LBTC)

Use the AVNU SDK to build a swap, then execute it gaslessly through the Starkzap wallet:

```typescript
import { fetchQuotes, fetchBuildExecuteTransaction, buildApproveTx } from "@avnu/avnu-sdk";

// 1. Get a swap quote
const quotes = await fetchQuotes({
  sellTokenAddress: tokens.USDC.address,
  buyTokenAddress: tokens.LBTC.address,
  sellAmount: BigInt("1000000"),              // 1 USDC
  takerAddress: walletAddress,
});

// 2. Build the execute transaction
const executeTx = await fetchBuildExecuteTransaction(quotes[0].quoteId, ...);

// 3. Build the ERC-20 approval
const approveTx = buildApproveTx(quotes[0].sellTokenAddress, quotes[0].sellAmount, ...);

// 4. Execute gaslessly through Starkzap wallet
const tx = await wallet.execute(
  [approveTx, executeTx],
  { feeMode: "sponsored" }      // paymaster pays the gas
);
```

In SmoothYield, this is the `POST /api/yield/convert` endpoint. The swap logic lives in `backend/src/services/avnu.ts`, and execution uses `sendSponsoredTx()`:

```237:268:backend/src/services/starkzap.ts
export const sendSponsoredTx = async (wallet: any, calls: any[]) => {
  // ... flatten and normalize calls for paymaster compatibility ...
  const normalized = normalizeCallsForPaymaster(flatInput);
  // ...
  const tx = await wallet.execute(toExecute, { feeMode: "sponsored" });
  return tx;
};
```

### Step 8: Stake LBTC for Yield

This is where the real magic happens. Starkzap's `Staking` module lets you stake LBTC in a validator's delegation pool to earn yield — all in a few lines.

```typescript
const starkzap = await import("starkzap");
const { Staking, Amount, ChainId, getStakingPreset } = starkzap;

// 1. Get the staking configuration for this network
const chainId = ChainId.SEPOLIA;   // or ChainId.MAINNET
const stakingConfig = getStakingPreset(chainId);

// 2. Connect to a validator's LBTC staking pool
const staking = await Staking.fromPool(poolAddress, provider, stakingConfig);

// 3. Build the staking calls
const amount = Amount.fromRaw("100000000", 8, "LBTC");  // 1 LBTC
const isMember = await staking.isMember(wallet);

const calls = isMember
  ? staking.populateAdd(walletAddress, amount)      // already staking → add more
  : staking.populateEnter(walletAddress, amount);   // first time → enter pool

// 4. Execute gaslessly
const tx = await wallet.execute(calls, { feeMode: "sponsored" });
```

Pool discovery is automatic — Starkzap provides a validator registry:

```typescript
const validators = starkzap.sepoliaValidators;   // or mainnetValidators
for (const validator of Object.values(validators)) {
  const pools = await Staking.getStakerPools(provider, validator.stakerAddress, stakingConfig);
  const lbtcPool = pools.find(p => p.token.symbol === "LBTC");
  if (lbtcPool) {
    // lbtcPool.poolContract is your pool address
  }
}
```

In SmoothYield, the full staking flow is in `backend/src/adapters/staking.ts`:

```57:103:backend/src/adapters/staking.ts
  // Native staking via Starkzap: build approve + enter/add calls, normalize for paymaster, then execute
  const starkzap = await import("starkzap");
  const { Staking, Amount, ChainId, getStakingPreset } = starkzap;
  const provider = getProvider();
  const chainId = config.network === "sepolia" ? ChainId.SEPOLIA : ChainId.MAINNET;
  const stakingConfig = getStakingPreset(chainId);
  // ...
  const staking = await Staking.fromPool(poolAddress as any, provider as any, stakingConfig);
  // ...
  const rawCalls = isMember
    ? staking.populateAdd(walletAddress, amountObj)
    : staking.populateEnter(walletAddress, amountObj);

  const tx = await sendSponsoredTx(wallet, rawCalls);
  // ...
```

### Step 9: Unstake and Withdraw

Starknet staking has a two-phase exit: first declare intent, then withdraw after the cooldown.

```typescript
// Phase 1: Exit intent — "I want to unstake X LBTC"
const amount = Amount.fromRaw("100000000", 8, "LBTC");
const exitIntentCall = staking.populateExitIntent(amount);
await wallet.execute([exitIntentCall], { feeMode: "sponsored" });

// Phase 2: Exit — after cooldown period passes
const exitCall = staking.populateExit(walletAddress);
await wallet.execute([exitCall], { feeMode: "sponsored" });
```

In SmoothYield, these are the `POST /api/yield/unstake` and `POST /api/yield/exit` endpoints in `backend/src/adapters/staking.ts`.

---

## The Paymaster: Gasless Transactions

The AVNU paymaster is what makes this app feel like a traditional fintech app. Without it, every transaction would require the user to hold STRK or ETH for gas fees — a dealbreaker for TradFi users.

**How it works:**

1. You get an API key from [portal.avnu.fi](https://portal.avnu.fi)
2. You pass it to the Starkzap SDK at initialization
3. Every `wallet.execute(calls, { feeMode: "sponsored" })` call is gasless
4. AVNU pays the gas. You can set up billing with them for production.

**What's sponsored:**
- Account deployment (`wallet.deploy({ feeMode: "sponsored" })`)
- Token swaps (USDC → LBTC)
- Staking deposits and withdrawals
- Any multicall transaction

**Configuration in SmoothYield:**

| Network | Paymaster URL |
|---------|--------------|
| Sepolia (testnet) | `https://sepolia.paymaster.avnu.fi` |
| Mainnet | `https://starknet.paymaster.avnu.fi` |

> **Docs:** [Starkzap Paymasters](https://docs.starknet.io/build/starkzap/paymasters) · [AVNU Paymaster Integration](https://docs.starknet.io/build/starkzap/integrations/avnu-paymaster)

---

## Project Structure

```
smoothyield/
├── backend/                          # Express API server
│   ├── src/
│   │   ├── services/
│   │   │   ├── starkzap.ts          # Starkzap SDK init, onboard, balances, sponsored tx
│   │   │   ├── privyWallet.ts       # Privy wallet creation + rawSign
│   │   │   ├── privy.ts             # Privy token verification
│   │   │   └── avnu.ts              # AVNU swap (USDC → LBTC)
│   │   ├── adapters/
│   │   │   └── staking.ts           # Starkzap Staking: stake, unstake, exit
│   │   ├── routes/index.ts          # All API endpoints
│   │   ├── config.ts                # Environment configuration
│   │   ├── db.ts                    # SQLite (sessions, wallets, yield)
│   │   └── middleware.ts            # Session auth middleware
│   ├── .env.example
│   └── package.json
│
├── mobile/                           # Expo React Native app
│   ├── app/
│   │   ├── _layout.tsx              # PrivyProvider + AuthProvider
│   │   └── (tabs)/                  # Tab navigation (stocks, crypto, portfolio, profile)
│   ├── src/
│   │   ├── context/AuthContext.tsx   # Privy auth → backend session
│   │   ├── screens/
│   │   │   ├── YieldScreen.tsx      # BTC staking UI
│   │   │   ├── CryptoScreen.tsx     # Crypto balances + markets
│   │   │   ├── PortfolioScreen.tsx  # TradFi + crypto holdings
│   │   │   └── LoginScreen.tsx      # Google OAuth login
│   │   ├── starknet/
│   │   │   ├── useStarknetWallet.ts # Client-side Starkzap onboard hook
│   │   │   └── walletClient.ts      # Wallet fetch + Privy resolve builder
│   │   └── components/              # UI components (StakingCard, BalanceCard, etc.)
│   ├── .env.example
│   └── package.json
│
├── types/                            # Shared TypeScript types
└── package.json                      # Workspace root
```

---

## Quick Start

### 1. Backend

```bash
cd backend
cp .env.example .env
# Edit .env — set PRIVY_APP_ID, PRIVY_APP_SECRET, AVNU_PAYMASTER_API_KEY
npm install
npm run dev
```

### 2. Mobile

```bash
cd mobile
cp .env.example .env
# Edit .env — set EXPO_PUBLIC_PRIVY_APP_ID and EXPO_PUBLIC_API_URL
npm install
npm run start
```

**On a physical device:** use your machine's LAN IP for `EXPO_PUBLIC_API_URL` (e.g. `http://192.168.1.5:3000`) since `localhost` on the device refers to the device itself.

### 3. Dev Mode

Set `DEV_MODE=true` in `backend/.env` to mock auth/staking for local testing without real credentials. The full yield flow can be tested end-to-end with mock transactions.

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `PRIVY_APP_ID` | Yes | From [dashboard.privy.io](https://dashboard.privy.io) |
| `PRIVY_APP_SECRET` | Yes | From Privy dashboard |
| `AVNU_PAYMASTER_API_KEY` | Yes | From [portal.avnu.fi](https://portal.avnu.fi) — enables gasless transactions |
| `ALCHEMY_STARKNET_API_KEY` | No | Starknet RPC via Alchemy (recommended for production) |
| `STARKNET_RPC_URL` | No | Override RPC URL entirely |
| `STARKNET_NETWORK` | No | `sepolia` (default) or `mainnet` |
| `DEV_MODE` | No | `true` for mock mode |
| `BTC_STAKING_APY` | No | Override displayed APY (default: 3.33) |
| `PORT` | No | Server port (default: 3000) |

### Mobile (`mobile/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `EXPO_PUBLIC_PRIVY_APP_ID` | Yes | Same Privy App ID |
| `EXPO_PUBLIC_API_URL` | Yes | Backend URL (e.g. `http://localhost:3000`) |

---

## API Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/health` | Public | Health check |
| `GET` | `/api/market-data` | Public | Stock + crypto market prices |
| `POST` | `/api/auth/session` | Public | Exchange Privy token for session |
| `POST` | `/api/wallet/starknet` | Bearer | Get/create Starkzap-compatible wallet |
| `POST` | `/api/wallet/init` | Session | Initialize wallet + optional deploy |
| `POST` | `/api/wallet/sign` | Key/Bearer | Sign transaction hash (Starkzap callback) |
| `GET` | `/api/wallet/address` | Session | Get wallet address |
| `POST` | `/api/wallet/deploy` | Session | Deploy account on-chain (sponsored) |
| `GET` | `/api/portfolio` | Session | TradFi + crypto balances + yield state |
| `POST` | `/api/yield/convert` | Session | Swap USDC → LBTC via AVNU |
| `POST` | `/api/yield/stake` | Session | Stake LBTC for yield |
| `POST` | `/api/yield/unstake` | Session | Exit intent (begin unstaking) |
| `POST` | `/api/yield/exit` | Session | Finalize withdrawal after cooldown |
| `GET` | `/api/tx/:hash` | Session | Check transaction status |

---

## End-to-End Yield Flow

Here is what happens when a user taps "Stake BTC now" in the app:

```
User taps "Stake BTC now"
        │
        ▼
1. POST /api/wallet/init
   └─ Backend creates Privy wallet (if needed)
   └─ Calls sdk.onboard({ strategy: "privy" })
   └─ Optionally deploys account (sponsored)
        │
        ▼
2. POST /api/yield/stake { amountLbtc: "100000000" }
   └─ Backend onboards wallet via Starkzap
   └─ Resolves LBTC pool via Starkzap validators
   └─ Calls Staking.fromPool() → staking.populateEnter()
   └─ Executes via wallet.execute(calls, { feeMode: "sponsored" })
   └─ Starkzap calls POST /api/wallet/sign to get signature
   └─ AVNU paymaster pays gas
   └─ Transaction lands on Starknet
        │
        ▼
3. App shows "Earning 3.33% APY on BTC"
   └─ Links to Voyager explorer for the tx
```

The user saw: one button tap. Behind the scenes: wallet creation, account deployment, pool discovery, staking transaction construction, server-side signing, gas sponsorship, and on-chain execution — all handled by Starkzap + Privy + AVNU.

---

## Troubleshooting

### "Network request failed" on mobile

The app uses `EXPO_PUBLIC_API_URL` from your `.env`. Common issues:

1. **`localhost` on a real device** — use your machine's LAN IP instead (e.g. `http://192.168.1.5:3000`)
2. **Backend not running** — run `cd backend && npm run dev`
3. **Wrong port** — check `PORT` in `backend/.env`, default is `3000`

**Quick check:** open `EXPO_PUBLIC_API_URL/health` in a browser — you should see `{"ok":true}`.

### "AVNU_PAYMASTER_API_KEY is required"

All DeFi operations (swap, stake, deploy) require the paymaster. Get a free key from [portal.avnu.fi](https://portal.avnu.fi).

### "No LBTC staking pool found"

Native LBTC staking may not be available on Sepolia. Try mainnet (`STARKNET_NETWORK=mainnet`) or set `BTC_STAKING_CONTRACT_ADDRESS` for a custom contract.

---

## Resources

- **Starkzap documentation** — [docs.starknet.io/build/starkzap](https://docs.starknet.io/build/starkzap/)
- **Starkzap Privy integration** — [docs.starknet.io/build/starkzap/integrations/privy](https://docs.starknet.io/build/starkzap/integrations/privy)
- **Starkzap Paymasters** — [docs.starknet.io/build/starkzap/paymasters](https://docs.starknet.io/build/starkzap/paymasters)
- **AVNU Paymaster integration** — [docs.starknet.io/build/starkzap/integrations/avnu-paymaster](https://docs.starknet.io/build/starkzap/integrations/avnu-paymaster)
- **Starkzap Connecting Wallets** — [docs.starknet.io/build/starkzap/connecting-wallets](https://docs.starknet.io/build/starkzap/connecting-wallets)
- **AVNU Portal** — [portal.avnu.fi](https://portal.avnu.fi)
- **Privy Dashboard** — [dashboard.privy.io](https://dashboard.privy.io)
- **Starknet Staking Dashboard** — [voyager.online/staking-dashboard](https://voyager.online/staking-dashboard)

---

**Built with [Starkzap](https://docs.starknet.io/build/starkzap/) — the fastest way to add Starknet to any app.**

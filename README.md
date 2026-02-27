# TradFi-First + Passive BTC Yield (MVP)

This monorepo contains:
- `mobile/` Expo React Native app (TradFi UI + Passive BTC yield flow)
- `backend/` Express API server (Privy auth, Starkzap wallet, AVNU swap, staking adapter)
- `types/` Shared TypeScript types (minimal)

## Quick Start

### 1) Backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

Notes:
- Set `PRIVY_APP_ID` and `PRIVY_APP_SECRET` in `backend/.env` for real auth.
- In `DEV_MODE=true`, auth/onramp/staking can be mocked for local testing.

### 2) Mobile

```bash
cd mobile
cp .env.example .env
npm install
npm run start
```

Notes:
- Set `EXPO_PUBLIC_API_URL=http://localhost:3001`
- Set `EXPO_PUBLIC_PRIVY_APP_ID` for real login.
- In `EXPO_PUBLIC_DEV_MODE=true`, a mock login button is available.

## End-to-End Yield Flow (DEV_MODE)

1. Open app → Passive Bitcoin yield tab
2. Tap `Start earning yield`
3. Tap `Generate onramp QR`
4. Tap `I've completed payment`
5. The app will call `convert` then `stake` and display tx hashes (mocked if no on-chain funds)

## Important Notes

- The app never shows a wallet address. The backend stores it internally.
- All Starknet tx signing happens on the backend with Starkzap + PrivySigner.
- Gasless/sponsored tx is configured via AVNU paymaster.

## Repo Structure

```
tradfi-btc-yield-mvp/
  backend/
  mobile/
  types/
```

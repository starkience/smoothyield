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
- Set `EXPO_PUBLIC_API_URL=http://localhost:3001` for the app. **On a physical device or simulator**, use your machine’s LAN IP (e.g. `http://192.168.1.5:3001`) or a tunnel URL (e.g. Cloudflare) so the device can reach the backend; `localhost` on the device is the device itself.
- Set `EXPO_PUBLIC_PRIVY_APP_ID` for real login.
- In `EXPO_PUBLIC_DEV_MODE=true`, a mock login button is available.

## Why the backend connection fails ("Network request failed")

The app uses `EXPO_PUBLIC_API_URL` from your `.env`. Connection usually fails for one of these reasons:

1. **`localhost` on a real device or Android emulator**  
   On the device, "localhost" is the device itself, not your computer.  
   **Fix:** Set `EXPO_PUBLIC_API_URL=http://YOUR_MAC_IP:3001` (e.g. `http://192.168.1.5:3001`). Find your IP in System Settings → Network. Backend must be running.

2. **Tunnel URL expired or not running**  
   If you use a tunnel (e.g. `https://something.trycloudflare.com`), the URL stops working when the tunnel process exits.  
   **Fix:** Start the tunnel again and put the **new** URL in `EXPO_PUBLIC_API_URL`, then restart the app with `npx expo start --clear`.

3. **Backend not running**  
   **Fix:** Run `cd backend && npm run dev` and leave it running. Backend listens on port 3001 by default.

4. **Wrong port**  
   Backend default is **3001**. If you use `PORT=3000` in `backend/.env`, set `EXPO_PUBLIC_API_URL=...:3000`.

5. **Firewall**  
   Your machine may block incoming connections on the backend port. Allow it or use a tunnel.

**Quick check:** Open `EXPO_PUBLIC_API_URL/health` in a browser (e.g. `http://localhost:3001/health`). You should see `{"ok":true}`.

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

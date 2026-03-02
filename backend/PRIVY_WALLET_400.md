# Fix: 400 "Invalid JWT token provided" on wallet sign

**Backend follows [Starkzap connecting wallets](https://docs.starknet.io/build/starkzap/connecting-wallets) and [Starkzap Privy integration](https://docs.starknet.io/build/starkzap/integrations/privy):**  
`POST /api/wallet/starknet` (Bearer token → `{ wallet: { id, address, publicKey } }`) and `POST /api/wallet/sign` (body `{ walletId, hash }` → `{ signature }`).

**Still stuck?** Your backend and JWKS verification are correct (you see `[yield/stake] token verified via JWKS`). The 400 comes from **Privy’s wallet API** when it refuses to accept the JWT for `/v1/wallets/authenticate`. This is fixed only by **enabling Server-side access** for your app in the Privy dashboard, or by **Privy support** enabling it. Use the support template in section 3 below.

---

**Starknet path:** Key quorum / wallet infrastructure auth is **not supported for Starknet**. Server-side signing for Starknet must use the **user JWT** flow only. Fix the JWT acceptance below.

Your JWT is valid (aud = App ID, iss = privy.io). The wallet API still rejects it until **Server-side access** is enabled for your app.

**Server-side JWT verification:** The backend verifies Privy access tokens using the app JWKS endpoint (`https://auth.privy.io/api/v1/apps/<PRIVY_APP_ID>/jwks.json`). You can set `PRIVY_JWKS_URL` in `.env` to override; otherwise it is derived from `PRIVY_APP_ID`.

## 1. Use the correct app in the dashboard

Your backend uses **PRIVY_APP_ID** from `.env` (e.g. `cmm3npboo05370cjr7kp9sbg6`). The JWT `aud` in the logs must match this. **Open the dashboard for that app**, not a different one.

- **Direct link for this project’s app:**  
  **https://dashboard.privy.io/apps/cmm3npboo05370cjr7kp9sbg6?page=embedded&tab=advanced**  
  (Replace the app ID with your actual `PRIVY_APP_ID` if different.)

- Confirm the app selector in the dashboard shows the same app ID as in your backend `.env`.

## 2. Where to find "Server-side access"

Per [Privy’s signers setup](https://docs.privy.io/wallets/using-wallets/signers/setup): go to **User management → Authentication** (sidebar), open the **Advanced** tab, then toggle **"Server-side access"** (or **"Enable signers"**) **ON**.

If you’re on Advanced and don’t see the toggle, try these:

**A) Embedded wallets (different section)**  
- In the **left sidebar**, click **"Embedded wallets"** (not "User management").  
- Open the **Advanced** tab.  
- Look for **"Server-side access"** or **"Enable signers"** and turn it **ON**.  
- Direct link: **https://dashboard.privy.io/apps?page=embedded&tab=advanced**

**B) Scroll down on Advanced**  
- On User management → Authentication → **Advanced**, scroll to the **very bottom**.  
- The toggle is sometimes below "Return user data in identity token".

**C) Wallet infrastructure**  
- Sidebar → **Wallet infrastructure** → check **Authorization keys** or any **Signers** section.

**D) Can’t find it**  
- Use browser Find (Cmd+F) on the page for **"server"** or **"signer"**.  
- If it’s missing, the option may have moved or be plan-specific; ask Privy support where to enable "Server-side access" or "user JWT for wallets/authenticate" for app `cmm3npboo05370cjr7kp9sbg6`.

## 3. I don’t see "Server-side access" on Advanced at all

If you’re on **User management → Authentication → Advanced** and you only see: Prioritize options, Disable confirmation modals, Session duration, Access token duration, Refresh token duration, ID token duration, Test accounts, Guest accounts, Login method transfer, Return user data in identity token — and **no** "Server-side access" or "Enable signers" toggle:

1. **Check the rest of the sidebar**  
   In the **left sidebar**, look for a separate section such as **"Embedded wallets"**, **"Wallets"**, or **"Wallet infrastructure"** (not under "User management"). Open it and look for an **Advanced** tab or a **Server-side access** / **Enable signers** option there. The dashboard URL `?page=embedded&tab=advanced` may switch to this "Embedded" page.

2. **Contact Privy support**  
   The toggle may have been moved, renamed, or made plan-specific. Send something like:

   - **Subject:** Enable server-side wallet access for app — 400 on `/v1/wallets/authenticate`  
   - **Body:**  
     - App ID: `cmm3npboo05370cjr7kp9sbg6`  
     - We use Privy-issued access tokens from the client (`getAccessToken()` in Expo) and send them to our backend to call the wallet API.  
     - We get **400 "Invalid JWT token provided"** from `POST /v1/wallets/authenticate`.  
     - JWT claims look correct (aud = our app ID, iss = privy.io).  
     - Docs say to enable "Server-side access" under User management → Authentication → Advanced, but we don’t see that toggle on that page.  
     - Where can we enable server-side use of user JWTs for wallet operations (Starknet, user JWT flow only)?

   Contact: [Privy support](https://www.privy.io/contact) or support@privy.io.

## 4. If it still returns 400

- Confirm the toggle is **ON** and you’re in the correct app.
- Ensure **PRIVY_APP_ID** and **PRIVY_APP_SECRET** in `backend/.env` have no trailing spaces or extra quotes (the backend trims them).
- If everything is correct, the wallet API may not accept Privy-issued access tokens for this app (e.g. only custom JWT providers). Contact Privy support with: App ID, “Invalid JWT token provided” on `/v1/wallets/authenticate`, and that the JWT is verified by your backend and has correct aud/iss.

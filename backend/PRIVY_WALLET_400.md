# Fix: 400 "Invalid JWT token provided" on wallet sign

**Important (from Privy support):**  
`/v1/wallets/authenticate` **only accepts custom JWTs from your own auth provider**, not the Privy access token from `getAccessToken()`. So if you use **Privy OAuth only** (e.g. Google login via Privy), the token you have is a Privy-issued token and will always get 400 from the wallet API.

**Your options:**

1. **Custom JWT flow (recommended)** — This backend can act as the auth provider: it issues a short-lived JWT after verifying the user (e.g. via Privy token). See **Setup: Custom JWT (this backend)** below.
2. **Client-side signing only** — Don't call `rawSign` from the server. Have the app sign the hash with the embedded wallet (client-side) and send the signature to the backend; backend submits the transaction.
3. **Ask Privy** — Confirm whether server-side `rawSign` for Starknet is supported when the only token you have is the Privy access token (Privy OAuth, no custom auth provider).

---

## Setup: Custom JWT (this backend)

When `JWT_SIGN_PRIVATE_KEY_PEM` is set, the backend issues its own JWT for wallet sign and exposes a JWKS endpoint. Configure Privy to accept that JWT.

### 1. Generate a key and set env

```bash
openssl genpkey -algorithm RSA -out priv.pem -pkeyopt rsa_keygen_bits:2048
# Use the contents of priv.pem in .env as JWT_SIGN_PRIVATE_KEY_PEM (use \n for newlines in one line)
```

In `backend/.env`: Set `JWT_SIGN_PRIVATE_KEY_PEM` to the full PEM string. Optionally set `JWT_ISSUER` (defaults to `BACKEND_BASE_URL`) and `JWT_SIGN_KEY_ID` (default `sig-1`).

### 2. JWKS URL

**GET /api/auth/jwks** returns the public key(s). Use a publicly reachable URL in Privy (e.g. `https://your-api.example/api/auth/jwks`). For local dev use a tunnel (ngrok) so Privy can fetch it.

### 3. Privy dashboard — JWT-based authentication

- **User management → Authentication** → enable **JWT-based authentication**, **Server side**.
- **JWKS endpoint:** Your backend URL, e.g. `https://your-api.example/api/auth/jwks`
- **JWT user ID claim:** `sub`
- **JWT additional claims:** `iss` = your backend issuer (same as `JWT_ISSUER` / `BACKEND_BASE_URL`); `aud` = your Privy App ID.
- **JWT aud claim (optional):** Your Privy App ID.

### 4. Restart backend and retry

Restart the backend; then retry Stake. The backend will pass the backend-issued JWT to `rawSign` instead of the Privy access token.

---

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

import express from "express";
import cors from "cors";
import { config } from "./config";
import { apiRouter } from "./routes";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/api", apiRouter);

app.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(`Backend listening on :${config.port}`);
  if (config.privyAppId && config.privyAppSecret) {
    const id = config.privyAppId;
    const masked = id.length >= 16 ? `${id.slice(0, 8)}…${id.slice(-8)}` : "***";
    console.log(`Privy: app ID ${masked}. Wallets are server-managed (no user JWT needed for rawSign).`);
    if (config.privyJwksUrl) {
      console.log(`Privy: JWKS verification enabled (${config.privyJwksUrl})`);
    }
  } else {
    console.log("Privy: PRIVY_APP_ID or PRIVY_APP_SECRET missing in .env");
  }
  // eslint-disable-next-line no-console
  console.log(
    config.avnuPaymasterApiKey
      ? "AVNU paymaster: configured (gasfree deploy + execute)"
      : "AVNU paymaster: not set — set AVNU_PAYMASTER_API_KEY in .env for Stake/Convert"
  );
});

/**
 * Verify Privy-issued access tokens using the app's JWKS endpoint.
 * Aligns with Starknet + Privy server-side integration and Privy's access token verification.
 * JWKS URL: https://auth.privy.io/api/v1/apps/<PRIVY_APP_ID>/jwks.json
 *
 * @see https://docs.starknet.io/build/starkzap/integrations/privy
 * @see https://docs.privy.io/guide/server/authorization/verification
 */

import * as jose from "jose";
import { config } from "../config";

const ISSUER = "privy.io";

let jwks: ReturnType<typeof jose.createRemoteJWKSet> | null = null;

function getJwks(): ReturnType<typeof jose.createRemoteJWKSet> {
  if (!jwks) {
    const url = config.privyJwksUrl;
    if (!url) throw new Error("PRIVY_JWKS_URL or PRIVY_APP_ID required for JWKS verification");
    jwks = jose.createRemoteJWKSet(new URL(url));
  }
  return jwks;
}

export type PrivyJwtPayload = {
  sub: string;   // User's Privy DID (e.g. did:privy:...)
  aud: string;   // App ID
  iss: string;   // "privy.io"
  exp: number;
  iat?: number;
  sid?: string;
};

/**
 * Verify a Privy access token (JWT) using the app's JWKS.
 * Validates signature, expiration, issuer (privy.io), and audience (our app ID).
 */
export async function verifyPrivyAccessTokenWithJwks(token: string): Promise<PrivyJwtPayload> {
  const appId = config.privyAppId;
  if (!appId) throw new Error("PRIVY_APP_ID required for JWT verification");

  const JWKS = getJwks();
  const { payload } = await jose.jwtVerify(token, JWKS, {
    issuer: ISSUER,
    audience: appId,
    clockTolerance: 10,
  });

  const sub = typeof payload.sub === "string" ? payload.sub : "";
  const aud = typeof payload.aud === "string" ? payload.aud : Array.isArray(payload.aud) ? payload.aud[0] : "";
  const iss = typeof payload.iss === "string" ? payload.iss : "";
  const exp = typeof payload.exp === "number" ? payload.exp : 0;

  return { sub, aud, iss, exp, iat: typeof payload.iat === "number" ? payload.iat : undefined, sid: typeof payload.sid === "string" ? payload.sid : undefined };
}

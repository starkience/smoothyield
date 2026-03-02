/**
 * Normalize Privy JWT for API use: strip any "Bearer " prefix(es) and trim.
 * Ensures we never pass "Bearer <token>" to Privy's wallets/authenticate.
 * Idempotent: normalize(normalize(x)) === normalize(x).
 */
export function normalizePrivyToken(token: string): string {
  if (!token || typeof token !== "string") return token;
  let t = token.trim();
  while (t.startsWith("Bearer ")) t = t.slice(7).trim();
  return t;
}

/**
 * Safe fingerprint for logs (no secrets): length + first/last few chars.
 * Use to confirm the same token is used at verify and at rawSign.
 */
export function tokenFingerprint(token: string): string {
  if (!token || token.length < 20) return `len=${token?.length ?? 0}`;
  return `len=${token.length} from=${token.slice(0, 15)}… to=…${token.slice(-8)}`;
}

/**
 * Decode JWT payload without verification (for logging only).
 * Returns { aud, iss, sub, exp } or null if decode fails.
 */
export function decodeJwtClaimsForLog(token: string): { aud?: string; iss?: string; sub?: string; exp?: number } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    let base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4) base64 += "=";
    const payload = JSON.parse(
      Buffer.from(base64, "base64").toString("utf8")
    ) as Record<string, unknown>;
    const aud = payload.aud;
    return {
      aud: typeof aud === "string" ? aud : Array.isArray(aud) ? aud[0] : undefined,
      iss: typeof payload.iss === "string" ? payload.iss : undefined,
      sub: typeof payload.sub === "string" ? payload.sub : undefined,
      exp: typeof payload.exp === "number" ? payload.exp : undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Normalize Privy JWT for API use: strip optional "Bearer " prefix and trim.
 * Ensures we never pass "Bearer <token>" to Privy's wallets/authenticate.
 */
export function normalizePrivyToken(token: string): string {
  if (!token || typeof token !== "string") return token;
  const t = token.trim();
  return t.startsWith("Bearer ") ? t.slice(7).trim() : t;
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

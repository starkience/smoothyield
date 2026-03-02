/**
 * Normalize a Starknet address to the canonical 66-character form (0x + 64 hex digits).
 * Privy and some RPCs return addresses without a leading zero in the hex part (65 chars);
 * many validators expect exactly 66 characters.
 */
export function normalizeStarknetAddress(address: string): string {
  if (!address || typeof address !== "string") return address;
  const hex = address.startsWith("0x") ? address.slice(2) : address;
  const padded = hex.replace(/^0+/, "") || "0";
  const len = padded.length;
  if (len > 64) return address;
  return "0x" + padded.padStart(64, "0");
}

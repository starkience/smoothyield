import Database from "better-sqlite3";
import path from "path";

const dbPath = path.join(process.cwd(), "dev.db");
export const db = new Database(dbPath);

db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  privy_user_id TEXT PRIMARY KEY,
  email TEXT
);
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  privy_user_id TEXT NOT NULL,
  privy_token TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS wallets (
  privy_user_id TEXT PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS onramp_sessions (
  id TEXT PRIMARY KEY,
  privy_user_id TEXT NOT NULL,
  status TEXT NOT NULL,
  amount_usdc TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS yield_positions (
  privy_user_id TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  apy REAL,
  accrued_usd REAL
);
CREATE TABLE IF NOT EXISTS txs (
  hash TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL
);
`);

export const queries = {
  upsertUser: db.prepare(
    "INSERT INTO users (privy_user_id, email) VALUES (@privy_user_id, @email) ON CONFLICT(privy_user_id) DO UPDATE SET email=excluded.email"
  ),
  createSession: db.prepare(
    "INSERT INTO sessions (id, privy_user_id, privy_token, created_at) VALUES (@id, @privy_user_id, @privy_token, @created_at)"
  ),
  getSession: db.prepare("SELECT * FROM sessions WHERE id = ?"),
  upsertWallet: db.prepare(
    "INSERT INTO wallets (privy_user_id, wallet_address, created_at) VALUES (@privy_user_id, @wallet_address, @created_at) ON CONFLICT(privy_user_id) DO UPDATE SET wallet_address=excluded.wallet_address"
  ),
  getWallet: db.prepare("SELECT * FROM wallets WHERE privy_user_id = ?"),
  createOnrampSession: db.prepare(
    "INSERT INTO onramp_sessions (id, privy_user_id, status, amount_usdc, created_at) VALUES (@id, @privy_user_id, @status, @amount_usdc, @created_at)"
  ),
  getLatestOnrampSession: db.prepare(
    "SELECT * FROM onramp_sessions WHERE privy_user_id = ? ORDER BY created_at DESC LIMIT 1"
  ),
  updateOnrampStatus: db.prepare(
    "UPDATE onramp_sessions SET status = @status WHERE id = @id"
  ),
  upsertYieldPosition: db.prepare(
    "INSERT INTO yield_positions (privy_user_id, status, apy, accrued_usd) VALUES (@privy_user_id, @status, @apy, @accrued_usd) ON CONFLICT(privy_user_id) DO UPDATE SET status=excluded.status, apy=excluded.apy, accrued_usd=excluded.accrued_usd"
  ),
  getYieldPosition: db.prepare("SELECT * FROM yield_positions WHERE privy_user_id = ?"),
  upsertTx: db.prepare(
    "INSERT INTO txs (hash, status, created_at) VALUES (@hash, @status, @created_at) ON CONFLICT(hash) DO UPDATE SET status=excluded.status"
  ),
  getTx: db.prepare("SELECT * FROM txs WHERE hash = ?")
};

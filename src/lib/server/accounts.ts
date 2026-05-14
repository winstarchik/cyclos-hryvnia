import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import type { QueryResultRow } from "pg";
import { getDatabaseUrl } from "@/lib/env";
import type { AuthUser } from "@/lib/server/authInput";

export interface AccountUser extends AuthUser {
  passwordHash: string;
  passwordSalt: string;
  passwordUpdatedAt: string;
  createdAt: string;
  lastLoginAt?: string | null;
  lastLoginDevice?: string | null;
  lastLoginUserAgent?: string | null;
}

export interface EncryptedWalletRecord {
  version: 1;
  publicKey: string;
  cipherText: string;
  iv: string;
  salt: string;
  kdf: "PBKDF2-SHA256";
  iterations: number;
}

export interface RegisteredWalletRecord {
  id: string;
  email: string;
  walletPublicKey: string | null;
  createdAt: string;
  lastLoginAt: string | null;
  lastLoginDevice: string | null;
  lastLoginUserAgent: string | null;
}

interface AccountRow extends QueryResultRow {
  id: string;
  email: string;
  password_hash: string;
  password_salt: string;
  password_updated_at: Date | string;
  created_at: Date | string;
  last_login_at?: Date | string | null;
  last_login_device?: string | null;
  last_login_user_agent?: string | null;
  wallet_public_key?: string | null;
  wallet_encrypted_json?: EncryptedWalletRecord | string | null;
}

interface LocalAccountFile {
  users: Array<AccountUser & { wallet?: EncryptedWalletRecord | null }>;
}

const LOCAL_STORE_PATH = path.join(process.cwd(), ".data", "cyclos-users.json");
let pool: Pool | null = null;
let schemaReady: Promise<void> | null = null;

function shouldUseLocalStore() {
  return !getDatabaseUrl() && process.env.NODE_ENV !== "production";
}

function toIso(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function toNullableIso(value: Date | string | null | undefined) {
  return value ? toIso(value) : null;
}

function rowToUser(row: AccountRow): AccountUser {
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    passwordSalt: row.password_salt,
    passwordUpdatedAt: toIso(row.password_updated_at),
    createdAt: toIso(row.created_at),
    lastLoginAt: toNullableIso(row.last_login_at),
    lastLoginDevice: row.last_login_device ?? null,
    lastLoginUserAgent: row.last_login_user_agent ?? null,
  };
}

export function describeUserAgent(userAgent: string | null) {
  if (!userAgent) return "Unknown device";

  const browser = /Edg\//.test(userAgent)
    ? "Edge"
    : /OPR\//.test(userAgent)
      ? "Opera"
      : /Firefox\//.test(userAgent)
        ? "Firefox"
        : /CriOS\//.test(userAgent)
          ? "Chrome iOS"
          : /Chrome\//.test(userAgent)
            ? "Chrome"
            : /Safari\//.test(userAgent)
              ? "Safari"
              : "Browser";

  const device = /iPhone/.test(userAgent)
    ? "iPhone"
    : /iPad/.test(userAgent)
      ? "iPad"
      : /Android/.test(userAgent)
        ? "Android"
        : /Windows NT/.test(userAgent)
          ? "Windows"
          : /Mac OS X/.test(userAgent)
            ? "macOS"
            : /Linux/.test(userAgent)
              ? "Linux"
              : "Unknown OS";

  const shell = /Telegram/i.test(userAgent) ? "Telegram" : null;
  return [shell, browser, device].filter(Boolean).join(" / ");
}

function getPool() {
  const databaseUrl = getDatabaseUrl();
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required in production.");
  }

  pool ??= new Pool({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes("localhost")
      ? false
      : { rejectUnauthorized: false },
  });

  return pool;
}

async function ensureSchema() {
  if (shouldUseLocalStore()) {
    return;
  }

  schemaReady ??= getPool().query(`
    CREATE TABLE IF NOT EXISTS cyclos_users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      password_salt TEXT NOT NULL,
      password_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      wallet_public_key TEXT,
      wallet_encrypted_json JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    ALTER TABLE cyclos_users
      ADD COLUMN IF NOT EXISTS wallet_public_key TEXT;

    ALTER TABLE cyclos_users
      ADD COLUMN IF NOT EXISTS wallet_encrypted_json JSONB;

    ALTER TABLE cyclos_users
      ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

    ALTER TABLE cyclos_users
      ADD COLUMN IF NOT EXISTS last_login_device TEXT;

    ALTER TABLE cyclos_users
      ADD COLUMN IF NOT EXISTS last_login_user_agent TEXT;
  `).then(() => undefined);

  await schemaReady;
}

async function readLocalStore(): Promise<LocalAccountFile> {
  await mkdir(path.dirname(LOCAL_STORE_PATH), { recursive: true });

  try {
    return JSON.parse(await readFile(LOCAL_STORE_PATH, "utf8")) as LocalAccountFile;
  } catch {
    return { users: [] };
  }
}

async function writeLocalStore(data: LocalAccountFile) {
  await mkdir(path.dirname(LOCAL_STORE_PATH), { recursive: true });
  await writeFile(LOCAL_STORE_PATH, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

export async function findUserByEmail(email: string) {
  const normalizedEmail = email.trim().toLowerCase();

  if (shouldUseLocalStore()) {
    const data = await readLocalStore();
    return data.users.find((user) => user.email === normalizedEmail) ?? null;
  }

  await ensureSchema();
  const result = await getPool().query<AccountRow>(
    `SELECT
       id,
       email,
       password_hash,
       password_salt,
       password_updated_at,
       created_at,
       last_login_at,
       last_login_device,
       last_login_user_agent
     FROM cyclos_users
     WHERE email = $1
     LIMIT 1`,
    [normalizedEmail],
  );

  return result.rows[0] ? rowToUser(result.rows[0]) : null;
}

export async function recordUserLogin(email: string, userAgent: string | null) {
  const normalizedEmail = email.trim().toLowerCase();
  const lastLoginAt = new Date().toISOString();
  const lastLoginDevice = describeUserAgent(userAgent);
  const lastLoginUserAgent = userAgent?.slice(0, 500) ?? null;

  if (shouldUseLocalStore()) {
    const data = await readLocalStore();
    const user = data.users.find((item) => item.email === normalizedEmail);
    if (!user) return null;

    user.lastLoginAt = lastLoginAt;
    user.lastLoginDevice = lastLoginDevice;
    user.lastLoginUserAgent = lastLoginUserAgent;
    await writeLocalStore(data);
    return {
      lastLoginAt,
      lastLoginDevice,
      lastLoginUserAgent,
    };
  }

  await ensureSchema();
  const result = await getPool().query<AccountRow>(
    `UPDATE cyclos_users
     SET last_login_at = NOW(),
         last_login_device = $2,
         last_login_user_agent = $3,
         updated_at = NOW()
     WHERE email = $1
     RETURNING last_login_at, last_login_device, last_login_user_agent`,
    [normalizedEmail, lastLoginDevice, lastLoginUserAgent],
  );

  const row = result.rows[0];
  if (!row) return null;

  return {
    lastLoginAt: toNullableIso(row.last_login_at),
    lastLoginDevice: row.last_login_device ?? null,
    lastLoginUserAgent: row.last_login_user_agent ?? null,
  };
}

function parseWalletRecord(value: AccountRow["wallet_encrypted_json"]) {
  if (!value) return null;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as EncryptedWalletRecord;
    } catch {
      return null;
    }
  }
  return value;
}

export async function getUserEncryptedWallet(email: string) {
  const normalizedEmail = email.trim().toLowerCase();

  if (shouldUseLocalStore()) {
    const data = await readLocalStore();
    const user = data.users.find((item) => item.email === normalizedEmail);
    return user?.wallet ?? null;
  }

  await ensureSchema();
  const result = await getPool().query<AccountRow>(
    `SELECT wallet_public_key, wallet_encrypted_json
     FROM cyclos_users
     WHERE email = $1
     LIMIT 1`,
    [normalizedEmail],
  );

  const wallet = parseWalletRecord(result.rows[0]?.wallet_encrypted_json);
  if (!wallet) return null;

  const publicKey = result.rows[0]?.wallet_public_key;
  if (publicKey && publicKey !== wallet.publicKey) {
    return { ...wallet, publicKey };
  }

  return wallet;
}

export async function setUserEncryptedWallet(
  email: string,
  wallet: EncryptedWalletRecord,
) {
  const normalizedEmail = email.trim().toLowerCase();

  if (shouldUseLocalStore()) {
    const data = await readLocalStore();
    const user = data.users.find((item) => item.email === normalizedEmail);
    if (!user) return null;

    user.wallet = wallet;
    await writeLocalStore(data);
    return wallet;
  }

  await ensureSchema();
  const result = await getPool().query<AccountRow>(
    `UPDATE cyclos_users
     SET wallet_public_key = $2,
         wallet_encrypted_json = $3::jsonb,
         updated_at = NOW()
     WHERE email = $1
     RETURNING wallet_encrypted_json`,
    [normalizedEmail, wallet.publicKey, JSON.stringify(wallet)],
  );

  return result.rowCount ? wallet : null;
}

export async function createUserAccount(
  email: string,
  passwordHash: string,
  passwordSalt: string,
) {
  const now = new Date().toISOString();
  const user: AccountUser = {
    id: randomUUID(),
    email: email.trim().toLowerCase(),
    passwordHash,
    passwordSalt,
    passwordUpdatedAt: now,
    createdAt: now,
  };

  if (shouldUseLocalStore()) {
    const data = await readLocalStore();
    if (data.users.some((existing) => existing.email === user.email)) {
      throw new Error("ACCOUNT_EXISTS");
    }
    data.users.push(user);
    await writeLocalStore(data);
    return user;
  }

  await ensureSchema();
  const result = await getPool().query<AccountRow>(
    `INSERT INTO cyclos_users
      (id, email, password_hash, password_salt, password_updated_at)
     VALUES ($1, $2, $3, $4, NOW())
     RETURNING id, email, password_hash, password_salt, password_updated_at, created_at`,
    [user.id, user.email, passwordHash, passwordSalt],
  );

  return rowToUser(result.rows[0]);
}

export async function updateUserPassword(
  email: string,
  passwordHash: string,
  passwordSalt: string,
) {
  const normalizedEmail = email.trim().toLowerCase();
  const passwordUpdatedAt = new Date().toISOString();

  if (shouldUseLocalStore()) {
    const data = await readLocalStore();
    const user = data.users.find((item) => item.email === normalizedEmail);
    if (!user) return null;

    user.passwordHash = passwordHash;
    user.passwordSalt = passwordSalt;
    user.passwordUpdatedAt = passwordUpdatedAt;
    await writeLocalStore(data);
    return user;
  }

  await ensureSchema();
  const result = await getPool().query<AccountRow>(
    `UPDATE cyclos_users
     SET password_hash = $2,
         password_salt = $3,
         password_updated_at = NOW(),
         updated_at = NOW()
     WHERE email = $1
     RETURNING id, email, password_hash, password_salt, password_updated_at, created_at`,
    [normalizedEmail, passwordHash, passwordSalt],
  );

  return result.rows[0] ? rowToUser(result.rows[0]) : null;
}

export async function listRegisteredWallets(): Promise<RegisteredWalletRecord[]> {
  if (shouldUseLocalStore()) {
    const data = await readLocalStore();
    return data.users
      .map((user) => ({
        id: user.id,
        email: user.email,
        walletPublicKey: user.wallet?.publicKey ?? null,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt ?? null,
        lastLoginDevice: user.lastLoginDevice ?? null,
        lastLoginUserAgent: user.lastLoginUserAgent ?? null,
      }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  await ensureSchema();
  const result = await getPool().query<AccountRow>(
    `SELECT
       id,
       email,
       wallet_public_key,
       created_at,
       last_login_at,
       last_login_device,
       last_login_user_agent
     FROM cyclos_users
     ORDER BY created_at DESC`,
  );

  return result.rows.map((row) => ({
    id: row.id,
    email: row.email,
    walletPublicKey: row.wallet_public_key ?? null,
    createdAt: toIso(row.created_at),
    lastLoginAt: toNullableIso(row.last_login_at),
    lastLoginDevice: row.last_login_device ?? null,
    lastLoginUserAgent: row.last_login_user_agent ?? null,
  }));
}

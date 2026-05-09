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
}

interface AccountRow extends QueryResultRow {
  id: string;
  email: string;
  password_hash: string;
  password_salt: string;
  password_updated_at: Date | string;
  created_at: Date | string;
}

interface LocalAccountFile {
  users: AccountUser[];
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

function rowToUser(row: AccountRow): AccountUser {
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    passwordSalt: row.password_salt,
    passwordUpdatedAt: toIso(row.password_updated_at),
    createdAt: toIso(row.created_at),
  };
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
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
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
    `SELECT id, email, password_hash, password_salt, password_updated_at, created_at
     FROM cyclos_users
     WHERE email = $1
     LIMIT 1`,
    [normalizedEmail],
  );

  return result.rows[0] ? rowToUser(result.rows[0]) : null;
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

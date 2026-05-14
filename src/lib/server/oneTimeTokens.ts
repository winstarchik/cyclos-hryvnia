import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { Pool } from "pg";
import { getDatabaseUrl } from "@/lib/env";

interface LocalOneTimeTokenStore {
  consumed: Record<string, number>;
}

const LOCAL_STORE_PATH = path.join(process.cwd(), ".data", "cyclos-used-tokens.json");
let pool: Pool | null = null;
let schemaReady: Promise<void> | null = null;

function shouldUseLocalStore() {
  return !getDatabaseUrl() && process.env.NODE_ENV !== "production";
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
      : { rejectUnauthorized: true },
  });

  return pool;
}

async function ensureSchema() {
  if (shouldUseLocalStore()) return;

  schemaReady ??= getPool().query(`
    CREATE TABLE IF NOT EXISTS cyclos_one_time_tokens (
      token_id TEXT PRIMARY KEY,
      purpose TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      consumed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS cyclos_one_time_tokens_expires_at_idx
      ON cyclos_one_time_tokens (expires_at);
  `).then(() => undefined);

  await schemaReady;
}

async function readLocalStore(): Promise<LocalOneTimeTokenStore> {
  await mkdir(path.dirname(LOCAL_STORE_PATH), { recursive: true });

  try {
    return JSON.parse(
      await readFile(LOCAL_STORE_PATH, "utf8"),
    ) as LocalOneTimeTokenStore;
  } catch {
    return { consumed: {} };
  }
}

async function writeLocalStore(data: LocalOneTimeTokenStore) {
  await mkdir(path.dirname(LOCAL_STORE_PATH), { recursive: true });
  await writeFile(LOCAL_STORE_PATH, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

export async function consumeOneTimeToken(
  tokenId: string,
  purpose: string,
  expiresAt: number,
) {
  const now = Math.floor(Date.now() / 1000);
  if (!tokenId || expiresAt < now) return false;

  const scopedId = `${purpose}:${tokenId}`;

  if (shouldUseLocalStore()) {
    const data = await readLocalStore();
    data.consumed = Object.fromEntries(
      Object.entries(data.consumed).filter(([, exp]) => exp >= now),
    );

    if (data.consumed[scopedId]) return false;

    data.consumed[scopedId] = expiresAt;
    await writeLocalStore(data);
    return true;
  }

  await ensureSchema();
  await getPool().query(
    `DELETE FROM cyclos_one_time_tokens WHERE expires_at < NOW()`,
  );

  const result = await getPool().query(
    `INSERT INTO cyclos_one_time_tokens (token_id, purpose, expires_at)
     VALUES ($1, $2, to_timestamp($3))
     ON CONFLICT (token_id) DO NOTHING`,
    [scopedId, purpose, expiresAt],
  );

  return result.rowCount === 1;
}


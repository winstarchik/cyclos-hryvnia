import { Pool } from "pg";
import { getDatabaseUrl } from "@/lib/env";

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

interface RateLimitResult {
  allowed: boolean;
  retryAfter: number;
}

interface RateLimitRow {
  count: number;
  reset_at: Date | string;
}

const localBuckets = new Map<string, RateLimitBucket>();
let pool: Pool | null = null;
let schemaReady: Promise<void> | null = null;

function shouldUseLocalRateLimit() {
  return !getDatabaseUrl() && process.env.NODE_ENV !== "production";
}

function getPool() {
  const databaseUrl = getDatabaseUrl();
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for durable rate limiting.");
  }

  pool ??= new Pool({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes("localhost")
      ? false
      : { rejectUnauthorized: true },
  });

  return pool;
}

async function ensureRateLimitSchema() {
  schemaReady ??= getPool().query(`
    CREATE TABLE IF NOT EXISTS cyclos_rate_limits (
      bucket_key TEXT PRIMARY KEY,
      count INTEGER NOT NULL,
      reset_at TIMESTAMPTZ NOT NULL
    );

    CREATE INDEX IF NOT EXISTS cyclos_rate_limits_reset_at_idx
      ON cyclos_rate_limits (reset_at);
  `).then(() => undefined);

  await schemaReady;
}

function checkLocalRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const current = localBuckets.get(key);

  if (!current || current.resetAt <= now) {
    localBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfter: 0 };
  }

  current.count += 1;

  if (current.count > limit) {
    return {
      allowed: false,
      retryAfter: Math.ceil((current.resetAt - now) / 1000),
    };
  }

  if (localBuckets.size > 10_000) {
    for (const [bucketKey, bucket] of localBuckets) {
      if (bucket.resetAt <= now) localBuckets.delete(bucketKey);
    }
  }

  return { allowed: true, retryAfter: 0 };
}

export async function checkRateLimit(
  key: string,
  limit = 8,
  windowMs = 60_000,
): Promise<RateLimitResult> {
  if (shouldUseLocalRateLimit()) {
    return checkLocalRateLimit(key, limit, windowMs);
  }

  const resetAt = new Date(Date.now() + windowMs);

  try {
    await ensureRateLimitSchema();

    const result = await getPool().query<RateLimitRow>(
      `INSERT INTO cyclos_rate_limits (bucket_key, count, reset_at)
       VALUES ($1, 1, $2)
       ON CONFLICT (bucket_key) DO UPDATE SET
         count = CASE
           WHEN cyclos_rate_limits.reset_at <= NOW() THEN 1
           ELSE cyclos_rate_limits.count + 1
         END,
         reset_at = CASE
           WHEN cyclos_rate_limits.reset_at <= NOW() THEN $2
           ELSE cyclos_rate_limits.reset_at
         END
       RETURNING count, reset_at`,
      [key, resetAt],
    );

    if (Math.random() < 0.01) {
      void getPool()
        .query("DELETE FROM cyclos_rate_limits WHERE reset_at <= NOW()")
        .catch(() => undefined);
    }

    const row = result.rows[0];
    const count = Number(row.count);
    const rowResetAt =
      row.reset_at instanceof Date ? row.reset_at : new Date(row.reset_at);

    return {
      allowed: count <= limit,
      retryAfter:
        count <= limit
          ? 0
          : Math.max(1, Math.ceil((rowResetAt.getTime() - Date.now()) / 1000)),
    };
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Durable rate limit failed:", error);
    }

    // Fail closed for auth/admin flows when the durable limiter is unavailable.
    return { allowed: false, retryAfter: Math.ceil(windowMs / 1000) };
  }
}

function normalizeIp(value: string | null) {
  const ip = value?.split(",")[0]?.trim() ?? "";

  if (!ip || ip.length > 64 || /[^0-9a-fA-F:.\-]/.test(ip)) {
    return null;
  }

  return ip;
}

export function getRateLimitKey(request: Request, email: string) {
  const vercelForwardedFor = normalizeIp(
    request.headers.get("x-vercel-forwarded-for"),
  );
  const realIp = normalizeIp(request.headers.get("x-real-ip"));
  const forwardedFor =
    process.env.NODE_ENV === "development" ||
    process.env.TRUST_PROXY_HEADERS === "true"
      ? normalizeIp(request.headers.get("x-forwarded-for"))
      : null;
  const ip = vercelForwardedFor ?? realIp ?? forwardedFor ?? "unknown";

  return `${ip}:${email.trim().toLowerCase()}`;
}

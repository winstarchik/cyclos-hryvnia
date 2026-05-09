import { Pool, type QueryResultRow } from "pg";
import { getDatabaseUrl } from "@/lib/env";

declare global {
  // eslint-disable-next-line no-var
  var cyclosPgPool: Pool | undefined;
}

function createPool() {
  return new Pool({
    connectionString: getDatabaseUrl(),
    ssl:
      process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: false }
        : undefined,
  });
}

export function getDbPool() {
  if (!globalThis.cyclosPgPool) {
    globalThis.cyclosPgPool = createPool();
  }

  return globalThis.cyclosPgPool;
}

export async function query<T extends QueryResultRow>(
  text: string,
  values: unknown[] = [],
) {
  return getDbPool().query<T>(text, values);
}

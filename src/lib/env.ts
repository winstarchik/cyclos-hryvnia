const DEFAULT_SOLANA_RPC = "https://api.mainnet-beta.solana.com";

/**
 * Read an environment variable and fail fast when a required value is missing.
 */
export function getEnv(key: string, defaultValue?: string): string {
  const value = process.env[key] ?? defaultValue;

  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }

  return value;
}

/**
 * Public client-safe configuration. Values prefixed with NEXT_PUBLIC_ are
 * embedded in browser bundles by Next.js, so only non-sensitive values belong here.
 */
export const SOLANA_RPC = getEnv("NEXT_PUBLIC_SOLANA_RPC", DEFAULT_SOLANA_RPC);
export const WEB3AUTH_CLIENT_ID =
  process.env.NEXT_PUBLIC_WEB3AUTH_CLIENT_ID ?? "";
export const WEB3AUTH_NETWORK =
  process.env.NEXT_PUBLIC_WEB3AUTH_NETWORK ?? "sapphire_mainnet";
export const WEB3AUTH_AUTH_CONNECTION_ID =
  process.env.NEXT_PUBLIC_WEB3AUTH_AUTH_CONNECTION_ID ?? "";
export const WEB3AUTH_GOOGLE_AUTH_CONNECTION_ID =
  process.env.NEXT_PUBLIC_WEB3AUTH_GOOGLE_AUTH_CONNECTION_ID ??
  WEB3AUTH_AUTH_CONNECTION_ID;
export const WEB3AUTH_EMAIL_AUTH_CONNECTION_ID =
  process.env.NEXT_PUBLIC_WEB3AUTH_EMAIL_AUTH_CONNECTION_ID ??
  WEB3AUTH_AUTH_CONNECTION_ID;
export const WEB3AUTH_GOOGLE_GROUPED_AUTH_CONNECTION_ID =
  process.env.NEXT_PUBLIC_WEB3AUTH_GOOGLE_GROUPED_AUTH_CONNECTION_ID ?? "";
export const WEB3AUTH_EMAIL_GROUPED_AUTH_CONNECTION_ID =
  process.env.NEXT_PUBLIC_WEB3AUTH_EMAIL_GROUPED_AUTH_CONNECTION_ID ?? "";
export const APP_ENVIRONMENT = getEnv("NEXT_PUBLIC_ENVIRONMENT", "development");

export function hasWeb3AuthClientId(): boolean {
  return (
    WEB3AUTH_CLIENT_ID.length > 20 &&
    !WEB3AUTH_CLIENT_ID.includes("YOUR_WEB3AUTH_CLIENT_ID")
  );
}

export function getWeb3AuthClientId(): string {
  if (!hasWeb3AuthClientId()) {
    throw new Error("Missing Web3Auth client id.");
  }

  return getEnv("NEXT_PUBLIC_WEB3AUTH_CLIENT_ID");
}

/**
 * Server-only Telegram token accessor.
 *
 * Do not expose this through a public browser env var. Bot tokens are private
 * and belong in server-side code only.
 */
export function getTelegramBotToken(): string {
  return getEnv("TELEGRAM_BOT_TOKEN");
}

/**
 * Server-only Postgres connection string.
 *
 * Production account auth requires this value. Local development can use the
 * file-backed dev account store when this variable is not present.
 */
export function getDatabaseUrl(): string | undefined {
  return process.env.DATABASE_URL;
}

/**
 * Server-only HMAC secret used to sign the app session cookie.
 */
export function getAuthSecret(): string {
  const value = process.env.AUTH_SECRET;

  if (value) {
    return value;
  }

  if (process.env.NODE_ENV !== "production") {
    return "cyclos-local-development-auth-secret-change-before-production";
  }

  throw new Error("Missing environment variable: AUTH_SECRET");
}

export function getSmtpConfig() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM;

  if (!host || !port || !user || !pass || !from) {
    throw new Error("Missing SMTP configuration");
  }

  return {
    host,
    port: Number(port),
    user,
    pass,
    from,
  };
}

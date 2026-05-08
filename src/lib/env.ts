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
 * embedded in browser bundles by Next.js, so only non-secret values belong here.
 */
export const SOLANA_RPC = getEnv("NEXT_PUBLIC_SOLANA_RPC", DEFAULT_SOLANA_RPC);
export const MAGIC_KEY = process.env.NEXT_PUBLIC_MAGIC_PUBLISHABLE_KEY ?? "";
export const APP_ENVIRONMENT = getEnv("NEXT_PUBLIC_ENVIRONMENT", "development");

export function getMagicPublishableKey(): string {
  return getEnv("NEXT_PUBLIC_MAGIC_PUBLISHABLE_KEY");
}

/**
 * Server-only Telegram token accessor.
 *
 * Do not rename this to NEXT_PUBLIC_TELEGRAM_BOT_TOKEN. Bot tokens are secrets
 * and must never be shipped to browser code.
 */
export function getTelegramBotToken(): string {
  return getEnv("TELEGRAM_BOT_TOKEN");
}

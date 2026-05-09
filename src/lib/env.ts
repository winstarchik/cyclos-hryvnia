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
export const MAGIC_KEY = process.env.NEXT_PUBLIC_MAGIC_PUBLISHABLE_KEY ?? "";
export const APP_ENVIRONMENT = getEnv("NEXT_PUBLIC_ENVIRONMENT", "development");

export function hasMagicPublishableKey(): boolean {
  return (
    MAGIC_KEY.startsWith("pk_") &&
    !MAGIC_KEY.includes("YOUR_KEY") &&
    MAGIC_KEY.length > 20
  );
}

export function getMagicPublishableKey(): string {
  if (!hasMagicPublishableKey()) {
    throw new Error("Missing Magic publishable key.");
  }

  return getEnv("NEXT_PUBLIC_MAGIC_PUBLISHABLE_KEY");
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

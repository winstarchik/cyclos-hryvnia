/**
 * Telegram Mini App user information we care about.
 *
 * This matches the subset of data typically available from Telegram launch params.
 * We intentionally represent IDs as strings to avoid precision issues.
 */
export interface TMAUser {
  userId: string;
  username: string | null;
  isPremium: boolean;
  startParam: string | null;
  platform: string;
}


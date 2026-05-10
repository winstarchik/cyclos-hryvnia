/**
 * constants/tokens.ts
 * Token registry, CoinGecko IDs, and cache settings for Cyclos Hryvnia.
 */

import type { Token } from "@/types";

// ─── Cache ────────────────────────────────────────────────────────────────────
/** How long (ms) CoinGecko price data is considered fresh */
export const PRICE_CACHE_TTL = 60_000; // 60 seconds

// ─── SPL Token Mints (Solana mainnet) ─────────────────────────────────────────
export const MINT = {
  USDC: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  USDT: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
  WBTC: "3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh",
  WETH: "7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs",
  cUAH: "GN3Njbg9dP13pBX2MvdXurr4cuxzVmsVtKwnhPPymWZh",
} as const;

// ─── Token Metadata ───────────────────────────────────────────────────────────
export interface TokenMeta {
  symbol: string;
  name: string;
  decimals: number;
  logo: string;
  /** CoinGecko price-api id (undefined = stablecoin at 1 USD, or no listing) */
  coingeckoId?: string;
  /** Fixed USD price override (e.g. stablecoins pegged to USD) */
  fixedUSD?: number;
}

/**
 * Registry of well-known tokens.
 * Key = mint address string (or "SOL" for native SOL).
 */
export const KNOWN_TOKENS: Record<string, TokenMeta> = {
  // ── Native SOL ──────────────────────────────────────────────────────────────
  SOL: {
    symbol: "SOL",
    name: "Solana",
    decimals: 9,
    logo: "/icons/tokens/sol.svg",
    coingeckoId: "solana",
  },

  // ── USDC ────────────────────────────────────────────────────────────────────
  [MINT.USDC]: {
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
    logo: "/icons/tokens/usdc.svg",
    coingeckoId: "usd-coin",
  },

  // ── USDT ────────────────────────────────────────────────────────────────────
  [MINT.USDT]: {
    symbol: "USDT",
    name: "Tether USD",
    decimals: 6,
    logo: "/icons/tokens/usdt.svg",
    coingeckoId: "tether",
  },

  // ── WBTC ────────────────────────────────────────────────────────────────────
  [MINT.WBTC]: {
    symbol: "WBTC",
    name: "Wrapped Bitcoin",
    decimals: 8,
    logo: "/icons/tokens/wbtc.svg",
    coingeckoId: "wrapped-bitcoin",
  },

  // ── WETH ────────────────────────────────────────────────────────────────────
  [MINT.WETH]: {
    symbol: "WETH",
    name: "Wrapped Ether",
    decimals: 8,
    logo: "/icons/tokens/weth.svg",
    coingeckoId: "ethereum",
  },

  // ── cUAH ────────────────────────────────────────────────────────────────────
  [MINT.cUAH]: {
    symbol: "cUAH",
    name: "Cyclos Hryvnia",
    decimals: 4,
    logo: "/icons/tokens/cuah.svg",
    fixedUSD: 0.025,    // 1 UAH ≈ $0.025 USD (update via oracle in v2)
  },
};

function toToken(address: string, meta: TokenMeta): Token {
  return {
    address,
    symbol: meta.symbol,
    name: meta.name,
    decimals: meta.decimals,
    logo: meta.logo || null,
    chain: "solana",
    price: meta.fixedUSD ?? null,
  };
}

export const TOKENS = {
  SOL: toToken("So11111111111111111111111111111111111111112", KNOWN_TOKENS.SOL),
  USDC: toToken(MINT.USDC, KNOWN_TOKENS[MINT.USDC]),
  USDT: toToken(MINT.USDT, KNOWN_TOKENS[MINT.USDT]),
  WBTC: toToken(MINT.WBTC, KNOWN_TOKENS[MINT.WBTC]),
  WETH: toToken(MINT.WETH, KNOWN_TOKENS[MINT.WETH]),
  cUAH: toToken(MINT.cUAH, KNOWN_TOKENS[MINT.cUAH]),
} as const satisfies Record<string, Token>;

/** All CoinGecko IDs we need to fetch in a single request */
export const COINGECKO_IDS: string[] = [
  ...new Set(
    Object.values(KNOWN_TOKENS)
      .map((t) => t.coingeckoId)
      .filter((id): id is string => !!id),
  ),
];

/** Reverse map: coingeckoId → mint key (or "SOL") */
export const COINGECKO_ID_TO_KEY: Record<string, string> = Object.fromEntries(
  Object.entries(KNOWN_TOKENS)
    .filter(([, meta]) => meta.coingeckoId)
    .map(([key, meta]) => [meta.coingeckoId as string, key]),
);

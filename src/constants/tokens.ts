import type { Token } from "@/types";

type TokenSymbol = "SOL" | "USDC" | "cUAH" | "WBTC";

type ChainId = "solana" | "ton" | "bitcoin" | "bsc";

export interface ChainMetadata {
  name: string;
  symbol: string;
  rpc: string | null;
  color: string;
}

// Add logo SVG files to public/icons/tokens/.
export const TOKENS = {
  SOL: {
    address: "So11111111111111111111111111111111111111112",
    symbol: "SOL",
    name: "Solana",
    decimals: 9,
    chain: "solana",
    logo: "/icons/tokens/sol.svg",
    price: null,
  },
  USDC: {
    address: "EPjFWaJPg5ph9BUZkixEStzS7wTkEnKwKcbz6akcVohm",
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
    chain: "solana",
    logo: "/icons/tokens/usdc.svg",
    price: null,
  },
  // Update cUAH address before mainnet launch.
  cUAH: {
    address: "YOUR_CUAH_MINT_ADDRESS_HERE",
    symbol: "cUAH",
    name: "Cyclos Hryvnia",
    decimals: 6,
    chain: "solana",
    logo: "/icons/tokens/cuah.svg",
    price: null,
  },
  WBTC: {
    address: "9n4nbM75f5Ui33ZbPYXn59EwSgE8CGsHtAeTH5yfmFd",
    symbol: "WBTC",
    name: "Wrapped Bitcoin",
    decimals: 8,
    chain: "solana",
    logo: "/icons/tokens/wbtc.svg",
    price: null,
  },
} as const satisfies Record<TokenSymbol, Token>;

// Chain metadata used for Phase 3 multi-chain support.
export const CHAIN_METADATA = {
  solana: {
    name: "Solana",
    symbol: "SOL",
    rpc: process.env.NEXT_PUBLIC_SOLANA_RPC ?? "https://api.mainnet-beta.solana.com",
    color: "#14F195",
  },
  ton: {
    name: "TON",
    symbol: "TON",
    rpc: "https://toncenter.com/api/v2/jsonRPC",
    color: "#0098EA",
  },
  bitcoin: {
    name: "Bitcoin",
    symbol: "BTC",
    rpc: null,
    color: "#F7931A",
  },
  bsc: {
    name: "BSC",
    symbol: "BNB",
    rpc: "https://bsc-dataseed.binance.org/",
    color: "#F3BA2F",
  },
} as const satisfies Record<ChainId, ChainMetadata>;

export const PRICE_CACHE_TTL = 60_000;


/**
 * Shared type definitions for Cyclos Hryvnia.
 *
 * Keep this file framework-agnostic (no React/Next imports) so it can be reused
 * across server/client code and test utilities.
 */

/**
 * Supported chains in the app. Expand as we add more networks.
 */
export type Chain = "solana";

/**
 * A fungible token displayed in the app.
 */
export interface Token {
  /** SPL mint address (or token identifier for the chain). */
  address: string;
  /** Ticker symbol (e.g. "USDC"). */
  symbol: string;
  /** Human-readable token name (e.g. "USD Coin"). */
  name: string;
  /** Base-10 decimals used for UI formatting. */
  decimals: number;
  /** Optional logo URL (https/ipfs/data URI). */
  logo: string | null;
  /** Chain/network where this token exists. */
  chain: Chain;
  /** Latest known price in USD for 1 token. */
  price: number | null;
}

/**
 * Balance of a token for the connected wallet.
 */
export interface Balance {
  /** Token metadata. */
  token: Token;
  /** Amount in token units after applying token decimals. */
  amount: number;
  /** USD valuation of `amount` at `token.price`. */
  valueUSD: number;
  /**
   * 24-hour price change percentage sourced from CoinGecko.
   * Undefined when the price feed does not provide change data (e.g. cUAH).
   */
  changePercent?: number;
}

/**
 * Transaction direction/type.
 */
export type TransactionType = "send" | "receive" | "swap";

/**
 * Transaction lifecycle status.
 */
export type TransactionStatus = "success" | "pending" | "failed";

/**
 * A user-visible transaction record.
 */
export interface Transaction {
  /** Internal id (db/cache). */
  id: string;
  /** On-chain signature/hash when available. */
  hash: string | null;
  /** Sender address. */
  from: string;
  /** Recipient address. */
  to: string;
  /** Token involved in the transaction. */
  token: Token;
  /** Amount transferred/swapped in token units. */
  amount: number;
  /** Transaction type (send/receive/swap). */
  type: TransactionType;
  /** Unix timestamp in milliseconds. */
  timestamp: number;
  /** Execution status. */
  status: TransactionStatus;
  /** USD value at time of transaction. */
  valueUSD: number;
}

/**
 * NFT collection row used by the web marketplace screen.
 */
export interface NFTCollection {
  /** Stable collection id/slug. */
  id: string;
  /** Human-readable collection name. */
  name: string;
  /** Short collection ticker/symbol. */
  symbol: string;
  /** Optional image URL. UI falls back to a generated visual when empty. */
  image: string | null;
  /** Chain/network where this collection trades. */
  chain: Chain;
  /** Marketplace source used for the live/open link. */
  marketplace: "magiceden" | "tensor" | "local";
  /** Floor price denominated in SOL. */
  floorPriceSOL: number;
  /** Floor price converted to USD. */
  floorPriceUSD: number;
  /** Floor price converted to Ukrainian hryvnia/cUAH display units. */
  floorPriceUAH: number;
  /** Current listed item count when known. */
  listedCount: number;
  /** 24-hour collection volume denominated in SOL. */
  volume24hSOL: number;
  /** 24-hour floor or volume change percentage. */
  change24hPercent: number;
  /** External marketplace URL. */
  marketplaceUrl: string;
}

/**
 * Wallet provider options supported by the app.
 */
export type WalletProvider =
  | "email"
  | "web3auth"
  | "phantom"
  | "solflare"
  | null;

/**
 * Zustand wallet store state (connection + selected provider).
 */
export interface WalletState {
  /** Public key/address of the connected wallet, or null when disconnected. */
  address: string | null;
  /** True when a provider session is established. */
  connected: boolean;
  /** Current wallet provider. */
  provider: WalletProvider;
  /** Web3Auth connector name, for example auth or wallet-connect-v2. */
  connectorName?: string | null;
}

/**
 * Telegram Mini App user session info (subset we need).
 */
export interface TMAUser {
  /** Telegram user id as a string to avoid precision issues in JS. */
  userId: string;
  /** Telegram username without "@", if provided. */
  username: string | null;
  /** Telegram Premium flag. */
  isPremium: boolean;
  /** Optional deep-link start parameter. */
  startParam: string | null;
  /** Client platform as reported by Telegram. */
  platform: string;
}

import {
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  type ParsedAccountData,
  type VersionedTransactionResponse,
} from "@solana/web3.js";
import { TOKENS } from "@/constants/tokens";
import { SOLANA_RPC } from "@/lib/env";
import { isRateLimitError, logDevError, retryAsync } from "@/lib/errors";
import type { Transaction } from "@/types";

const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const DEFAULT_TRANSACTION_LIMIT = 50;
const SOL_PRICE_USD_FALLBACK = 180;
const RPC_TIMEOUT_MS = 10_000;
const RPC_RETRY_ATTEMPTS = 3;
const TRANSACTION_FETCH_CONCURRENCY = 8;

export interface TokenAccount {
  pubkey: string;
  mint: string;
  balance: number;
}

type ParsedTokenAccountInfo = {
  mint?: string;
  tokenAmount?: {
    uiAmount?: number | null;
    uiAmountString?: string;
  };
};

export const RPC_URL = SOLANA_RPC;

export const connection = new Connection(RPC_URL, "confirmed");

const solBalanceCache = new Map<string, number>();
const tokenBalanceCache = new Map<string, number>();
const tokenAccountsCache = new Map<string, TokenAccount[]>();
const transactionHistoryCache = new Map<string, Transaction[]>();

async function rpcCall<T>(
  context: string,
  operation: () => Promise<T>,
): Promise<T> {
  return retryAsync(operation, {
    attempts: RPC_RETRY_ATTEMPTS,
    baseDelayMs: 300,
    timeoutMs: RPC_TIMEOUT_MS,
    context,
  });
}

function toPublicKey(value: string, context: string): PublicKey | null {
  try {
    return new PublicKey(value);
  } catch (error) {
    logDevError(`[solana] Invalid public key: ${context}`, error);
    return null;
  }
}

function getCachedOrDefault<T>(
  cache: Map<string, T>,
  key: string,
  fallback: T,
  context: string,
  error: unknown,
): T {
  const cached = cache.get(key);

  if (cached !== undefined && isRateLimitError(error)) {
    logDevError(`[solana] Returning stale ${context} after rate limit`, error);
    return cached;
  }

  logDevError(`[solana] ${context}`, error);
  return fallback;
}

function parseTokenAmount(
  tokenAmount: ParsedTokenAccountInfo["tokenAmount"],
): number {
  const amount =
    tokenAmount?.uiAmountString ??
    (typeof tokenAmount?.uiAmount === "number"
      ? String(tokenAmount.uiAmount)
      : "0");
  const parsed = Number(amount);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(items[currentIndex]);
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(concurrency, items.length) },
      () => worker(),
    ),
  );

  return results;
}

async function fetchTransactionDetails(
  signatures: string[],
): Promise<Array<VersionedTransactionResponse | null>> {
  try {
    return await rpcCall("get transaction batch", () =>
      connection.getTransactions(signatures, {
        commitment: "confirmed",
        maxSupportedTransactionVersion: 0,
      }),
    );
  } catch (error) {
    logDevError("[solana] Batch transaction fetch failed; falling back", error);

    return mapWithConcurrency(
      signatures,
      TRANSACTION_FETCH_CONCURRENCY,
      async (signature) => {
        try {
          return await rpcCall("get transaction detail", () =>
            connection.getTransaction(signature, {
              commitment: "confirmed",
              maxSupportedTransactionVersion: 0,
            }),
          );
        } catch (innerError) {
          logDevError(`[solana] Failed to fetch transaction: ${signature}`, innerError);
          return null;
        }
      },
    );
  }
}

function getHistoryTokenByMint(mint: string) {
  return Object.values(TOKENS).find((token) => token.address === mint) ?? {
    address: mint,
    symbol: "SPL",
    name: "SPL Token",
    decimals: 0,
    chain: "solana" as const,
    logo: null,
    price: null,
  };
}

function findTokenCounterparty(
  tx: VersionedTransactionResponse,
  userAddress: string,
  mint: string,
  type: "send" | "receive",
): string {
  const owners = new Map<string, { post: number; pre: number }>();

  for (const balance of tx.meta?.preTokenBalances ?? []) {
    if (!balance.owner || balance.owner === userAddress || balance.mint !== mint) {
      continue;
    }

    owners.set(balance.owner, {
      post: 0,
      pre: parseTokenAmount(balance.uiTokenAmount),
    });
  }

  for (const balance of tx.meta?.postTokenBalances ?? []) {
    if (!balance.owner || balance.owner === userAddress || balance.mint !== mint) {
      continue;
    }

    const current = owners.get(balance.owner);
    owners.set(balance.owner, {
      post: parseTokenAmount(balance.uiTokenAmount),
      pre: current?.pre ?? 0,
    });
  }

  for (const [owner, amounts] of owners) {
    const delta = amounts.post - amounts.pre;
    if (
      (type === "receive" && delta < 0) ||
      (type === "send" && delta > 0)
    ) {
      return owner;
    }
  }

  return "";
}

function parseSplTokenBalanceDelta(
  tx: VersionedTransactionResponse,
  userAddress: string,
  hash: string,
  timestamp: number,
): Transaction | null {
  const balances = new Map<
    string,
    { decimals: number; mint: string; post: number; pre: number }
  >();

  for (const balance of tx.meta?.preTokenBalances ?? []) {
    if (balance.owner !== userAddress) continue;

    balances.set(balance.mint, {
      decimals: balance.uiTokenAmount.decimals,
      mint: balance.mint,
      post: 0,
      pre: parseTokenAmount(balance.uiTokenAmount),
    });
  }

  for (const balance of tx.meta?.postTokenBalances ?? []) {
    if (balance.owner !== userAddress) continue;

    const current = balances.get(balance.mint);
    balances.set(balance.mint, {
      decimals: balance.uiTokenAmount.decimals,
      mint: balance.mint,
      post: parseTokenAmount(balance.uiTokenAmount),
      pre: current?.pre ?? 0,
    });
  }

  const ownDelta = Array.from(balances.values())
    .map((item) => ({ ...item, delta: item.post - item.pre }))
    .filter((item) => item.delta !== 0)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))[0];

  if (!ownDelta) return null;

  const type: Transaction["type"] = ownDelta.delta > 0 ? "receive" : "send";
  const amount = Math.abs(ownDelta.delta);
  const token = getHistoryTokenByMint(ownDelta.mint);
  const counterparty = findTokenCounterparty(
    tx,
    userAddress,
    ownDelta.mint,
    type,
  );
  const price = token.price ?? 0;

  return {
    id: hash,
    hash,
    from: type === "send" ? userAddress : counterparty,
    to: type === "receive" ? userAddress : counterparty,
    token: {
      ...token,
      decimals: token.decimals || ownDelta.decimals,
    },
    amount,
    type,
    timestamp,
    status: tx.meta?.err ? "failed" : "success",
    valueUSD: amount * price,
  };
}

/**
 * Fetch SOL balance for a wallet address.
 *
 * Solana balances are returned in lamports. 1 SOL = 1,000,000,000 lamports.
 */
export async function getSOLBalance(address: string): Promise<number> {
  const publicKey = toPublicKey(address, "SOL balance owner");
  if (!publicKey) return 0;

  try {
    const lamports = await rpcCall("get SOL balance", () =>
      connection.getBalance(publicKey),
    );
    const balance = lamports / LAMPORTS_PER_SOL;
    solBalanceCache.set(address, balance);
    return balance;
  } catch (error) {
    return getCachedOrDefault(
      solBalanceCache,
      address,
      0,
      "SOL balance",
      error,
    );
  }
}

/**
 * Fetch balance for a specific SPL token mint.
 */
export async function getTokenBalance(
  address: string,
  tokenMint: string,
): Promise<number> {
  const owner = toPublicKey(address, "token balance owner");
  const mint = toPublicKey(tokenMint, "token mint");
  const cacheKey = `${address}:${tokenMint}`;

  if (!owner || !mint) return 0;

  try {
    const accounts = await rpcCall("get token accounts by owner", () =>
      connection.getTokenAccountsByOwner(owner, { mint }),
    );

    let totalBalance = 0;
    for (const { pubkey } of accounts.value) {
      try {
        const balance = await rpcCall("get token account balance", () =>
          connection.getTokenAccountBalance(pubkey),
        );
        totalBalance += parseTokenAmount(balance.value);
      } catch (error) {
        logDevError(`[solana] Failed to fetch token account balance: ${pubkey}`, error);
      }
    }

    tokenBalanceCache.set(cacheKey, totalBalance);
    return totalBalance;
  } catch (error) {
    return getCachedOrDefault(
      tokenBalanceCache,
      cacheKey,
      0,
      "SPL token balance",
      error,
    );
  }
}

/**
 * Fetch all SPL token accounts for an owner.
 *
 * TOKEN_PROGRAM_ID filters standard SPL Token accounts owned by the wallet.
 */
export async function getAllTokenAccounts(
  address: string,
): Promise<TokenAccount[]> {
  const owner = toPublicKey(address, "token account owner");
  if (!owner) return [];

  try {
    const accounts = await rpcCall("get parsed token accounts", () =>
      connection.getParsedTokenAccountsByOwner(owner, {
        programId: TOKEN_PROGRAM_ID,
      }),
    );

    const tokenAccounts = accounts.value
      .map(({ account, pubkey }): TokenAccount | null => {
        const data = account.data as ParsedAccountData;
        const info = data.parsed.info as ParsedTokenAccountInfo;

        if (!info.mint) return null;

        return {
          pubkey: pubkey.toBase58(),
          mint: info.mint,
          balance: parseTokenAmount(info.tokenAmount),
        };
      })
      .filter((account): account is TokenAccount => account !== null);

    tokenAccountsCache.set(address, tokenAccounts);
    return tokenAccounts;
  } catch (error) {
    return getCachedOrDefault(
      tokenAccountsCache,
      address,
      [],
      "SPL token accounts",
      error,
    );
  }
}

/**
 * Fetch recent Solana transactions for a wallet address.
 *
 * RPC rate limiting considerations:
 * this fetches full transaction details one-by-one after signatures are loaded.
 * A production history view should add caching and request throttling.
 *
 * All RPC calls are wrapped so an invalid address or individual transaction
 * failure returns a safe empty/default result instead of breaking components.
 */
export async function getTransactionHistory(
  address: string,
  limit = DEFAULT_TRANSACTION_LIMIT,
): Promise<Transaction[]> {
  const publicKey = toPublicKey(address, "transaction history owner");
  if (!publicKey) return [];

  const safeLimit = Math.max(1, Math.min(limit, 100));
  const cacheKey = `${address}:${safeLimit}`;

  try {
    const signatures = await rpcCall("get transaction signatures", () =>
      connection.getSignaturesForAddress(publicKey, {
        limit: safeLimit,
      }),
    );
    const transactionDetails = await fetchTransactionDetails(
      signatures.map(({ signature }) => signature),
    );
    const parsedTransactions = transactionDetails.map((transaction) =>
      transaction ? parseTransaction(transaction, address) : null,
    );

    const sorted = parsedTransactions
      .filter((transaction): transaction is Transaction => transaction !== null)
      .sort((a, b) => b.timestamp - a.timestamp);
    transactionHistoryCache.set(cacheKey, sorted);
    return sorted;
  } catch (error) {
    return getCachedOrDefault(
      transactionHistoryCache,
      cacheKey,
      [],
      "transaction history",
      error,
    );
  }
}

/**
 * Parse a Solana transaction into the simplified app history shape.
 *
 * SPL token balance deltas are checked first, because token sends also change
 * the SOL balance by a small network fee. Without this, cUAH transfers appear
 * as tiny SOL sends in history.
 *
 * Lamports to SOL conversion: fallback SOL entries divide lamports by
 * 1,000,000,000 (LAMPORTS_PER_SOL).
 */
export function parseTransaction(
  tx: VersionedTransactionResponse,
  userAddress: string,
): Transaction | null {
  try {
    const hash = tx.transaction.signatures[0];
    if (!hash || !tx.meta || typeof tx.blockTime !== "number") return null;

    const timestamp = tx.blockTime * 1_000;
    const splTransaction = parseSplTokenBalanceDelta(
      tx,
      userAddress,
      hash,
      timestamp,
    );

    if (splTransaction) {
      return splTransaction;
    }

    const amount = tx.meta.fee / LAMPORTS_PER_SOL;

    return {
      id: hash,
      hash,
      from: userAddress,
      to: userAddress,
      token: {
        ...TOKENS.SOL,
        price: SOL_PRICE_USD_FALLBACK,
      },
      amount,
      type: "send",
      timestamp,
      status: tx.meta.err ? "failed" : "success",
      valueUSD: amount * SOL_PRICE_USD_FALLBACK,
    };
  } catch (error) {
    logDevError("[solana] Failed to parse transaction", error);
    return null;
  }
}

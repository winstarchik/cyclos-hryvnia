import {
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  type ParsedAccountData,
  type VersionedTransactionResponse,
} from "@solana/web3.js";
import { TOKENS } from "@/constants/tokens";
import { SOLANA_RPC } from "@/lib/env";
import type { Transaction } from "@/types";

const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const DEFAULT_TRANSACTION_LIMIT = 50;
const SOL_PRICE_USD_FALLBACK = 180;

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

function logDevError(context: string, error: unknown): void {
  if (process.env.NODE_ENV !== "production") {
    console.error(`[solana] ${context}`, error);
  }
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

/**
 * Fetch SOL balance for a wallet address.
 *
 * Solana balances are returned in lamports. 1 SOL = 1,000,000,000 lamports.
 */
export async function getSOLBalance(address: string): Promise<number> {
  try {
    const publicKey = new PublicKey(address);
    const lamports = await connection.getBalance(publicKey);
    return lamports / LAMPORTS_PER_SOL;
  } catch (error) {
    logDevError("Failed to fetch SOL balance", error);
    return 0;
  }
}

/**
 * Fetch balance for a specific SPL token mint.
 */
export async function getTokenBalance(
  address: string,
  tokenMint: string,
): Promise<number> {
  try {
    const owner = new PublicKey(address);
    const mint = new PublicKey(tokenMint);
    const accounts = await connection.getTokenAccountsByOwner(owner, { mint });

    let totalBalance = 0;
    for (const { pubkey } of accounts.value) {
      try {
        const balance = await connection.getTokenAccountBalance(pubkey);
        totalBalance += parseTokenAmount(balance.value);
      } catch (error) {
        logDevError(`Failed to fetch token account balance: ${pubkey}`, error);
      }
    }

    return totalBalance;
  } catch (error) {
    logDevError("Failed to fetch SPL token balance", error);
    return 0;
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
  try {
    const owner = new PublicKey(address);
    const accounts = await connection.getParsedTokenAccountsByOwner(owner, {
      programId: TOKEN_PROGRAM_ID,
    });

    return accounts.value
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
  } catch (error) {
    logDevError("Failed to fetch SPL token accounts", error);
    return [];
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
  try {
    const publicKey = new PublicKey(address);
    const signatures = await connection.getSignaturesForAddress(publicKey, {
      limit,
    });
    const transactions: Transaction[] = [];

    for (const { signature } of signatures) {
      try {
        const transaction = await connection.getTransaction(signature, {
          commitment: "confirmed",
          maxSupportedTransactionVersion: 0,
        });
        const parsed = transaction
          ? parseTransaction(transaction, address)
          : null;

        if (parsed) {
          transactions.push(parsed);
        }
      } catch (error) {
        logDevError(`Failed to fetch transaction: ${signature}`, error);
      }
    }

    return transactions.sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    logDevError("Failed to fetch transaction history", error);
    return [];
  }
}

/**
 * Parse a Solana transaction into the simplified app history shape.
 *
 * Lamports to SOL conversion: Solana fees are reported in lamports, so we
 * divide by 1,000,000,000 (LAMPORTS_PER_SOL) to display SOL.
 *
 * Fee-based parsing is simplified for the MVP: every transaction is treated as
 * a "send" with the fee as the displayed amount.
 *
 * TODO: Implement SPL token transfer parsing in Phase 4.
 */
export function parseTransaction(
  tx: VersionedTransactionResponse,
  userAddress: string,
): Transaction | null {
  try {
    const hash = tx.transaction.signatures[0];
    if (!hash || !tx.meta || typeof tx.blockTime !== "number") return null;

    const amount = tx.meta.fee / LAMPORTS_PER_SOL;
    const timestamp = tx.blockTime * 1_000;

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
    logDevError("Failed to parse transaction", error);
    return null;
  }
}

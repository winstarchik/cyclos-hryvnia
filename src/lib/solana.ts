import {
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  type ParsedAccountData,
  type VersionedTransactionResponse,
} from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

const MAINNET_RPC_URL = "https://api.mainnet-beta.solana.com";
const DEVNET_RPC_URL = "https://api.devnet.solana.com";
const DEFAULT_TRANSACTION_LIMIT = 50;

export type TransactionType = "send" | "receive" | "swap";
export type TransactionStatus = "success" | "failed";

export interface TokenAccount {
  pubkey: string;
  mint: string;
  balance: number;
}

export interface Transaction {
  hash: string;
  timestamp: number;
  fee: number;
  amount: number;
  type: TransactionType;
  status: TransactionStatus;
}

type ParsedTokenAccountInfo = {
  mint?: string;
  tokenAmount?: {
    uiAmount?: number | null;
    uiAmountString?: string;
  };
};

function resolveRpcUrl(): string {
  const envRpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC?.trim();
  if (envRpcUrl) return envRpcUrl;

  return process.env.NODE_ENV === "development" ? DEVNET_RPC_URL : MAINNET_RPC_URL;
}

export const RPC_URL = resolveRpcUrl();

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
 * Fetch recent Solana transactions for a wallet.
 *
 * RPC rate limiting considerations:
 * this fetches full transaction details one-by-one after signatures are loaded.
 * A production history view should add caching and request throttling.
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
        const parsed = transaction ? parseTransaction(transaction) : null;

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
 * Token transfer parsing in Phase 3.
 */
export function parseTransaction(
  tx: VersionedTransactionResponse,
): Transaction | null {
  try {
    const hash = tx.transaction.signatures[0];
    if (!hash || !tx.meta) return null;

    // TODO: Implement token transfer parsing.
    const fee = tx.meta.fee / LAMPORTS_PER_SOL;

    return {
      hash,
      timestamp: tx.blockTime ? tx.blockTime * 1_000 : 0,
      fee,
      amount: fee,
      type: "send",
      status: tx.meta.err ? "failed" : "success",
    };
  } catch (error) {
    logDevError("Failed to parse transaction", error);
    return null;
  }
}


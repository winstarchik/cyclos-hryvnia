"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { handleError, logDevError } from "@/lib/errors";
import type { Transaction } from "@/types";
import { useWallet } from "./useWallet";

const REFRESH_INTERVAL_MS = 60_000;

export interface UseTransactionsResult {
  transactions: Transaction[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Reads Solana transaction history for the connected wallet.
 *
 * @example
 * ```tsx
 * const { transactions, loading, refetch } = useTransactions();
 * // Auto-refreshes every 60 seconds
 * // Can manually trigger: await refetch()
 * ```
 */
export function useTransactions(): UseTransactionsResult {
  const { address, connected } = useWallet();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadingRef = useRef(false);
  const addressRef = useRef<string | null>(address);
  const connectedRef = useRef(connected);

  addressRef.current = address;
  connectedRef.current = connected;

  const fetchTransactions = useCallback(async (walletAddress: string) => {
    if (loadingRef.current) return;

    loadingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      // Split Solana RPC utilities away from the initial history page bundle.
      const { getTransactionHistory } = await import("@/lib/solana");
      const history = await getTransactionHistory(walletAddress);
      setTransactions(history);
    } catch (fetchError) {
      logDevError("[transactions] Failed to fetch transaction history", fetchError);
      setError(handleError(fetchError).userMessage);
      setTransactions([]);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, []);

  const refetch = useCallback(async () => {
    if (!connectedRef.current || !addressRef.current) {
      setTransactions([]);
      setLoading(false);
      setError(null);
      return;
    }

    await fetchTransactions(addressRef.current);
  }, [fetchTransactions]);

  useEffect(() => {
    if (!connected || !address) {
      setTransactions([]);
      setLoading(false);
      setError(null);
      loadingRef.current = false;
      return;
    }

    void fetchTransactions(address);

    const intervalId = window.setInterval(() => {
      void fetchTransactions(address);
    }, REFRESH_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [connected, address]);

  if (!connected || !address) {
    return {
      transactions: [],
      loading: false,
      error: null,
      refetch,
    };
  }

  return {
    transactions,
    loading,
    error,
    refetch,
  };
}

"use client";

import { useCallback, useEffect } from "react";
import { useBalanceStore } from "@/stores/balanceStore";
import type { Balance } from "@/types";
import { useWallet } from "./useWallet";

const REFRESH_INTERVAL_MS = 30_000;

export interface UseBalanceResult {
  balances: Balance[];
  loading: boolean;
  error: string | null;
  totalValueUSD: number;
  lastUpdated: number | null;
  refetch: () => Promise<void>;
}

/**
 * Reads cached wallet balances and refreshes them while a wallet is connected.
 *
 * @example
 * ```tsx
 * const { balances, loading, totalValueUSD } = useBalance();
 * const solBalance = useBalance("SOL");
 * ```
 */
export function useBalance(): UseBalanceResult;
export function useBalance(token: string): Balance | undefined;
export function useBalance(
  token?: string,
): UseBalanceResult | Balance | undefined {
  const { address, connected } = useWallet();
  const balances = useBalanceStore((state) => state.balances);
  const loading = useBalanceStore((state) => state.loading);
  const error = useBalanceStore((state) => state.error);
  const lastUpdated = useBalanceStore((state) => state.lastUpdated);
  const fetchBalances = useBalanceStore((state) => state.fetchBalances);
  const getBalance = useBalanceStore((state) => state.getBalance);
  const getTotalUSD = useBalanceStore((state) => state.getTotalUSD);

  const hasWallet = connected && Boolean(address);

  const refetch = useCallback(async () => {
    if (!connected || !address) return;

    await fetchBalances(address);
  }, [connected, address, fetchBalances]);

  useEffect(() => {
    if (!connected || !address) return;

    // Refetch on address change.
    void fetchBalances(address);

    // Auto-refresh: 30 seconds.
    const intervalId = window.setInterval(() => {
      void fetchBalances(address);
    }, REFRESH_INTERVAL_MS);

    // Cleanup prevents memory leaks.
    return () => window.clearInterval(intervalId);
  }, [connected, address, fetchBalances]);

  if (token) {
    return hasWallet ? getBalance(token) : undefined;
  }

  return {
    balances: hasWallet ? balances : [],
    loading: hasWallet ? loading : false,
    error: hasWallet ? error : null,
    totalValueUSD: hasWallet ? getTotalUSD() : 0,
    lastUpdated: hasWallet ? lastUpdated : null,
    refetch,
  };
}


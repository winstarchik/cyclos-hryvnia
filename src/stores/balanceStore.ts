import { create } from "zustand";
import { TOKENS } from "@/constants/tokens";
import { handleError, isNetworkError, logDevError } from "@/lib/errors";
import { useWalletStore } from "@/stores/walletStore";
import type { Balance, Token } from "@/types";

const CACHE_DURATION_MS = 30_000;

const FALLBACK_TOKEN_PRICES_USD: Record<string, number> = {
  SOL:  150,
  USDC: 1,
  cUAH: 0.024,
  WBTC: 65_000,
};

let cachedAddress: string | null = null;

/* ── Store shape ──────────────────────────────────────────── */

export interface BalanceStoreState {
  balances:          Balance[];
  loading:           boolean;
  error:             string | null;
  lastUpdated:       number | null;
  selectedCurrency:  "USD" | "EUR";
}

export interface BalanceStoreActions {
  fetchBalances:  (address: string) => Promise<void>;
  getBalance:     (symbol: string)  => Balance | undefined;
  getTotalUSD:    ()                => number;
  clearBalances:  ()                => void;
}

export type BalanceStore = BalanceStoreState & BalanceStoreActions;

const initialState: BalanceStoreState = {
  balances:         [],
  loading:          false,
  error:            null,
  lastUpdated:      null,
  selectedCurrency: "USD",
};

/* ── Price + change fetcher ───────────────────────────────── */

interface PriceData {
  prices:  Record<string, number>;
  changes: Record<string, number>;
}

async function fetchPriceData(symbols: string[]): Promise<PriceData> {
  const fallback: PriceData = {
    prices: symbols.reduce<Record<string, number>>((acc, sym) => {
      acc[sym] = FALLBACK_TOKEN_PRICES_USD[sym] ?? 0;
      return acc;
    }, {}),
    changes: {},
  };

  try {
    const params = new URLSearchParams({
      symbols: Array.from(new Set(symbols)).join(","),
    });
    const response = await fetch(`/api/rpc/prices?${params.toString()}`, {
      cache: "no-store",
    });

    if (!response.ok) return fallback;

    const payload = (await response.json()) as {
      data?: { prices?: Record<string, number>; changes?: Record<string, number> };
    };

    return {
      prices:  { ...fallback.prices,  ...(payload.data?.prices  ?? {}) },
      changes: { ...(payload.data?.changes ?? {}) },
    };
  } catch (error) {
    logDevError("[balances] Failed to refresh token prices", error);
    return fallback;
  }
}

/* ── Balance builder ──────────────────────────────────────── */

function createBalance(
  token:     Token,
  amount:    number,
  data:      PriceData,
): Balance {
  const priceUSD =
    data.prices[token.symbol] ??
    FALLBACK_TOKEN_PRICES_USD[token.symbol] ??
    0;

  const balance: Balance = {
    token:    { ...token, price: priceUSD },
    amount,
    valueUSD: amount * priceUSD,
  };

  // Only attach changePercent when CoinGecko returned a value for this symbol.
  if (token.symbol in data.changes) {
    balance.changePercent = data.changes[token.symbol];
  }

  return balance;
}

function getTokenByMint(mint: string): Token {
  const token = Object.values(TOKENS).find((t) => t.address === mint);
  if (token) return { ...token };

  return {
    address:  mint,
    symbol:   "SPL",
    name:     "SPL Token",
    decimals: 0,
    chain:    "solana",
    logo:     null,
    price:    null,
  };
}

function getBalanceErrorMessage(error: unknown): string {
  const appError = handleError(error);

  if (isNetworkError(error) || appError.code === "TIMEOUT") {
    return "We could not refresh balances because the network is slow. Please try again.";
  }

  return "We could not refresh balances. Please check your wallet and try again.";
}

function sortBalances(balances: Balance[]) {
  return balances.sort((a, b) => {
    if (a.token.symbol === "cUAH") return -1;
    if (b.token.symbol === "cUAH") return 1;
    return b.valueUSD - a.valueUSD;
  });
}

/* ── Store ────────────────────────────────────────────────── */

export const useBalanceStore = create<BalanceStore>()((set, get) => ({
  ...initialState,

  fetchBalances: async (address) => {
    const { lastUpdated, loading } = get();
    const now = Date.now();

    // Respect cache window; guard against concurrent fetches.
    if (
      cachedAddress === address &&
      lastUpdated !== null &&
      now - lastUpdated < CACHE_DURATION_MS
    ) {
      return;
    }

    if (loading) return;

    set({ loading: true, error: null });

    try {
      // Dynamic import keeps @solana/web3.js out of the initial bundle.
      const [{ PublicKey }, { getAllTokenAccounts, getSOLBalance }] =
        await Promise.all([
          import("@solana/web3.js"),
          import("@/lib/solana"),
        ]);

      new PublicKey(address); // validate — throws on bad key

      const [solAmount, tokenAccounts] = await Promise.all([
        getSOLBalance(address),
        getAllTokenAccounts(address),
      ]);

      const tokens = [
        { ...TOKENS.SOL },
        ...tokenAccounts.map((account) => getTokenByMint(account.mint)),
      ];

      const priceData = await fetchPriceData(tokens.map((t) => t.symbol));

      const balances: Balance[] = [
        createBalance(tokens[0], solAmount, priceData),
        ...tokenAccounts.map((account, i) =>
          createBalance(tokens[i + 1], account.balance, priceData),
        ),
      ];

      cachedAddress = address;
      set({ balances: sortBalances(balances), loading: false, error: null, lastUpdated: Date.now() });
    } catch (error) {
      logDevError("[balances] Failed to refresh balances", error);
      set({ loading: false, error: getBalanceErrorMessage(error) });
    }
  },

  getBalance: (symbol) =>
    get().balances.find(
      (b) => b.token.symbol.toLowerCase() === symbol.trim().toLowerCase(),
    ),

  getTotalUSD: () =>
    get().balances.reduce((total, b) => total + b.valueUSD, 0),

  clearBalances: () => {
    cachedAddress = null;
    set({ balances: [], lastUpdated: null, error: null, loading: false });
  },
}));

// Auto-clear balances on wallet disconnect.
useWalletStore.subscribe((state, prevState) => {
  if (prevState.connected && !state.connected) {
    useBalanceStore.getState().clearBalances();
  }
});

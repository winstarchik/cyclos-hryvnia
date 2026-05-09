import { create } from "zustand";
import { TOKENS } from "@/constants/tokens";
import { handleError, isNetworkError, logDevError } from "@/lib/errors";
import { useWalletStore } from "@/stores/walletStore";
import type { Balance, Token } from "@/types";

const CACHE_DURATION_MS = 30_000;

const FALLBACK_TOKEN_PRICES_USD: Record<string, number> = {
  SOL: 150,
  USDC: 1,
  cUAH: 0.024,
  WBTC: 65_000,
};

let cachedAddress: string | null = null;

/**
 * Balance store state.
 */
export interface BalanceStoreState {
  balances: Balance[];
  loading: boolean;
  error: string | null;
  lastUpdated: number | null;
  selectedCurrency: "USD" | "EUR";
}

/**
 * Balance store actions.
 */
export interface BalanceStoreActions {
  /**
   * Fetch balances for a given wallet address.
   */
  fetchBalances: (address: string) => Promise<void>;

  /**
   * Get cached balance by token symbol.
   */
  getBalance: (symbol: string) => Balance | undefined;

  /**
   * Get total portfolio value in USD.
   */
  getTotalUSD: () => number;

  /**
   * Clears cached balances.
   */
  clearBalances: () => void;
}

export type BalanceStore = BalanceStoreState & BalanceStoreActions;

const initialState: BalanceStoreState = {
  balances: [],
  loading: false,
  error: null,
  lastUpdated: null,
  selectedCurrency: "USD",
};

async function fetchTokenPricesUSD(
  symbols: string[],
): Promise<Record<string, number>> {
  const fallbackPrices = symbols.reduce<Record<string, number>>(
    (prices, symbol) => {
      prices[symbol] = FALLBACK_TOKEN_PRICES_USD[symbol] ?? 0;
      return prices;
    },
    {},
  );

  try {
    const params = new URLSearchParams({
      symbols: Array.from(new Set(symbols)).join(","),
    });
    const response = await fetch(`/api/rpc/prices?${params.toString()}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return fallbackPrices;
    }

    const payload = (await response.json()) as {
      data?: Record<string, number>;
    };

    return {
      ...fallbackPrices,
      ...(payload.data ?? {}),
    };
  } catch (error) {
    logDevError("[balances] Failed to refresh token prices", error);
    return fallbackPrices;
  }
}

function createBalance(
  token: Token,
  amount: number,
  pricesUSD: Record<string, number>,
): Balance {
  const priceUSD = pricesUSD[token.symbol] ?? FALLBACK_TOKEN_PRICES_USD[token.symbol] ?? 0;

  return {
    token: {
      ...token,
      price: priceUSD,
    },
    amount,
    // Converts all to USD for display.
    valueUSD: amount * priceUSD,
  };
}

function getTokenByMint(mint: string): Token {
  const token = Object.values(TOKENS).find((item) => item.address === mint);

  if (token) {
    return { ...token };
  }

  return {
    address: mint,
    symbol: "SPL",
    name: "SPL Token",
    decimals: 0,
    chain: "solana",
    logo: null,
    price: null,
  };
}

function getBalanceErrorMessage(error: unknown): string {
  const appError = handleError(error);

  if (isNetworkError(error) || appError.code === "TIMEOUT") {
    return "We could not refresh balances because the network is slow. Please try again.";
  }

  return "We could not refresh balances. Please check your wallet and try again.";
}

export const useBalanceStore = create<BalanceStore>()((set, get) => ({
  ...initialState,

  fetchBalances: async (address) => {
    const { lastUpdated, loading } = get();
    const now = Date.now();

    // Cache duration: 30 seconds.
    if (
      cachedAddress === address &&
      lastUpdated !== null &&
      now - lastUpdated < CACHE_DURATION_MS
    ) {
      return;
    }

    if (loading) {
      return;
    }

    set({ loading: true, error: null });

    try {
      // Load Solana RPC code only when balances are fetched so web3.js does
      // not inflate the first client bundle.
      const [{ PublicKey }, { getAllTokenAccounts, getSOLBalance }] =
        await Promise.all([import("@solana/web3.js"), import("@/lib/solana")]);

      new PublicKey(address);

      const [solAmount, tokenAccounts] = await Promise.all([
        getSOLBalance(address),
        getAllTokenAccounts(address),
      ]);

      const tokens = [
        { ...TOKENS.SOL },
        ...tokenAccounts.map((account) => getTokenByMint(account.mint)),
      ];
      const pricesUSD = await fetchTokenPricesUSD(
        tokens.map((token) => token.symbol),
      );
      const balances = [
        createBalance(tokens[0], solAmount, pricesUSD),
        ...tokenAccounts.map((account, index) =>
          createBalance(tokens[index + 1], account.balance, pricesUSD),
        ),
      ];

      cachedAddress = address;
      set({
        balances,
        loading: false,
        error: null,
        lastUpdated: Date.now(),
      });
    } catch (error) {
      logDevError("[balances] Failed to refresh balances", error);
      set({
        loading: false,
        error: getBalanceErrorMessage(error),
      });
    }
  },

  getBalance: (symbol) =>
    get().balances.find(
      (balance) =>
        balance.token.symbol.toLowerCase() === symbol.trim().toLowerCase(),
    ),

  getTotalUSD: () =>
    get().balances.reduce((total, balance) => total + balance.valueUSD, 0),

  clearBalances: () => {
    cachedAddress = null;
    set({ balances: [], lastUpdated: null, error: null, loading: false });
  },
}));

// Auto-clear balances when wallet disconnects.
useWalletStore.subscribe((state, prevState) => {
  if (prevState.connected && !state.connected) {
    useBalanceStore.getState().clearBalances();
  }
});

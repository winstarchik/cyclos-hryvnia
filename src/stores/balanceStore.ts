import { create } from "zustand";
import { TOKENS } from "@/constants/tokens";
import { useWalletStore } from "@/stores/walletStore";
import type { Balance, Token } from "@/types";

const CACHE_DURATION_MS = 30_000;

const TOKEN_PRICES_USD: Record<string, number> = {
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

function getTokenPriceUSD(symbol: string): number {
  // Token prices stubbed - integrate Jupiter API in Phase 2.
  return TOKEN_PRICES_USD[symbol] ?? 0;
}

function createBalance(token: Token, amount: number): Balance {
  const priceUSD = getTokenPriceUSD(token.symbol);

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

      const balances = [
        createBalance({ ...TOKENS.SOL }, solAmount),
        ...tokenAccounts.map((account) =>
          createBalance(getTokenByMint(account.mint), account.balance),
        ),
      ];

      cachedAddress = address;
      set({
        balances,
        loading: false,
        error: null,
        lastUpdated: Date.now(),
      });
    } catch {
      set({
        loading: false,
        error: "Unable to refresh balances. Please check your wallet and try again.",
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

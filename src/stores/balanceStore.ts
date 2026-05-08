import { create } from "zustand";
import type { Balance, Token } from "@/types";
import { useWalletStore } from "@/stores/walletStore";

/**
 * Balance store state.
 */
export interface BalanceStoreState {
  balances: Balance[];
  loading: boolean;
  lastUpdated: number | null;
}

/**
 * Balance store actions.
 */
export interface BalanceStoreActions {
  /**
   * Fetch balances for a given address.
   *
   * Note: Network implementation is a placeholder for PHASE 0. We will wire it
   * to Solana RPC + SPL Token accounts in the Solana phase.
   */
  fetchBalances: (address: string) => Promise<void>;

  /**
   * Get cached balance by token.
   */
  getBalance: (token: Token) => Balance | undefined;

  /**
   * Clears cached balances.
   */
  clear: () => void;
}

export type BalanceStore = BalanceStoreState & BalanceStoreActions;

const initialState: BalanceStoreState = {
  balances: [],
  loading: false,
  lastUpdated: null,
};

export const useBalanceStore = create<BalanceStore>()((set, get) => ({
  ...initialState,

  fetchBalances: async (address) => {
    set({ loading: true });
    try {
      // Placeholder: clear balances for now; real fetch will populate.
      // We still update timestamps to support UI refresh state.
      void address;
      set({ balances: [], lastUpdated: Date.now() });
    } finally {
      set({ loading: false });
    }
  },

  getBalance: (token) =>
    get().balances.find((b) => b.token.address === token.address),

  clear: () => set({ balances: [], lastUpdated: null, loading: false }),
}));

// Auto-clear balances when wallet disconnects.
useWalletStore.subscribe((state, prevState) => {
  if (prevState.connected && !state.connected) {
    useBalanceStore.getState().clear();
  }
});


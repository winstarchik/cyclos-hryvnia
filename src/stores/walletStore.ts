import { create } from "zustand";
import { handleError, isNetworkError } from "@/lib/errors";

/**
 * Wallet provider options supported by the app.
 *
 * Email-code auth gates the app through our server session. Web3Auth Google and
 * injected Solana wallets provide blockchain accounts.
 */
export type WalletProvider =
  | "email"
  | "web3auth"
  | "phantom"
  | "solflare"
  | null;

/**
 * Complete wallet store shape.
 */
export interface WalletStoreType {
  address: string | null;
  email: string | null;
  connected: boolean;
  provider: WalletProvider;
  /**
   * Web3Auth connector name, for example "auth" or "wallet-connect-v2".
   */
  connectorName: string | null;
  /**
   * Ephemeral state: true while a connection attempt is in progress.
   * Not persisted to avoid stale UI on refresh.
   */
  loading: boolean;
  /**
   * Ephemeral state: last user-facing error message.
   * Not persisted to avoid showing old errors after refresh.
   */
  error: string | null;
}

/**
 * Wallet store actions.
 */
export interface WalletStoreActions {
  /**
   * Persist an app auth session created by the server email-code flow.
   */
  setEmailPasswordSession: (email: string) => void;
  /**
   * Persist a Web3Auth session after the React SDK reports a Solana account.
   */
  setWeb3AuthSession: (address: string, connectorName?: string | null) => void;
  /**
   * Persist an injected Solana wallet session after Phantom/Solflare connects.
   */
  setInjectedWalletSession: (
    address: string,
    provider: Exclude<WalletProvider, "email" | "web3auth" | null>,
  ) => void;

  /**
   * Disconnect and clear wallet session.
   */
  disconnect: () => Promise<void>;

  /**
   * Allow SDK-driven hooks to mirror loading/error state in the store.
   */
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  /**
   * Clear the current error message.
   */
  clearError: () => void;
}

export type WalletStore = WalletStoreType & WalletStoreActions;

const initialState: WalletStoreType = {
  address: null,
  email: null,
  connected: false,
  provider: null,
  connectorName: null,
  loading: false,
  error: null,
};

function getWalletErrorMessage(error: unknown): string {
  const appError = handleError(error);
  const message = appError.message;

  if (/reject|denied|declined|cancel|closed|popup/i.test(message)) {
    if (/popup.*block|block.*popup/i.test(message)) {
      return "The browser blocked the login popup. Please try again; login will continue in the same tab.";
    }

    return "Connection was cancelled. You can try again when you are ready.";
  }

  if (/invalid auth connection|authconnectionconfig|auth connection config|auth connection/i.test(message)) {
    return "This login method is not enabled in the Web3Auth dashboard. Enable the provider, select the Web platform, and try again.";
  }

  if (/web3auth_no_provider/i.test(message)) {
    return "Web3Auth did not return a wallet. Check that Google login is enabled for this project and domain.";
  }

  if (/wallet|not installed|not available|unsupported/i.test(message)) {
    return "This wallet is not available in the current browser. Try another option in the Web3Auth modal.";
  }

  if (isNetworkError(error) || appError.code === "TIMEOUT") {
    return "The network is taking longer than expected. Please check your connection and try again.";
  }

  if (/client.?id|whitelist|origin|domain|redirect|forbidden|unauthori|not allowed|access denied|localhost/i.test(message)) {
    return "Web3Auth is not configured for this app URL. Check the client id and whitelist localhost/domain in the Web3Auth dashboard.";
  }

  if (process.env.NODE_ENV === "development" && message) {
    return `Web3Auth error: ${message}`;
  }

  return "We could not connect with Web3Auth. Please try again.";
}

export function getWeb3AuthUserMessage(error: unknown): string {
  return getWalletErrorMessage(error);
}

export const useWalletStore = create<WalletStore>()((set) => ({
  ...initialState,

  setEmailPasswordSession: (email) => {
    set({
      address: null,
      email,
      connected: true,
      provider: "email",
      connectorName: "email-code",
      loading: false,
      error: null,
    });
  },

  setWeb3AuthSession: (address, connectorName = null) => {
    set({
      address,
      email: null,
      connected: true,
      provider: "web3auth",
      connectorName,
      loading: false,
      error: null,
    });
  },

  setInjectedWalletSession: (address, provider) => {
    set({
      address,
      email: null,
      connected: true,
      provider,
      connectorName: provider,
      loading: false,
      error: null,
    });
  },

  disconnect: async () => {
    set({ ...initialState });
  },

  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),
}));

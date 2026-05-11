import { create } from "zustand";
import { handleError, isNetworkError } from "@/lib/errors";

/**
 * Wallet provider options supported by the app.
 *
 * Email-code auth identifies an app account; Web3Auth and injected Solana
 * wallets additionally provide a real blockchain account/address.
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
  emailWalletSecretKey: string | null;
  walletLocked: boolean;
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
  setEmailPasswordSession: (email: string, address?: string | null) => void;
  /**
   * Persist an unlocked Cyclos email-wallet session after the vault decrypts.
   */
  setEmailWalletSession: (
    email: string,
    address: string,
    secretKeyBase64: string,
  ) => void;
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
  emailWalletSecretKey: null,
  walletLocked: false,
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

  if (
    /invalid auth connection|authconnectionconfig|auth connection config|auth connection|failed to login with auth|login with auth|verifier|aggregate verifier|auth.*not.*enabled/i.test(
      message,
    )
  ) {
    return "Web3Auth login is not fully enabled for this project. In the Web3Auth dashboard, enable Google and Email Passwordless for the Web platform, then add their auth connection IDs to the app environment.";
  }

  if (/web3auth_no_provider/i.test(message)) {
    return "Web3Auth did not return a wallet. Check that this project has Google or Email enabled and that the matching auth connection ID is configured.";
  }

  if (/wallet|not installed|not available|unsupported/i.test(message)) {
    return "This wallet is not available in the current browser. Try another option in the Web3Auth modal.";
  }

  if (isNetworkError(error) || appError.code === "TIMEOUT") {
    return "The network is taking longer than expected. Please check your connection and try again.";
  }

  if (/client.?id|whitelist|origin|domain|redirect|forbidden|unauthori|not allowed|access denied|localhost|validate redirect/i.test(message)) {
    return "Web3Auth is not configured for this app URL. Add http://localhost:3000 and https://cyclos-hryvnia.vercel.app to the Web3Auth dashboard domain whitelist.";
  }

  if (/init parameters not found|storage|session|empty hash|query parameters|reload/i.test(message)) {
    return "The Web3Auth login session expired before the redirect finished. Start sign-in again from this page.";
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

  setEmailPasswordSession: (email, address = null) => {
    set({
      address,
      email,
      emailWalletSecretKey: null,
      walletLocked: Boolean(address),
      connected: true,
      provider: "email",
      connectorName: "email-code",
      loading: false,
      error: null,
    });
  },

  setEmailWalletSession: (email, address, secretKeyBase64) => {
    set({
      address,
      email,
      emailWalletSecretKey: secretKeyBase64,
      walletLocked: false,
      connected: true,
      provider: "email",
      connectorName: "email-vault",
      loading: false,
      error: null,
    });
  },

  setWeb3AuthSession: (address, connectorName = null) => {
    set({
      address,
      email: null,
      emailWalletSecretKey: null,
      walletLocked: false,
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
      emailWalletSecretKey: null,
      walletLocked: false,
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

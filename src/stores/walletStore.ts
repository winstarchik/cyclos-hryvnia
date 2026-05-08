import { create } from "zustand";
import { devtools, persist, createJSONStorage } from "zustand/middleware";

/**
 * Wallet provider options supported by the app.
 */
export type WalletProvider = "magic" | "phantom" | null;

/**
 * Complete wallet store shape.
 */
export interface WalletStoreType {
  address: string | null;
  connected: boolean;
  provider: WalletProvider;
  /**
   * Tracks which email was used for Magic Link login.
   * This improves UX (prefill + awareness) but is not sensitive by itself.
   */
  magicEmail: string | null;
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
   * Connect via Magic link (email-based).
   *
   * Flow:
   * - Login with Magic Link (email)
   * - Read the connected Solana account address
   *
   * Persisted fields (for UX): address/provider/magicEmail so the user stays "recognized".
   * Reconnection: user can click "Connect" again to re-establish SDK session if needed.
   */
  connectMagic: (email: string) => Promise<void>;

  /**
   * Connect via Phantom wallet.
   *
   * Phantom requires the browser extension and works on desktop web.
   */
  connectPhantom: () => Promise<void>;

  /**
   * Disconnect and clear wallet session.
   */
  disconnect: () => Promise<void>;

  /**
   * Clear the current error message.
   */
  clearError: () => void;
}

export type WalletStore = WalletStoreType & WalletStoreActions;

const initialState: WalletStoreType = {
  address: null,
  connected: false,
  provider: null,
  magicEmail: null,
  loading: false,
  error: null,
};

const storage =
  typeof window === "undefined"
    ? undefined
    : createJSONStorage(() => window.localStorage);

export const useWalletStore = create<WalletStore>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        connectMagic: async (email) => {
          set({ loading: true, error: null }, false, "wallet/loading");
          try {
            // Wallet SDKs are loaded on demand to keep the initial app shell lean.
            const magic = await import("@/lib/magic");

            // Ensure only one provider is active at a time.
            if (get().provider === "phantom") {
              const { disconnectPhantom } = await import("@/lib/phantom");
              await disconnectPhantom();
            }

            await magic.loginWithMagic(email);
            const address = await magic.getMagicWallet();

            set(
              {
                address,
                connected: true,
                provider: "magic",
                magicEmail: email,
                loading: false,
                error: null,
              },
              false,
              "wallet/connectMagic",
            );
          } catch (e) {
            const message =
              e instanceof Error ? e.message : "Unable to connect with Magic Link.";
            set(
              { loading: false, error: message, connected: false },
              false,
              "wallet/connectMagicError",
            );
          }
        },

        connectPhantom: async () => {
          // Phantom helpers are only needed once the user actively connects.
          const phantom = await import("@/lib/phantom");

          if (!phantom.isPhantomInstalled()) {
            set(
              {
                error:
                  "Phantom wallet is not installed. Please install the Phantom browser extension.",
              },
              false,
              "wallet/phantomNotInstalled",
            );
            return;
          }

          set({ loading: true, error: null }, false, "wallet/loading");
          try {
            // Ensure only one provider is active at a time.
            if (get().provider === "magic") {
              const { logout: magicLogout } = await import("@/lib/magic");
              await magicLogout();
            }

            const address = await phantom.connectPhantom();
            set(
              {
                address,
                connected: true,
                provider: "phantom",
                magicEmail: null,
                loading: false,
                error: null,
              },
              false,
              "wallet/connectPhantom",
            );
          } catch (e) {
            const message =
              e instanceof Error ? e.message : "Unable to connect to Phantom.";
            set(
              { loading: false, error: message, connected: false },
              false,
              "wallet/connectPhantomError",
            );
          }
        },

        disconnect: async () => {
          const provider = get().provider;
          try {
            if (provider === "magic") {
              const { logout: magicLogout } = await import("@/lib/magic");
              await magicLogout();
            }
            if (provider === "phantom") {
              const { disconnectPhantom } = await import("@/lib/phantom");
              await disconnectPhantom();
            }
          } finally {
            set({ ...initialState }, false, "wallet/disconnect");
          }
        },

        clearError: () => set({ error: null }, false, "wallet/clearError"),
      }),
      {
        /**
         * We persist address/provider for UX:
         * - the UI can show the last connected wallet immediately
         * - the user feels "still logged in"
         *
         * We do NOT persist magicEmail/loading/error because they are personal
         * or ephemeral UI state.
         */
        name: "cyclos-wallet-store",
        version: 1,
        storage,
        partialize: (state) => ({
          address: state.address,
          provider: state.provider,
        }),
      },
    ),
    { name: "cyclos-wallet-store" },
  ),
);


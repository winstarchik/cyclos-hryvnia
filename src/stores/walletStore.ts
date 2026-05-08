import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { handleError, isNetworkError, logDevError } from "@/lib/errors";

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

function getWalletErrorMessage(
  provider: Exclude<WalletProvider, null>,
  error: unknown,
): string {
  const appError = handleError(error);
  const message = appError.message;

  if (/reject|denied|declined|cancel/i.test(message)) {
    return "Connection was cancelled. You can try again when you are ready.";
  }

  if (isNetworkError(error) || appError.code === "TIMEOUT") {
    return "The network is taking longer than expected. Please check your connection and try again.";
  }

  if (provider === "magic") {
    return "We could not connect with Magic Link. Please check your email and try again.";
  }

  return "We could not connect to Phantom. Please check your wallet and try again.";
}

export const useWalletStore = create<WalletStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      connectMagic: async (email) => {
        set({ loading: true, error: null });
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

          set({
            address,
            connected: true,
            provider: "magic",
            magicEmail: email,
            loading: false,
            error: null,
          });
        } catch (error) {
          logDevError("[wallet] Magic connection failed", error);
          set({
            loading: false,
            error: getWalletErrorMessage("magic", error),
            connected: false,
          });
        }
      },

      connectPhantom: async () => {
        set({ loading: true, error: null });

        try {
          // Phantom helpers are only needed once the user actively connects.
          const phantom = await import("@/lib/phantom");

          if (!phantom.isPhantomInstalled()) {
            set({
              loading: false,
              error:
                "Phantom is not installed. Please install Phantom and try again.",
            });
            return;
          }

          // Ensure only one provider is active at a time.
          if (get().provider === "magic") {
            const { logout: magicLogout } = await import("@/lib/magic");
            await magicLogout();
          }

          const address = await phantom.connectPhantom();
          set({
            address,
            connected: true,
            provider: "phantom",
            magicEmail: null,
            loading: false,
            error: null,
          });
        } catch (error) {
          logDevError("[wallet] Phantom connection failed", error);
          set({
            loading: false,
            error: getWalletErrorMessage("phantom", error),
            connected: false,
          });
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
        } catch (error) {
          logDevError("[wallet] Disconnect cleanup failed", error);
        } finally {
          set({ ...initialState });
        }
      },

      clearError: () => set({ error: null }),
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
);

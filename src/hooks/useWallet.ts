"use client";

import { useCallback, useEffect } from "react";
import {
  AUTH_CONNECTION,
  WALLET_CONNECTORS,
} from "@web3auth/modal";
import {
  useWeb3AuthConnect,
  useWeb3AuthDisconnect,
} from "@web3auth/modal/react";
import { useSolanaWallet } from "@web3auth/modal/react/solana";
import { WEB3AUTH_AUTH_CONNECTION_ID, hasWeb3AuthClientId } from "@/lib/env";
import {
  INJECTED_SOLANA_WALLET_NOT_FOUND,
  getInjectedSolanaWallet,
} from "@/lib/injectedSolana";
import {
  getWeb3AuthUserMessage,
  useWalletStore,
  type WalletStore,
} from "@/stores/walletStore";

export type SocialLoginProvider = "google";

let hasAttemptedEmailSessionRestore = false;

const SOCIAL_AUTH_CONNECTIONS = {
  google: AUTH_CONNECTION.GOOGLE,
} as const satisfies Record<
  SocialLoginProvider,
  (typeof AUTH_CONNECTION)[keyof typeof AUTH_CONNECTION]
>;

export type UseWalletResult = Pick<
  WalletStore,
  | "address"
  | "email"
  | "connected"
  | "provider"
  | "connectorName"
  | "loading"
  | "error"
  | "clearError"
> & {
  /**
   * Opens Web3Auth for supported social wallet login.
   */
  connectWallet: () => Promise<void>;
  /**
   * Starts a direct Web3Auth social login flow.
   */
  connectSocial: (
    provider: SocialLoginProvider,
    loginHint?: string,
  ) => Promise<void>;
  connectGoogle: () => Promise<void>;
  setEmailPasswordSession: (email: string) => void;
  /**
   * Connects an installed Solana wallet such as Phantom or Solflare.
   */
  connectExternalWallet: () => Promise<void>;
  /**
   * Backwards-compatible alias for components that still use the older name.
   */
  connectWeb3Auth: () => Promise<void>;
  disconnect: () => Promise<void>;
  solanaWallet: ReturnType<typeof useSolanaWallet>["solanaWallet"];
  connection: ReturnType<typeof useSolanaWallet>["connection"];
};

/**
 * Thin React hook for accessing wallet state and connection actions.
 *
 * @example
 * ```tsx
 * const { address, connected, connectWallet } = useWallet();
 *
 * if (connected) {
 *   return <p>Connected to {address}</p>;
 * }
 *
 * return <button onClick={connectWallet}>Connect Wallet</button>;
 * ```
 */
export function useWallet(): UseWalletResult {
  const address = useWalletStore((state) => state.address);
  const email = useWalletStore((state) => state.email);
  const connected = useWalletStore((state) => state.connected);
  const provider = useWalletStore((state) => state.provider);
  const connectorName = useWalletStore((state) => state.connectorName);
  const loading = useWalletStore((state) => state.loading);
  const error = useWalletStore((state) => state.error);
  const setWeb3AuthSession = useWalletStore((state) => state.setWeb3AuthSession);
  const setEmailPasswordSession = useWalletStore(
    (state) => state.setEmailPasswordSession,
  );
  const setInjectedWalletSession = useWalletStore(
    (state) => state.setInjectedWalletSession,
  );
  const setLoading = useWalletStore((state) => state.setLoading);
  const setError = useWalletStore((state) => state.setError);
  const disconnectStore = useWalletStore((state) => state.disconnect);
  const clearError = useWalletStore((state) => state.clearError);

  const {
    connect,
    loading: web3AuthConnecting,
    error: web3AuthConnectError,
    connectorName: web3AuthConnectorName,
    connectTo,
  } = useWeb3AuthConnect();
  const {
    disconnect: disconnectWeb3Auth,
    loading: web3AuthDisconnecting,
    error: web3AuthDisconnectError,
  } = useWeb3AuthDisconnect();
  const { accounts, solanaWallet, connection } = useSolanaWallet();

  useEffect(() => {
    if (connected || hasAttemptedEmailSessionRestore) {
      return;
    }

    hasAttemptedEmailSessionRestore = true;
    let isMounted = true;
    setLoading(true);

    async function restoreEmailSession() {
      try {
        const response = await fetch("/api/auth/session", {
          credentials: "include",
        });

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as {
          data?: { user?: { email?: string } };
        };
        const sessionEmail = payload.data?.user?.email;

        if (isMounted && sessionEmail) {
          setEmailPasswordSession(sessionEmail);
        }
      } catch {
        // A missing/expired session is not an app error; keep the user logged out.
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void restoreEmailSession();

    return () => {
      isMounted = false;
    };
  }, [connected, setEmailPasswordSession, setLoading]);

  useEffect(() => {
    const web3AuthAddress = accounts?.[0];
    if (web3AuthAddress) {
      setWeb3AuthSession(web3AuthAddress, web3AuthConnectorName);
    }
  }, [accounts, setWeb3AuthSession, web3AuthConnectorName]);

  useEffect(() => {
    const sdkError = web3AuthConnectError ?? web3AuthDisconnectError;
    if (sdkError) {
      setLoading(false);
      setError(getWeb3AuthUserMessage(sdkError));
    }
  }, [setError, setLoading, web3AuthConnectError, web3AuthDisconnectError]);

  const connectWithWeb3Auth = useCallback(
    async (action: () => Promise<unknown>) => {
      if (!hasWeb3AuthClientId()) {
        setError(
          "Web3Auth is not configured yet. Add NEXT_PUBLIC_WEB3AUTH_CLIENT_ID.",
        );
        return;
      }

      setLoading(true);
      setError(null);

      try {
        await action();
      } catch (web3AuthError) {
        setError(getWeb3AuthUserMessage(web3AuthError));
      } finally {
        setLoading(false);
      }
    },
    [setError, setLoading],
  );

  const connectWallet = useCallback(async () => {
    await connectWithWeb3Auth(() => connect());
  }, [connect, connectWithWeb3Auth]);

  const connectSocial = useCallback(
    async (socialProvider: SocialLoginProvider) => {
      await connectWithWeb3Auth(() =>
        connectTo(WALLET_CONNECTORS.AUTH, {
          authConnection: SOCIAL_AUTH_CONNECTIONS[socialProvider],
          ...(WEB3AUTH_AUTH_CONNECTION_ID
            ? { authConnectionId: WEB3AUTH_AUTH_CONNECTION_ID }
            : {}),
        }),
      );
    },
    [connectTo, connectWithWeb3Auth],
  );

  const connectGoogle = useCallback(async () => {
    await connectSocial("google");
  }, [connectSocial]);

  const connectExternalWallet = useCallback(async () => {
    const injectedWallet = getInjectedSolanaWallet();

    if (!injectedWallet) {
      setError(INJECTED_SOLANA_WALLET_NOT_FOUND);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await injectedWallet.provider.connect();
      setInjectedWalletSession(
        response.publicKey.toString(),
        injectedWallet.id,
      );
    } catch (walletError) {
      setError(getWeb3AuthUserMessage(walletError));
    } finally {
      setLoading(false);
    }
  }, [setError, setInjectedWalletSession, setLoading]);

  const disconnect = useCallback(async () => {
    if (provider === "email") {
      try {
        await fetch("/api/auth/session", {
          method: "DELETE",
          credentials: "include",
        });
      } catch {
        // Local store cleanup below still logs the user out in the browser.
      }
    }

    if (provider === "phantom" || provider === "solflare") {
      try {
        await getInjectedSolanaWallet()?.provider.disconnect?.();
      } catch (walletError) {
        setError(getWeb3AuthUserMessage(walletError));
      }
    }

    if (provider === "web3auth") {
      try {
        await disconnectWeb3Auth({ cleanup: true });
      } catch (web3AuthError) {
        setError(getWeb3AuthUserMessage(web3AuthError));
      }
    }

    await disconnectStore();
  }, [disconnectStore, disconnectWeb3Auth, provider, setError]);

  return {
    address,
    email,
    connected,
    provider,
    connectorName,
    loading: loading || web3AuthConnecting || web3AuthDisconnecting,
    error,
    connectWallet,
    connectSocial,
    connectGoogle,
    setEmailPasswordSession,
    connectExternalWallet,
    connectWeb3Auth: connectWallet,
    disconnect,
    clearError,
    solanaWallet,
    connection,
  };
}

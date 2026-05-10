"use client";

import { useCallback, useEffect } from "react";
import type {
  Connection,
  Transaction as SolanaTransaction,
  VersionedTransaction,
} from "@solana/web3.js";
import {
  AUTH_CONNECTION,
  WALLET_CONNECTORS,
} from "@web3auth/modal";
import {
  useWeb3AuthConnect,
  useWeb3AuthDisconnect,
} from "@web3auth/modal/react";
import {
  useSignAndSendTransaction,
  useSolanaWallet,
} from "@web3auth/modal/react/solana";
import { WEB3AUTH_AUTH_CONNECTION_ID, hasWeb3AuthClientId } from "@/lib/env";
import { logDevError } from "@/lib/errors";
import {
  INJECTED_SOLANA_WALLET_NOT_FOUND,
  getInjectedSolanaWallet,
} from "@/lib/injectedSolana";
import {
  getWeb3AuthUserMessage,
  useWalletStore,
  type WalletStore,
} from "@/stores/walletStore";

export type SocialLoginProvider = "google" | "email";

let hasAttemptedEmailSessionRestore = false;

const SOCIAL_AUTH_CONNECTIONS = {
  email: AUTH_CONNECTION.EMAIL_PASSWORDLESS,
  google: AUTH_CONNECTION.GOOGLE,
} as const satisfies Record<
  SocialLoginProvider,
  (typeof AUTH_CONNECTION)[keyof typeof AUTH_CONNECTION]
>;

const WEB3AUTH_CONNECT_TIMEOUT_MS = 30_000;

function openWeb3AuthWalletPicker() {
  if (typeof window === "undefined") return;

  let attempts = 0;
  const intervalId = window.setInterval(() => {
    attempts += 1;

    const arrow = document.getElementById("external-wallet-arrow");
    const arrowButton = arrow?.closest("button");
    const textButton = Array.from(document.querySelectorAll("button")).find(
      (button) => /all wallets|connect wallet/i.test(button.textContent ?? ""),
    );
    const walletButton = arrowButton ?? textButton;

    if (walletButton) {
      walletButton.click();
      window.clearInterval(intervalId);
      return;
    }

    if (attempts >= 50) {
      window.clearInterval(intervalId);
    }
  }, 100);
}

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
  connectEmail: (loginHint?: string) => Promise<void>;
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
  sendTransaction: (
    transaction: SolanaTransaction | VersionedTransaction,
    connection: Connection,
  ) => Promise<string>;
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
  const { signAndSendTransaction } = useSignAndSendTransaction();

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
      logDevError("[wallet] Web3Auth SDK error", sdkError);
      setError(getWeb3AuthUserMessage(sdkError));
    }
  }, [setError, setLoading, web3AuthConnectError, web3AuthDisconnectError]);

  const connectWithWeb3Auth = useCallback(
    async (
      action: () => Promise<unknown>,
      options: { timeoutMs?: number | null } = {
        timeoutMs: WEB3AUTH_CONNECT_TIMEOUT_MS,
      },
    ) => {
      if (!hasWeb3AuthClientId()) {
        setError(
          "Web3Auth is not configured yet. Add NEXT_PUBLIC_WEB3AUTH_CLIENT_ID.",
        );
        return;
      }

      setLoading(true);
      setError(null);

      let timeoutId: number | null = null;

      try {
        if (options.timeoutMs) {
          await Promise.race([
            action(),
            new Promise((_, reject) => {
              timeoutId = window.setTimeout(() => {
                reject(new Error("WEB3AUTH_CONNECT_TIMEOUT"));
              }, options.timeoutMs ?? WEB3AUTH_CONNECT_TIMEOUT_MS);
            }),
          ]);
        } else {
          await action();
        }
      } catch (web3AuthError) {
        if (
          web3AuthError instanceof Error &&
          web3AuthError.message === "WEB3AUTH_CONNECT_TIMEOUT"
        ) {
          setError(
            "Google sign-in is taking longer than expected. Please try again or use email registration.",
          );
        } else {
          logDevError("[wallet] Web3Auth connect failed", web3AuthError);
          setError(getWeb3AuthUserMessage(web3AuthError));
        }
      } finally {
        if (timeoutId) {
          window.clearTimeout(timeoutId);
        }
        setLoading(false);
      }
    },
    [setError, setLoading],
  );

  const connectWallet = useCallback(async () => {
    await connectWithWeb3Auth(
      async () => {
        openWeb3AuthWalletPicker();
        return connect();
      },
      { timeoutMs: null },
    );
  }, [connect, connectWithWeb3Auth]);

  const connectSocial = useCallback(
    async (socialProvider: SocialLoginProvider, loginHint?: string) => {
      await connectWithWeb3Auth(() =>
        connectTo(WALLET_CONNECTORS.AUTH, {
          authConnection: SOCIAL_AUTH_CONNECTIONS[socialProvider],
          ...(WEB3AUTH_AUTH_CONNECTION_ID
            ? { authConnectionId: WEB3AUTH_AUTH_CONNECTION_ID }
            : {}),
          ...(loginHint
            ? {
                extraLoginOptions: { login_hint: loginHint },
                loginHint,
              }
            : {}),
        }),
      );
    },
    [connectTo, connectWithWeb3Auth],
  );

  const connectEmail = useCallback(
    async (loginHint?: string) => {
      await connectSocial("email", loginHint);
    },
    [connectSocial],
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

  const sendTransaction = useCallback(
    async (
      transaction: SolanaTransaction | VersionedTransaction,
      activeConnection: Connection,
    ): Promise<string> => {
      if (provider === "web3auth") {
        return signAndSendTransaction(
          transaction as Parameters<typeof signAndSendTransaction>[0],
        );
      }

      if (provider === "phantom" || provider === "solflare") {
        const injectedWallet = getInjectedSolanaWallet();

        if (!injectedWallet) {
          throw new Error(INJECTED_SOLANA_WALLET_NOT_FOUND);
        }

        if (injectedWallet.provider.signAndSendTransaction) {
          const result =
            await injectedWallet.provider.signAndSendTransaction(transaction);
          return typeof result === "string" ? result : result.signature;
        }

        if (injectedWallet.provider.signTransaction) {
          const signedTransaction =
            await injectedWallet.provider.signTransaction(transaction);
          return activeConnection.sendRawTransaction(
            signedTransaction.serialize(),
          );
        }
      }

      throw new Error("Connect a blockchain wallet before sending.");
    },
    [provider, signAndSendTransaction],
  );

  return {
    address,
    email,
    connected,
    provider,
    connectorName,
    loading: loading || web3AuthDisconnecting,
    error,
    connectWallet,
    connectSocial,
    connectEmail,
    connectGoogle,
    setEmailPasswordSession,
    connectExternalWallet,
    connectWeb3Auth: connectWallet,
    sendTransaction,
    disconnect,
    clearError,
    solanaWallet,
    connection,
  };
}

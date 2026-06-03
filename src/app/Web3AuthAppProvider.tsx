"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { Web3AuthProvider, useWeb3Auth } from "@web3auth/modal/react";
import { useSolanaWallet } from "@web3auth/modal/react/solana";
import { web3AuthContextConfig } from "@/lib/web3auth";
import { useWalletStore } from "@/stores/walletStore";

interface Web3AuthAppProviderProps {
  children: ReactNode;
}

const SUPPORTED_LOCALES = new Set(["en", "ua", "ru"]);
const CALLBACK_TIMEOUT_MS = 15_000;

function getLocaleFromPath(pathname: string | null) {
  const [locale] = (pathname ?? "").split("/").filter(Boolean);
  return SUPPORTED_LOCALES.has(locale) ? locale : "ua";
}

function hasWeb3AuthCallbackHash() {
  if (typeof window === "undefined") return false;

  const hash = window.location.hash;
  if (!hash) return false;

  return /(?:^#|&)b64Params=|(?:^#|&)id_token=|(?:^#|&)access_token=|(?:^#|&)state=/i.test(
    hash,
  );
}

function clearCallbackHash() {
  if (typeof window === "undefined" || !window.location.hash) return;

  window.history.replaceState(
    window.history.state,
    document.title,
    `${window.location.pathname}${window.location.search}`,
  );
}

async function getProviderAccount(provider: unknown): Promise<string | null> {
  const request =
    typeof provider === "object" &&
    provider !== null &&
    "request" in provider &&
    typeof provider.request === "function"
      ? provider.request.bind(provider)
      : null;

  if (!request) return null;

  const methods = [
    "getAccounts",
    "solana_getAccounts",
    "solana_requestAccounts",
  ];

  for (const method of methods) {
    try {
      const response = (await request({ method })) as unknown;
      const [address] = Array.isArray(response) ? response : [];

      if (typeof address === "string" && address.length > 20) {
        return address;
      }
    } catch {
      // Some providers only support a subset of account methods.
    }
  }

  return null;
}

function Web3AuthSessionBridge({ children }: Web3AuthAppProviderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { provider } = useWeb3Auth();
  const { accounts } = useSolanaWallet();
  const setWeb3AuthSession = useWalletStore((state) => state.setWeb3AuthSession);
  const setLoading = useWalletStore((state) => state.setLoading);
  const setError = useWalletStore((state) => state.setError);
  const connected = useWalletStore((state) => state.connected);
  const [isProcessingCallback, setIsProcessingCallback] = useState(false);
  const callbackTimeoutRef = useRef<number | null>(null);

  const locale = useMemo(() => getLocaleFromPath(pathname), [pathname]);

  useEffect(() => {
    if (!hasWeb3AuthCallbackHash()) return;

    setIsProcessingCallback(true);
    setLoading(true);
    setError(null);

    if (callbackTimeoutRef.current) {
      window.clearTimeout(callbackTimeoutRef.current);
    }

    callbackTimeoutRef.current = window.setTimeout(() => {
      setIsProcessingCallback(false);
      setLoading(false);
      setError(
        "Web3Auth returned to the app, but no wallet was created. Try email login or check that Google login and Embedded Wallets are enabled.",
      );
      clearCallbackHash();
      callbackTimeoutRef.current = null;
    }, CALLBACK_TIMEOUT_MS);

    return () => {
      if (callbackTimeoutRef.current) {
        window.clearTimeout(callbackTimeoutRef.current);
        callbackTimeoutRef.current = null;
      }
    };
  }, [setError, setLoading]);

  const completeWeb3AuthLogin = useCallback(
    (address: string) => {
      if (callbackTimeoutRef.current) {
        window.clearTimeout(callbackTimeoutRef.current);
        callbackTimeoutRef.current = null;
      }

      setWeb3AuthSession(address, "web3auth");
      setIsProcessingCallback(false);
      clearCallbackHash();

      if (pathname === `/${locale}` || hasWeb3AuthCallbackHash()) {
        router.replace(`/${locale}/wallet`);
      }
    },
    [locale, pathname, router, setWeb3AuthSession],
  );

  useEffect(() => {
    const address = accounts?.[0];
    if (!address) return;

    completeWeb3AuthLogin(address);
  }, [accounts, completeWeb3AuthLogin]);

  useEffect(() => {
    if (!isProcessingCallback || accounts?.[0]) return;

    let cancelled = false;

    async function resolveProviderAccount() {
      const address = await getProviderAccount(provider);
      if (!cancelled && address) {
        completeWeb3AuthLogin(address);
      }
    }

    void resolveProviderAccount();

    return () => {
      cancelled = true;
    };
  }, [accounts, completeWeb3AuthLogin, isProcessingCallback, provider]);

  useEffect(() => {
    if (connected && isProcessingCallback) {
      setIsProcessingCallback(false);
      setLoading(false);
    }
  }, [connected, isProcessingCallback, setLoading]);

  if (isProcessingCallback) {
    return (
      <main className="cy-page flex min-h-screen items-center justify-center px-6 text-center">
        <div className="cy-card-soft w-full max-w-sm p-6">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-accent-400/25 border-t-accent-400" />
          <h1 className="mt-4 text-xl font-semibold text-white">
            Finishing sign in
          </h1>
          <p className="mt-2 text-sm leading-6 text-gray-400">
            We are receiving your Web3Auth wallet. This usually takes a few seconds.
          </p>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}

export function Web3AuthAppProvider({ children }: Web3AuthAppProviderProps) {
  return (
    <Web3AuthProvider config={web3AuthContextConfig}>
      <Web3AuthSessionBridge>{children}</Web3AuthSessionBridge>
    </Web3AuthProvider>
  );
}

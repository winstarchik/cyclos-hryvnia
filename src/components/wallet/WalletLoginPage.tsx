"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/common/Button";
import { useWallet } from "@/hooks/useWallet";
import { hasWeb3AuthClientId } from "@/lib/env";
import { INJECTED_SOLANA_WALLET_NOT_FOUND } from "@/lib/injectedSolana";

type AuthAction = "google" | "wallet";
type AuthMode = "login" | "register";

function scheduleAllWalletsOpen() {
  const startedAt = Date.now();
  let timeoutId: number | null = null;
  let stopped = false;

  function findAllWalletsButton() {
    return Array.from(document.querySelectorAll("button")).find((button) =>
      button.textContent
        ?.replace(/\s+/g, " ")
        .trim()
        .toLowerCase()
        .includes("all wallets"),
    );
  }

  function tick() {
    if (stopped) return;

    const allWalletsButton = findAllWalletsButton();

    if (allWalletsButton instanceof HTMLButtonElement) {
      allWalletsButton.click();
      stopped = true;
      return;
    }

    if (Date.now() - startedAt < 8_000) {
      timeoutId = window.setTimeout(tick, 150);
    }
  }

  timeoutId = window.setTimeout(tick, 150);

  return () => {
    stopped = true;
    if (timeoutId) {
      window.clearTimeout(timeoutId);
    }
  };
}

function CUAHCoin() {
  return (
    <div
      aria-hidden="true"
      className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[radial-gradient(circle_at_35%_35%,#6b8fff,#2441a8)] shadow-[0_0_40px_rgba(65,105,225,0.45),0_0_80px_rgba(65,105,225,0.18)]"
    >
      <span className="text-4xl font-bold text-white">₴</span>
    </div>
  );
}

function WalletIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path
        d="M20 7.5v9A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5v-9A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
      <path
        d="M20 9h-4.5a2.5 2.5 0 0 0 0 5H20"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
      <path
        d="M15.5 11.5h.01"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.4"
      />
    </svg>
  );
}

function ProviderMark({ children }: { children: string }) {
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-sm font-bold text-dark-950">
      {children}
    </span>
  );
}

export function WalletLoginPage() {
  const t = useTranslations("onboarding");
  const common = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const {
    connectGoogle,
    connectWallet,
    connected,
    loading: walletLoading,
    error: walletError,
    clearError,
  } = useWallet();

  const errorId = useId();
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [loadingAction, setLoadingAction] = useState<AuthAction | null>(null);
  const [localErrorKey, setLocalErrorKey] = useState<string | null>(null);
  const [showSlowConnection, setShowSlowConnection] = useState(false);
  const web3AuthConfigured = hasWeb3AuthClientId();
  const isConnecting = Boolean(loadingAction) || walletLoading;
  const isWalletModalActive = loadingAction === "wallet";
  const visibleErrorMessage = localErrorKey
    ? t(localErrorKey)
    : walletError === INJECTED_SOLANA_WALLET_NOT_FOUND
      ? t("solanaWalletNotFound")
      : walletError;

  useEffect(() => {
    if (connected) {
      router.replace(`/${locale}/wallet`);
    }
  }, [connected, locale, router]);

  useEffect(() => {
    if (!isConnecting) {
      setShowSlowConnection(false);
      return;
    }

    const timeoutId = window.setTimeout(() => setShowSlowConnection(true), 10_000);
    return () => window.clearTimeout(timeoutId);
  }, [isConnecting]);

  async function runAuthAction(
    action: AuthAction,
    connectAction: () => Promise<void>,
  ) {
    if (action === "google" && !web3AuthConfigured) {
      clearError();
      setLocalErrorKey("web3AuthConfigError");
      return;
    }

    setLoadingAction(action);
    setLocalErrorKey(null);
    clearError();

    const stopAllWalletsOpen =
      action === "wallet" ? scheduleAllWalletsOpen() : null;

    try {
      await connectAction();
    } finally {
      stopAllWalletsOpen?.();
      setLoadingAction(null);
    }
  }

  return (
    <main className="relative flex min-h-screen overflow-hidden bg-dark-950 px-4 py-8 text-white sm:px-6">
      <div aria-hidden="true" className="animate-gradient-shift absolute inset-0" />

      <div className="relative z-10 flex w-full flex-1 items-center justify-center pb-[max(env(safe-area-inset-bottom),2rem)] pt-[max(env(safe-area-inset-top),2rem)]">
        {!isWalletModalActive ? (
        <section className="animate-fade-in-up w-full max-w-sm transition-opacity duration-200">
          <div className="mb-7 text-center">
            <CUAHCoin />
            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-accent-400">
              {t("eyebrow")}
            </p>
            <h1 className="mt-3 text-4xl font-bold leading-tight text-white">
              {t("title")}
            </h1>
            <p className="mt-3 text-base leading-7 text-gray-400">
              {t("subtitle")}
            </p>
          </div>

          <div className="cy-card-soft p-4 sm:p-5">
            <div className="grid grid-cols-2 gap-2 rounded-2xl border border-dark-800 bg-dark-950/70 p-1">
              {(["login", "register"] as const).map((mode) => (
                <button
                  aria-pressed={authMode === mode}
                  className={`min-h-11 rounded-xl text-sm font-semibold transition ${
                    authMode === mode
                      ? "bg-accent-500 text-white shadow-lg shadow-accent-600/20"
                      : "text-gray-400 hover:bg-dark-900 hover:text-white"
                  }`}
                  disabled={isConnecting}
                  key={mode}
                  onClick={() => {
                    setAuthMode(mode);
                    setLocalErrorKey(null);
                    clearError();
                  }}
                  type="button"
                >
                  {mode === "login" ? t("login") : t("register")}
                </button>
              ))}
            </div>

            <p className="mt-5 text-sm leading-6 text-gray-400">
              {authMode === "login" ? t("loginHint") : t("registerHint")}
            </p>

            <div className="mt-5 space-y-3" aria-busy={isConnecting} aria-live="polite">
              <Link
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-accent-500 to-accent-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-accent-600/20 transition hover:scale-[1.02] hover:from-accent-600 hover:to-accent-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-400/60 active:scale-[0.98] motion-reduce:transition-none"
                href={`/${locale}/email-login?mode=${authMode}`}
              >
                <ProviderMark>@</ProviderMark>
                {authMode === "login"
                  ? t("loginWithEmail")
                  : t("createAccountWithEmail")}
              </Link>

              <div className="my-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                <span className="h-px flex-1 bg-dark-800" />
                <span>{common("or")}</span>
                <span className="h-px flex-1 bg-dark-800" />
              </div>

              <Button
                className="h-12 rounded-2xl text-sm"
                disabled={isConnecting}
                fullWidth
                isLoading={loadingAction === "google"}
                loadingText={common("connecting")}
                onClick={() => runAuthAction("google", connectGoogle)}
                size="md"
                type="button"
                variant="secondary"
              >
                <ProviderMark>G</ProviderMark>
                {t("continueWithGoogle")}
              </Button>

              <Button
                className="h-12 rounded-2xl text-sm"
                disabled={isConnecting}
                fullWidth
                isLoading={false}
                loadingText={common("connecting")}
                onClick={() => runAuthAction("wallet", connectWallet)}
                size="md"
                type="button"
                variant="secondary"
              >
                <WalletIcon />
                {t("connectExternalWallet")}
              </Button>
            </div>

            {!web3AuthConfigured ? (
              <p className="mt-4 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm leading-6 text-amber-100">
                {t("web3AuthConfigError")}
              </p>
            ) : null}

            {showSlowConnection ? (
              <p
                className="mt-4 rounded-2xl border border-accent-500/25 bg-accent-500/10 px-4 py-3 text-sm leading-6 text-accent-100"
                role="status"
              >
                {common("takingLonger")}
              </p>
            ) : null}

            {visibleErrorMessage ? (
              <p
                className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-200"
                id={errorId}
                role="alert"
              >
                {visibleErrorMessage}
              </p>
            ) : null}

            <p className="mt-5 text-center text-xs leading-5 text-gray-500">
              {t("termsDisclaimer")}
            </p>
          </div>
        </section>
        ) : null}
      </div>
    </main>
  );
}

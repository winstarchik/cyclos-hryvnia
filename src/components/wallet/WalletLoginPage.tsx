"use client";

import { type FormEvent, useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/common/Button";
import { hasMagicPublishableKey } from "@/lib/env";
import { useWallet } from "@/hooks/useWallet";

type LoadingProvider = "magic" | "phantom" | null;

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

function PhantomLogo() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 128 128">
      <rect fill="#AB9FF2" height="128" rx="32" width="128" />
      <path
        d="M110.584 64.914H99.142C99.142 41.765 80.173 23 56.75 23 33.622 23 14.816 41.395 14.42 64.217 14.01 87.757 35.422 108 59.387 108h3.783c21.126 0 49.945-16.215 54.117-35.953.752-3.551-2.166-7.133-6.703-7.133Z"
        fill="white"
      />
      <ellipse cx="79.002" cy="55.479" fill="#AB9FF2" rx="6.5" ry="9.5" />
      <ellipse cx="54.002" cy="55.479" fill="#AB9FF2" rx="6.5" ry="9.5" />
    </svg>
  );
}

export function WalletLoginPage() {
  const t = useTranslations("onboarding");
  const common = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const {
    connectMagic,
    connectPhantom,
    connected,
    provider,
    loading: walletLoading,
    error: walletError,
    clearError,
  } = useWallet();

  const emailId = useId();
  const errorId = useId();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState<LoadingProvider>(null);
  const [localErrorKey, setLocalErrorKey] = useState<string | null>(null);
  const [lastAttempt, setLastAttempt] = useState<LoadingProvider>(null);
  const [showSlowConnection, setShowSlowConnection] = useState(false);
  const magicConfigured = hasMagicPublishableKey();

  const isConnecting = loading || walletLoading;
  const visibleErrorKey =
    localErrorKey ??
    (walletError
      ? lastAttempt === "phantom"
        ? "phantomError"
        : "magicError"
      : null);

  useEffect(() => {
    if (connected && provider === "magic") {
      setEmail("");
    }
  }, [connected, provider]);

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

  async function handleMagicLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!email.trim()) {
      clearError();
      setLocalErrorKey("emailRequired");
      return;
    }

    if (!magicConfigured) {
      clearError();
      setLocalErrorKey("magicConfigError");
      return;
    }

    setLoading(true);
    setLoadingProvider("magic");
    setLastAttempt("magic");
    setLocalErrorKey(null);
    clearError();

    try {
      await connectMagic(email.trim());
    } finally {
      setLoading(false);
      setLoadingProvider(null);
    }
  }

  async function handlePhantomConnect() {
    setLoading(true);
    setLoadingProvider("phantom");
    setLastAttempt("phantom");
    setLocalErrorKey(null);
    clearError();

    try {
      await connectPhantom();
    } finally {
      setLoading(false);
      setLoadingProvider(null);
    }
  }

  return (
    <main className="relative flex min-h-screen overflow-hidden bg-dark-950 px-4 py-8 text-white sm:px-6">
      <div
        aria-hidden="true"
        className="animate-gradient-shift absolute inset-0"
      />

      <div className="relative z-10 flex w-full flex-1 items-center justify-center pb-[max(env(safe-area-inset-bottom),2rem)] pt-[max(env(safe-area-inset-top),2rem)]">
        <section className="animate-fade-in-up w-full max-w-sm">
          <div className="mb-8 text-center">
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

          <div className="cy-card-soft p-5 sm:p-6">
            <form
              aria-busy={isConnecting}
              aria-live="polite"
              className="space-y-4"
              onSubmit={handleMagicLogin}
            >
              <div className="space-y-2">
                <label
                  className="block text-sm font-medium text-gray-300"
                  htmlFor={emailId}
                >
                  {t("emailLabel")}
                </label>
                <input
                  id={emailId}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder={t("emailPlaceholder")}
                  aria-invalid={Boolean(visibleErrorKey)}
                  aria-describedby={visibleErrorKey ? errorId : undefined}
                  className="cy-input"
                disabled={isConnecting}
              />
            </div>

              <Button
                className="h-12 rounded-2xl text-sm shadow-lg shadow-accent-600/20 hover:scale-[1.02] disabled:hover:scale-100"
                disabled={isConnecting}
                fullWidth
                isLoading={loadingProvider === "magic"}
                loadingText={common("connecting")}
                size="md"
                type="submit"
              >
                {t("continueWithGmail")}
              </Button>
            </form>

            {!magicConfigured ? (
              <p className="mt-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm leading-6 text-amber-100">
                {t("magicConfigError")}
              </p>
            ) : null}

            <div className="my-6 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
              <span className="h-px flex-1 bg-dark-800" />
              <span>{common("or")}</span>
              <span className="h-px flex-1 bg-dark-800" />
            </div>

            <Button
              className="h-12 rounded-2xl border border-[#AB9FF2]/25 bg-[#AB9FF2]/15 text-sm text-[#f0edff] shadow-lg shadow-purple-900/20 hover:bg-[#AB9FF2]/20 hover:scale-[1.02] focus-visible:ring-purple-300/70 disabled:hover:scale-100"
              onClick={handlePhantomConnect}
              disabled={isConnecting}
              fullWidth
              isLoading={loadingProvider === "phantom"}
              loadingText={common("connecting")}
              size="md"
              type="button"
              variant="secondary"
            >
              <PhantomLogo />
              {t("connectPhantom")}
            </Button>

            {showSlowConnection ? (
              <p
                className="mt-4 rounded-2xl border border-accent-500/25 bg-accent-500/10 px-4 py-3 text-sm leading-6 text-accent-100"
                role="status"
              >
                {common("takingLonger")}
              </p>
            ) : null}

            {visibleErrorKey ? (
              <p
                id={errorId}
                role="alert"
                className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-200"
              >
                {t(visibleErrorKey)}
              </p>
            ) : null}

            <p className="mt-5 text-center text-xs leading-5 text-gray-500">
              {t("termsDisclaimer")}
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

"use client";

import { type FormEvent, useEffect, useId, useState } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { useWallet } from "@/hooks/useWallet";

type LoadingProvider = "magic" | "phantom" | null;

export function WalletLoginPage() {
  const t = useTranslations("onboarding");
  const common = useTranslations("common");
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

  async function handleMagicLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!email.trim()) {
      clearError();
      setLocalErrorKey("emailRequired");
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
      <motion.div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-b from-dark-950 to-dark-900"
        animate={{
          background: [
            "radial-gradient(circle at 20% 20%, rgba(0,153,255,0.28), transparent 34%), linear-gradient(180deg, rgb(5,7,18), rgb(10,14,39))",
            "radial-gradient(circle at 80% 30%, rgba(147,51,234,0.28), transparent 36%), linear-gradient(180deg, rgb(5,7,18), rgb(10,14,39))",
            "radial-gradient(circle at 50% 80%, rgba(0,212,255,0.22), transparent 38%), linear-gradient(180deg, rgb(5,7,18), rgb(10,14,39))",
          ],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          repeatType: "mirror",
          ease: "easeInOut",
        }}
      />

      <div className="relative z-10 flex w-full flex-1 items-center justify-center pb-[max(env(safe-area-inset-bottom),2rem)] pt-[max(env(safe-area-inset-top),2rem)]">
        <motion.section
          className="w-full max-w-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        >
          <div className="mb-8 text-center">
            <p className="gradient-text text-sm font-semibold uppercase tracking-[0.18em]">
              {t("eyebrow")}
            </p>
            <h1 className="mt-4 text-4xl font-semibold leading-tight text-white">
              {t("title")}
            </h1>
            <p className="mt-3 text-base leading-7 text-gray-400">
              {t("subtitle")}
            </p>
          </div>

          <div className="rounded-3xl border border-dark-800 bg-dark-900/50 p-5 shadow-2xl shadow-black/30 backdrop-blur-md sm:p-6">
            <form className="space-y-4" onSubmit={handleMagicLogin}>
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
                  className="h-12 w-full rounded-2xl border border-dark-700 bg-dark-950 px-4 text-base text-white outline-none transition placeholder:text-gray-500 focus:border-accent-500 focus:ring-2 focus:ring-accent-500/25"
                  disabled={isConnecting}
                />
              </div>

              <motion.button
                type="submit"
                className="flex h-12 w-full items-center justify-center rounded-2xl bg-gradient-to-r from-accent-500 to-accent-600 px-4 text-sm font-semibold text-white shadow-lg shadow-accent-600/20 outline-none transition focus:ring-2 focus:ring-accent-400/60 disabled:cursor-not-allowed disabled:opacity-60"
                whileHover={isConnecting ? undefined : { scale: 1.02 }}
                whileTap={isConnecting ? undefined : { scale: 0.98 }}
                disabled={isConnecting}
              >
                {loadingProvider === "magic"
                  ? common("loading")
                  : t("continueButton")}
              </motion.button>
            </form>

            <div className="my-6 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
              <span className="h-px flex-1 bg-dark-800" />
              <span>{common("or")}</span>
              <span className="h-px flex-1 bg-dark-800" />
            </div>

            <motion.button
              type="button"
              className="flex h-12 w-full items-center justify-center rounded-2xl bg-purple-600 px-4 text-sm font-semibold text-white shadow-lg shadow-purple-900/25 outline-none transition hover:bg-purple-500 focus:ring-2 focus:ring-purple-300/70 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={handlePhantomConnect}
              whileHover={isConnecting ? undefined : { scale: 1.02 }}
              whileTap={isConnecting ? undefined : { scale: 0.98 }}
              disabled={isConnecting}
            >
              {loadingProvider === "phantom"
                ? common("loading")
                : t("connectPhantom")}
            </motion.button>

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
        </motion.section>
      </div>
    </main>
  );
}


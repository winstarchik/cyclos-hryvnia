"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/common/Button";

interface ApiResponse {
  status: "ok" | "error";
  error?: string;
}

function normalizeError(payload: ApiResponse) {
  if (payload.error === "RATE_LIMITED") return "tooManyAttempts";
  if (payload.error === "INVALID_EMAIL") return "emailRequired";
  return "passwordResetSendError";
}

export default function ForgotPasswordPage() {
  const t = useTranslations("onboarding");
  const common = useTranslations("common");
  const locale = useLocale();
  const emailInputId = useId();
  const errorId = useId();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [localErrorKey, setLocalErrorKey] = useState<string | null>(null);

  async function sendResetLink() {
    const trimmedEmail = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setLocalErrorKey("emailRequired");
      return;
    }

    setIsLoading(true);
    setLocalErrorKey(null);

    try {
      const response = await fetch("/api/auth/password/forgot", {
        body: JSON.stringify({ email: trimmedEmail, locale }),
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const payload = (await response.json().catch(() => ({}))) as ApiResponse;

      if (!response.ok) {
        setLocalErrorKey(normalizeError(payload));
        return;
      }

      setIsSent(true);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen overflow-hidden bg-dark-950 px-4 py-8 text-white sm:px-6">
      <div aria-hidden="true" className="animate-gradient-shift absolute inset-0" />
      <div className="relative z-10 flex w-full flex-1 items-center justify-center pb-[max(env(safe-area-inset-bottom),2rem)] pt-[max(env(safe-area-inset-top),2rem)]">
        <section className="animate-fade-in-up w-full max-w-sm">
          <div className="mb-6 text-center">
            <h1 className="text-3xl font-bold leading-tight text-white">
              {t("forgotPasswordTitle")}
            </h1>
            <p className="mt-3 text-sm leading-6 text-gray-400">
              {isSent ? t("passwordResetSent") : t("forgotPasswordHint")}
            </p>
          </div>

          <div className="cy-card-soft p-4 sm:p-5">
            {!isSent ? (
              <div className="space-y-3" aria-busy={isLoading} aria-live="polite">
                <label
                  className="block text-xs font-semibold uppercase tracking-[0.16em] text-gray-500"
                  htmlFor={emailInputId}
                >
                  {t("emailAddress")}
                </label>
                <input
                  aria-describedby={localErrorKey ? errorId : undefined}
                  aria-invalid={localErrorKey === "emailRequired"}
                  autoComplete="email"
                  autoFocus
                  className="input-base min-h-12 w-full"
                  disabled={isLoading}
                  id={emailInputId}
                  inputMode="email"
                  onChange={(event) => {
                    setEmail(event.target.value);
                    if (localErrorKey === "emailRequired") setLocalErrorKey(null);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !isLoading) {
                      void sendResetLink();
                    }
                  }}
                  placeholder={t("emailPlaceholder")}
                  type="email"
                  value={email}
                />
                <Button
                  className="h-12 rounded-2xl text-sm"
                  disabled={isLoading}
                  fullWidth
                  isLoading={isLoading}
                  loadingText={common("processing")}
                  onClick={sendResetLink}
                  size="md"
                  type="button"
                >
                  {t("sendResetLink")}
                </Button>
              </div>
            ) : (
              <Link
                className="inline-flex h-12 w-full items-center justify-center rounded-2xl border border-dark-700 bg-dark-800 px-6 py-3 text-sm font-semibold text-white transition hover:bg-dark-700"
                href={`/${locale}/email-login?mode=login`}
              >
                {t("backToLogin")}
              </Link>
            )}

            {localErrorKey ? (
              <p
                className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-200"
                id={errorId}
                role="alert"
              >
                {t(localErrorKey)}
              </p>
            ) : null}

            <div className="mt-5 text-center">
              <Link
                className="text-sm font-semibold text-gray-400 transition hover:text-white"
                href={`/${locale}/email-login?mode=login`}
              >
                {t("back")}
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/common/Button";
import { useWallet } from "@/hooks/useWallet";

type EmailStep = "email" | "code";

interface AuthApiResponse {
  status: "ok" | "error";
  error?: string;
  message?: string;
  data?: {
    maskedEmail?: string;
    user?: {
      email?: string;
    };
  };
}

function CUAHCoin() {
  return (
    <div
      aria-hidden="true"
      className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[radial-gradient(circle_at_35%_35%,#6b8fff,#2441a8)] shadow-[0_0_40px_rgba(65,105,225,0.4)]"
    >
      <span className="text-3xl font-bold text-white">₴</span>
    </div>
  );
}

function normalizeApiError(payload: AuthApiResponse) {
  if (payload.error === "RATE_LIMITED") return "tooManyAttempts";
  if (payload.error === "CODE_EXPIRED") return "codeExpired";
  if (payload.error === "INVALID_CODE") return "invalidCode";
  return "emailCodeSendError";
}

export default function EmailLoginPage() {
  const t = useTranslations("onboarding");
  const common = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const { setEmailPasswordSession, clearError } = useWallet();
  const emailInputId = useId();
  const codeInputId = useId();
  const errorId = useId();
  const [step, setStep] = useState<EmailStep>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [localErrorKey, setLocalErrorKey] = useState<string | null>(null);

  const visibleErrorMessage = localErrorKey ? t(localErrorKey) : null;

  async function requestEmailCode() {
    const trimmedEmail = email.trim();
    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail);
    if (!isValidEmail) {
      setLocalErrorKey("emailRequired");
      return;
    }

    setIsLoading(true);
    setLocalErrorKey(null);
    clearError();

    try {
      const response = await fetch("/api/auth/email/request-code", {
        body: JSON.stringify({ email: trimmedEmail }),
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const payload = (await response.json().catch(() => ({}))) as AuthApiResponse;

      if (!response.ok) {
        setLocalErrorKey(normalizeApiError(payload));
        return;
      }

      setMaskedEmail(payload.data?.maskedEmail ?? trimmedEmail);
      setCode("");
      setStep("code");
    } finally {
      setIsLoading(false);
    }
  }

  async function verifyEmailCode() {
    const trimmedEmail = email.trim();
    const trimmedCode = code.trim();

    if (!/^\d{6}$/.test(trimmedCode)) {
      setLocalErrorKey("codeRequired");
      return;
    }

    setIsLoading(true);
    setLocalErrorKey(null);
    clearError();

    try {
      const response = await fetch("/api/auth/email/verify-code", {
        body: JSON.stringify({
          code: trimmedCode,
          email: trimmedEmail,
        }),
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const payload = (await response.json().catch(() => ({}))) as AuthApiResponse;

      if (!response.ok) {
        setLocalErrorKey(normalizeApiError(payload));
        return;
      }

      const authenticatedEmail = payload.data?.user?.email ?? trimmedEmail;
      setEmailPasswordSession(authenticatedEmail);
      router.replace(`/${locale}/wallet`);
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
            <CUAHCoin />
            <h1 className="mt-5 text-3xl font-bold leading-tight text-white">
              {t("continueWithEmail")}
            </h1>
            <p className="mt-3 text-sm leading-6 text-gray-400">
              {step === "email"
                ? t("emailStepHint")
                : t("codeStepHint", { email: maskedEmail || email })}
            </p>
          </div>

          <div className="cy-card-soft p-4 sm:p-5">
            {step === "email" ? (
              <div className="space-y-3" aria-busy={isLoading} aria-live="polite">
                <label
                  className="block text-xs font-semibold uppercase tracking-[0.16em] text-gray-500"
                  htmlFor={emailInputId}
                >
                  {t("emailAddress")}
                </label>
                <input
                  aria-describedby={visibleErrorMessage ? errorId : undefined}
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
                      void requestEmailCode();
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
                  onClick={requestEmailCode}
                  size="md"
                  type="button"
                >
                  {t("sendCode")}
                </Button>
              </div>
            ) : (
              <div className="space-y-3" aria-busy={isLoading} aria-live="polite">
                <label
                  className="block text-xs font-semibold uppercase tracking-[0.16em] text-gray-500"
                  htmlFor={codeInputId}
                >
                  {t("emailCode")}
                </label>
                <input
                  aria-describedby={visibleErrorMessage ? errorId : undefined}
                  aria-invalid={localErrorKey === "codeRequired"}
                  autoComplete="one-time-code"
                  autoFocus
                  className="input-base min-h-12 w-full text-center text-2xl font-bold tracking-[0.3em]"
                  disabled={isLoading}
                  id={codeInputId}
                  inputMode="numeric"
                  maxLength={6}
                  onChange={(event) => {
                    setCode(event.target.value.replace(/\D/g, "").slice(0, 6));
                    if (
                      localErrorKey === "codeRequired" ||
                      localErrorKey === "invalidCode"
                    ) {
                      setLocalErrorKey(null);
                    }
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !isLoading) {
                      void verifyEmailCode();
                    }
                  }}
                  placeholder={t("codePlaceholder")}
                  type="text"
                  value={code}
                />
                <Button
                  className="h-12 rounded-2xl text-sm"
                  disabled={isLoading}
                  fullWidth
                  isLoading={isLoading}
                  loadingText={common("processing")}
                  onClick={verifyEmailCode}
                  size="md"
                  type="button"
                >
                  {t("verifyCode")}
                </Button>
                <button
                  className="w-full py-2 text-sm font-semibold text-accent-400 transition hover:text-accent-300 disabled:opacity-50"
                  disabled={isLoading}
                  onClick={requestEmailCode}
                  type="button"
                >
                  {t("resendCode")}
                </button>
              </div>
            )}

            {visibleErrorMessage ? (
              <p
                className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-200"
                id={errorId}
                role="alert"
              >
                {visibleErrorMessage}
              </p>
            ) : null}

            <div className="mt-5 text-center">
              <Link
                className="text-sm font-semibold text-gray-400 transition hover:text-white"
                href={`/${locale}`}
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

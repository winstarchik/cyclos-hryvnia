"use client";

import Link from "next/link";
import { useId, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/common/Button";
import { useWallet } from "@/hooks/useWallet";

type AuthMode = "login" | "register";
type AuthStep = "email" | "code" | "password";

interface AuthApiResponse {
  status: "ok" | "error";
  error?: string;
  data?: {
    devCode?: string;
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
  if (payload.error === "ACCOUNT_EXISTS") return "emailAccountExists";
  if (payload.error === "ACCOUNT_NOT_FOUND") return "emailAccountMissing";
  if (payload.error === "RATE_LIMITED") return "tooManyAttempts";
  if (payload.error === "EMAIL_DELIVERY_UNAVAILABLE") {
    return "emailDeliveryUnavailable";
  }
  if (payload.error === "CODE_EXPIRED") return "codeExpired";
  if (payload.error === "INVALID_CODE") return "invalidCode";
  if (payload.error === "PASSWORD_MISMATCH") return "passwordMismatch";
  if (
    payload.error === "INVALID_PASSWORD" ||
    payload.error === "INVALID_CREDENTIALS"
  ) {
    return "invalidCredentials";
  }
  return "authDependencyError";
}

export default function EmailLoginPage() {
  const t = useTranslations("onboarding");
  const common = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setEmailPasswordSession, clearError } = useWallet();
  const initialMode = useMemo<AuthMode>(
    () => (searchParams.get("mode") === "register" ? "register" : "login"),
    [searchParams],
  );
  const emailInputId = useId();
  const codeInputId = useId();
  const passwordInputId = useId();
  const confirmPasswordInputId = useId();
  const errorId = useId();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [step, setStep] = useState<AuthStep>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [devCode, setDevCode] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [localErrorKey, setLocalErrorKey] = useState<string | null>(null);

  const visibleErrorMessage = localErrorKey ? t(localErrorKey) : null;
  const title = mode === "login" ? t("loginWithEmail") : t("createAccountWithEmail");
  const stepHint =
    step === "email"
      ? mode === "login"
        ? t("loginEmailHint")
        : t("registerEmailHint")
      : step === "code"
        ? t("codeStepHint", { email: maskedEmail || email })
        : mode === "login"
          ? t("loginPasswordHint")
          : t("registerPasswordHint");

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setStep("email");
    setCode("");
    setPassword("");
    setConfirmPassword("");
    setDevCode("");
    setMaskedEmail("");
    setLocalErrorKey(null);
    clearError();
    router.replace(`/${locale}/email-login?mode=${nextMode}`);
  }

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
        body: JSON.stringify({ email: trimmedEmail, mode }),
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const payload = (await response.json().catch(() => ({}))) as AuthApiResponse;

      if (!response.ok) {
        const errorKey = normalizeApiError(payload);
        setLocalErrorKey(errorKey);
        if (errorKey === "emailAccountExists") {
          switchMode("login");
        }
        return;
      }

      setMaskedEmail(payload.data?.maskedEmail ?? trimmedEmail);
      setDevCode(payload.data?.devCode ?? "");
      setCode("");
      setStep("code");
    } finally {
      setIsLoading(false);
    }
  }

  function continueAfterCode() {
    if (!/^\d{6}$/.test(code.trim())) {
      setLocalErrorKey("codeRequired");
      return;
    }

    setLocalErrorKey(null);
    setStep("password");
  }

  async function submitAccountAuth() {
    const trimmedEmail = email.trim();
    const trimmedCode = code.trim();

    if (!/^\d{6}$/.test(trimmedCode)) {
      setLocalErrorKey("codeRequired");
      setStep("code");
      return;
    }

    if (password.length < 8 || password.length > 128) {
      setLocalErrorKey("passwordTooShort");
      return;
    }

    if (mode === "register" && password !== confirmPassword) {
      setLocalErrorKey("passwordMismatch");
      return;
    }

    setIsLoading(true);
    setLocalErrorKey(null);
    clearError();

    try {
      const response = await fetch(
        mode === "login" ? "/api/auth/login" : "/api/auth/register",
        {
          body: JSON.stringify({
            code: trimmedCode,
            confirmPassword,
            email: trimmedEmail,
            password,
          }),
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          method: "POST",
        },
      );
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
              {title}
            </h1>
            <p className="mt-3 text-sm leading-6 text-gray-400">{stepHint}</p>
          </div>

          <div className="cy-card-soft p-4 sm:p-5">
            <div className="mb-5 grid grid-cols-2 gap-2 rounded-2xl border border-dark-800 bg-dark-950/70 p-1">
              {(["login", "register"] as const).map((item) => (
                <button
                  aria-pressed={mode === item}
                  className={`min-h-11 rounded-xl text-sm font-semibold transition ${
                    mode === item
                      ? "bg-accent-500 text-white"
                      : "text-gray-400 hover:bg-dark-900 hover:text-white"
                  }`}
                  disabled={isLoading}
                  key={item}
                  onClick={() => switchMode(item)}
                  type="button"
                >
                  {item === "login" ? t("login") : t("register")}
                </button>
              ))}
            </div>

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
                {mode === "login" ? (
                  <Link
                    className="block py-2 text-center text-sm font-semibold text-accent-400 transition hover:text-accent-300"
                    href={`/${locale}/forgot-password`}
                  >
                    {t("forgotPassword")}
                  </Link>
                ) : null}
              </div>
            ) : null}

            {step === "code" ? (
              <div className="space-y-3" aria-busy={isLoading} aria-live="polite">
                {devCode ? (
                  <p className="rounded-2xl border border-accent-500/25 bg-accent-500/10 px-4 py-3 text-sm leading-6 text-accent-100">
                    {t("developmentEmailCode", { code: devCode })}
                  </p>
                ) : null}
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
                      continueAfterCode();
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
                  onClick={continueAfterCode}
                  size="md"
                  type="button"
                >
                  {t("continueButton")}
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
            ) : null}

            {step === "password" ? (
              <div className="space-y-3" aria-busy={isLoading} aria-live="polite">
                <label
                  className="block text-xs font-semibold uppercase tracking-[0.16em] text-gray-500"
                  htmlFor={passwordInputId}
                >
                  {t("password")}
                </label>
                <input
                  aria-describedby={visibleErrorMessage ? errorId : undefined}
                  aria-invalid={
                    localErrorKey === "passwordTooShort" ||
                    localErrorKey === "invalidCredentials"
                  }
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                  autoFocus
                  className="input-base min-h-12 w-full"
                  disabled={isLoading}
                  id={passwordInputId}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    if (
                      localErrorKey === "passwordTooShort" ||
                      localErrorKey === "invalidCredentials"
                    ) {
                      setLocalErrorKey(null);
                    }
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !isLoading) {
                      void submitAccountAuth();
                    }
                  }}
                  placeholder={t("passwordPlaceholder")}
                  type="password"
                  value={password}
                />

                {mode === "register" ? (
                  <>
                    <label
                      className="block text-xs font-semibold uppercase tracking-[0.16em] text-gray-500"
                      htmlFor={confirmPasswordInputId}
                    >
                      {t("confirmPassword")}
                    </label>
                    <input
                      aria-describedby={visibleErrorMessage ? errorId : undefined}
                      aria-invalid={localErrorKey === "passwordMismatch"}
                      autoComplete="new-password"
                      className="input-base min-h-12 w-full"
                      disabled={isLoading}
                      id={confirmPasswordInputId}
                      onChange={(event) => {
                        setConfirmPassword(event.target.value);
                        if (localErrorKey === "passwordMismatch") {
                          setLocalErrorKey(null);
                        }
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !isLoading) {
                          void submitAccountAuth();
                        }
                      }}
                      placeholder={t("confirmPasswordPlaceholder")}
                      type="password"
                      value={confirmPassword}
                    />
                  </>
                ) : null}

                <Button
                  className="h-12 rounded-2xl text-sm"
                  disabled={isLoading}
                  fullWidth
                  isLoading={isLoading}
                  loadingText={common("processing")}
                  onClick={submitAccountAuth}
                  size="md"
                  type="button"
                >
                  {mode === "login" ? t("login") : t("finishRegistration")}
                </Button>
              </div>
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

            <div className="mt-5 flex items-center justify-center gap-4 text-sm font-semibold">
              {step !== "email" ? (
                <button
                  className="text-gray-400 transition hover:text-white"
                  disabled={isLoading}
                  onClick={() => {
                    setStep(step === "password" ? "code" : "email");
                    setLocalErrorKey(null);
                  }}
                  type="button"
                >
                  {t("back")}
                </button>
              ) : null}
              <Link
                className="text-gray-400 transition hover:text-white"
                href={`/${locale}`}
              >
                {common("close")}
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/common/Button";
import { useWallet } from "@/hooks/useWallet";
import { csrfFetch } from "@/lib/csrf";

interface ApiResponse {
  status: "ok" | "error";
  error?: string;
  data?: {
    user?: {
      email?: string;
    };
  };
}

function normalizeError(payload: ApiResponse) {
  if (payload.error === "PASSWORD_MISMATCH") return "passwordMismatch";
  if (payload.error === "INVALID_PASSWORD") return "passwordTooShort";
  if (payload.error === "INVALID_RESET_TOKEN") return "invalidResetLink";
  if (payload.error === "RATE_LIMITED") return "tooManyAttempts";
  return "passwordResetError";
}

export default function ResetPasswordPage() {
  const t = useTranslations("onboarding");
  const common = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setEmailPasswordSession } = useWallet();
  const passwordInputId = useId();
  const confirmPasswordInputId = useId();
  const errorId = useId();
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [localErrorKey, setLocalErrorKey] = useState<string | null>(
    null,
  );

  useEffect(() => {
    const hashToken = new URLSearchParams(
      window.location.hash.replace(/^#/, ""),
    ).get("token");
    const queryToken = searchParams.get("token");
    const nextToken = hashToken ?? queryToken ?? "";

    setToken(nextToken);
    setLocalErrorKey(nextToken ? null : "invalidResetLink");

    if (nextToken && (window.location.hash || queryToken)) {
      window.history.replaceState(null, "", `/${locale}/reset-password`);
    }
  }, [locale, searchParams]);

  async function resetPassword() {
    if (password.length < 8 || password.length > 128) {
      setLocalErrorKey("passwordTooShort");
      return;
    }

    if (password !== confirmPassword) {
      setLocalErrorKey("passwordMismatch");
      return;
    }

    setIsLoading(true);
    setLocalErrorKey(null);

    try {
      const response = await csrfFetch("/api/auth/password/reset", {
        body: JSON.stringify({ confirmPassword, password, token }),
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

      const email = payload.data?.user?.email;
      if (email) {
        setEmailPasswordSession(email);
      }
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
            <h1 className="text-3xl font-bold leading-tight text-white">
              {t("resetPasswordTitle")}
            </h1>
            <p className="mt-3 text-sm leading-6 text-gray-400">
              {t("resetPasswordHint")}
            </p>
          </div>

          <div className="cy-card-soft p-4 sm:p-5">
            <div className="space-y-3" aria-busy={isLoading} aria-live="polite">
              <label
                className="block text-xs font-semibold uppercase tracking-[0.16em] text-gray-500"
                htmlFor={passwordInputId}
              >
                {t("newPassword")}
              </label>
              <input
                aria-describedby={localErrorKey ? errorId : undefined}
                aria-invalid={localErrorKey === "passwordTooShort"}
                autoComplete="new-password"
                autoFocus
                className="input-base min-h-12 w-full"
                disabled={isLoading || !token}
                id={passwordInputId}
                onChange={(event) => {
                  setPassword(event.target.value);
                  if (localErrorKey === "passwordTooShort") setLocalErrorKey(null);
                }}
                placeholder={t("passwordPlaceholder")}
                type="password"
                value={password}
              />
              <label
                className="block text-xs font-semibold uppercase tracking-[0.16em] text-gray-500"
                htmlFor={confirmPasswordInputId}
              >
                {t("confirmPassword")}
              </label>
              <input
                aria-describedby={localErrorKey ? errorId : undefined}
                aria-invalid={localErrorKey === "passwordMismatch"}
                autoComplete="new-password"
                className="input-base min-h-12 w-full"
                disabled={isLoading || !token}
                id={confirmPasswordInputId}
                onChange={(event) => {
                  setConfirmPassword(event.target.value);
                  if (localErrorKey === "passwordMismatch") setLocalErrorKey(null);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !isLoading) {
                    void resetPassword();
                  }
                }}
                placeholder={t("confirmPasswordPlaceholder")}
                type="password"
                value={confirmPassword}
              />
              <Button
                className="h-12 rounded-2xl text-sm"
                disabled={isLoading || !token}
                fullWidth
                isLoading={isLoading}
                loadingText={common("processing")}
                onClick={resetPassword}
                size="md"
                type="button"
              >
                {t("saveNewPassword")}
              </Button>
            </div>

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
                {t("backToLogin")}
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { logDevError } from "@/lib/errors";

export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const common = useTranslations("common");

  useEffect(() => {
    logDevError("[app] Route rendering failed", error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-dark-950 px-6 pb-[calc(5rem+env(safe-area-inset-bottom))] text-white">
      <section className="w-full max-w-sm rounded-3xl border border-dark-800 bg-dark-900/40 p-6 text-center">
        <h1 className="text-2xl font-semibold">{common("error")}</h1>
        <p className="mt-3 text-sm leading-6 text-gray-400">
          {common("somethingWentWrong")}
        </p>
        <button
          className="mt-6 min-h-12 w-full rounded-xl bg-accent-500 px-4 font-semibold text-white transition hover:bg-accent-600 focus:outline-none focus:ring-2 focus:ring-accent-400/60"
          onClick={reset}
          type="button"
        >
          {common("retry")}
        </button>
      </section>
    </main>
  );
}

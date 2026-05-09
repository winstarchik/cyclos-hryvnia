"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/common/Button";
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
        <Button
          className="mt-6"
          fullWidth
          onClick={reset}
          size="md"
          type="button"
        >
          {common("retry")}
        </Button>
      </section>
    </main>
  );
}

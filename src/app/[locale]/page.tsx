import { useTranslations } from "next-intl";

export default function LocaleHomePage() {
  const t = useTranslations("wallet");

  return (
    <main className="flex flex-1 items-center justify-center p-8">
      <div className="glass w-full max-w-xl p-8">
        <h1 className="gradient-text text-3xl font-semibold">{t("title")}</h1>
        <p className="mt-3 text-dark-50/80">
          next-intl is configured. This page is locale-aware.
        </p>
      </div>
    </main>
  );
}


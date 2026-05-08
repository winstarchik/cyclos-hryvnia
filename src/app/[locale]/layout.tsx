import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { locales } from "@/i18n/request";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  title: "Cyclos Hryvnia",
  description: "Cyclos Hryvnia Telegram Mini App",
};

export function generateStaticParams(): Array<{ locale: string }> {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  if (!locales.includes(locale as (typeof locales)[number])) {
    notFound();
  }
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>
  );
}


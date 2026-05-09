import { LegalDocumentPage } from "@/components/legal/LegalDocumentPage";
import type { AppLocale } from "@/i18n/request";

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: AppLocale }>;
}) {
  const { locale } = await params;

  return <LegalDocumentPage document="privacy" locale={locale} />;
}

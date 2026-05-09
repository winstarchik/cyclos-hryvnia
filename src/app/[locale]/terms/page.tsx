import { LegalDocumentPage } from "@/components/legal/LegalDocumentPage";
import type { AppLocale } from "@/i18n/request";

export default async function TermsPage({
  params,
}: {
  params: Promise<{ locale: AppLocale }>;
}) {
  const { locale } = await params;

  return <LegalDocumentPage document="terms" locale={locale} />;
}

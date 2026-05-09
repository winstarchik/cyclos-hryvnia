import Link from "next/link";
import type { AppLocale } from "@/i18n/request";

type LegalDocument = "terms" | "privacy";

interface LegalSection {
  title: string;
  body: string[];
}

interface LegalCopy {
  back: string;
  effectiveDate: string;
  note: string;
  termsTitle: string;
  privacyTitle: string;
  termsSections: LegalSection[];
  privacySections: LegalSection[];
}

const LEGAL_COPY: Record<AppLocale, LegalCopy> = {
  en: {
    back: "Back to app",
    effectiveDate: "Effective date: May 10, 2026",
    note: "Cyclos Hryvnia is a non-custodial wallet interface. This page is provided for transparency and should be reviewed by legal counsel before a public production launch.",
    termsTitle: "Terms of Service",
    privacyTitle: "Privacy Policy",
    termsSections: [
      {
        title: "1. Acceptance",
        body: [
          "By accessing or using Cyclos Hryvnia, you agree to these Terms of Service. If you do not agree, do not use the app.",
        ],
      },
      {
        title: "2. Service",
        body: [
          "Cyclos Hryvnia provides a wallet interface for Solana accounts, balances, receive addresses, transaction history, and related DeFi utilities.",
          "The app is non-custodial. We do not control your private keys, seed phrase, external wallet, or blockchain transactions.",
        ],
      },
      {
        title: "3. Wallet Responsibility",
        body: [
          "You are responsible for protecting access to your wallet, email account, device, recovery phrase, passwords, and external wallet software.",
          "Blockchain transactions may be irreversible. Always verify addresses, networks, token amounts, and fees before confirming any action.",
        ],
      },
      {
        title: "4. No Financial Advice",
        body: [
          "Information shown in the app, including balances, token prices, charts, and transaction data, is for informational purposes only.",
          "Nothing in the app is financial, investment, legal, tax, or accounting advice.",
        ],
      },
      {
        title: "5. Risks",
        body: [
          "Digital assets are volatile and may lose value. Blockchain networks, RPC providers, wallet providers, and third-party services may fail, delay, or return incomplete data.",
          "You use the app at your own risk and are responsible for complying with applicable laws.",
        ],
      },
      {
        title: "6. Changes and Availability",
        body: [
          "We may update, suspend, or discontinue parts of the app at any time. We may also update these Terms as the product evolves.",
        ],
      },
    ],
    privacySections: [
      {
        title: "1. Information We Process",
        body: [
          "We may process your email address for account registration, login, one-time codes, password recovery, and session management.",
          "We may process public wallet addresses, token balances, and transaction references to display wallet information. Blockchain data is public by nature.",
        ],
      },
      {
        title: "2. Technical Data",
        body: [
          "We may process basic technical data such as browser type, device information, app route, approximate timestamps, and error logs to keep the app reliable and secure.",
        ],
      },
      {
        title: "3. Authentication and Wallet Providers",
        body: [
          "The app may use Web3Auth, external wallet providers, email delivery providers, Solana RPC providers, Telegram Mini App APIs, and hosting providers to operate the service.",
          "These providers may process data according to their own policies.",
        ],
      },
      {
        title: "4. How We Use Data",
        body: [
          "We use data to provide login, protect sessions, show wallet information, prevent abuse, troubleshoot bugs, and improve the product.",
          "We do not sell your personal data.",
        ],
      },
      {
        title: "5. Security and Retention",
        body: [
          "We use reasonable technical safeguards, but no system is perfectly secure. We retain account and security data only as needed for the service, security, legal obligations, and product operations.",
        ],
      },
      {
        title: "6. Your Choices",
        body: [
          "You can disconnect wallets, avoid optional wallet connections, and request account-related help through the project contact channel.",
        ],
      },
    ],
  },
  ua: {
    back: "Назад до застосунку",
    effectiveDate: "Дата набрання чинності: 10 травня 2026 року",
    note: "Cyclos Hryvnia — це некастодіальний інтерфейс гаманця. Ця сторінка підготовлена для прозорості; перед публічним запуском її варто перевірити з юристом.",
    termsTitle: "Умови користування",
    privacyTitle: "Політика конфіденційності",
    termsSections: [
      {
        title: "1. Прийняття умов",
        body: [
          "Використовуючи Cyclos Hryvnia, Ви погоджуєтеся з цими Умовами користування. Якщо Ви не згодні, не використовуйте застосунок.",
        ],
      },
      {
        title: "2. Сервіс",
        body: [
          "Cyclos Hryvnia надає інтерфейс для Solana-гаманців, балансів, адрес отримання, історії транзакцій та пов'язаних DeFi-функцій.",
          "Застосунок є некастодіальним. Ми не контролюємо Ваші приватні ключі, seed-фразу, зовнішній гаманець або блокчейн-транзакції.",
        ],
      },
      {
        title: "3. Відповідальність за гаманець",
        body: [
          "Ви відповідаєте за захист доступу до гаманця, email, пристрою, фрази відновлення, паролів і зовнішнього wallet-софту.",
          "Блокчейн-транзакції можуть бути незворотними. Завжди перевіряйте адреси, мережі, суми токенів і комісії перед підтвердженням.",
        ],
      },
      {
        title: "4. Не фінансова порада",
        body: [
          "Баланси, ціни токенів, графіки та історія транзакцій показуються лише з інформаційною метою.",
          "Ніщо в застосунку не є фінансовою, інвестиційною, юридичною, податковою або бухгалтерською порадою.",
        ],
      },
      {
        title: "5. Ризики",
        body: [
          "Цифрові активи волатильні та можуть втратити вартість. Блокчейн-мережі, RPC, wallet-провайдери та сторонні сервіси можуть працювати з перебоями.",
          "Ви використовуєте застосунок на власний ризик і відповідаєте за дотримання застосовного законодавства.",
        ],
      },
      {
        title: "6. Зміни та доступність",
        body: [
          "Ми можемо оновлювати, призупиняти або припиняти окремі частини застосунку. Умови також можуть оновлюватися разом із розвитком продукту.",
        ],
      },
    ],
    privacySections: [
      {
        title: "1. Які дані ми обробляємо",
        body: [
          "Ми можемо обробляти Ваш email для реєстрації, входу, одноразових кодів, відновлення пароля та керування сесіями.",
          "Ми можемо обробляти публічні адреси гаманців, баланси токенів і посилання на транзакції для відображення інформації про гаманець. Дані блокчейну є публічними за своєю природою.",
        ],
      },
      {
        title: "2. Технічні дані",
        body: [
          "Ми можемо обробляти базові технічні дані: тип браузера, інформацію про пристрій, маршрут у застосунку, приблизні часові мітки та журнали помилок.",
        ],
      },
      {
        title: "3. Провайдери входу та гаманців",
        body: [
          "Застосунок може використовувати Web3Auth, зовнішні гаманці, email-провайдерів, Solana RPC, Telegram Mini App API та хостинг-провайдерів.",
          "Ці провайдери можуть обробляти дані відповідно до власних політик.",
        ],
      },
      {
        title: "4. Як ми використовуємо дані",
        body: [
          "Ми використовуємо дані для входу, захисту сесій, показу інформації про гаманець, запобігання зловживанням, виправлення помилок і покращення продукту.",
          "Ми не продаємо Ваші персональні дані.",
        ],
      },
      {
        title: "5. Безпека та зберігання",
        body: [
          "Ми застосовуємо розумні технічні заходи безпеки, але жодна система не є ідеально захищеною. Дані зберігаються лише настільки, наскільки це потрібно для сервісу, безпеки, юридичних вимог і роботи продукту.",
        ],
      },
      {
        title: "6. Ваш вибір",
        body: [
          "Ви можете відключити гаманець, не використовувати опційні wallet-підключення та звернутися по допомогу щодо акаунта через контактний канал проєкту.",
        ],
      },
    ],
  },
  ru: {
    back: "Назад в приложение",
    effectiveDate: "Дата вступления в силу: 10 мая 2026 года",
    note: "Cyclos Hryvnia — некастодиальный интерфейс кошелька. Эта страница подготовлена для прозрачности; перед публичным запуском её стоит проверить с юристом.",
    termsTitle: "Условия использования",
    privacyTitle: "Политика конфиденциальности",
    termsSections: [
      {
        title: "1. Принятие условий",
        body: [
          "Используя Cyclos Hryvnia, Вы соглашаетесь с этими Условиями использования. Если Вы не согласны, не используйте приложение.",
        ],
      },
      {
        title: "2. Сервис",
        body: [
          "Cyclos Hryvnia предоставляет интерфейс для Solana-кошельков, балансов, адресов получения, истории транзакций и связанных DeFi-функций.",
          "Приложение является некастодиальным. Мы не контролируем Ваши приватные ключи, seed-фразу, внешний кошелек или блокчейн-транзакции.",
        ],
      },
      {
        title: "3. Ответственность за кошелек",
        body: [
          "Вы отвечаете за защиту доступа к кошельку, email, устройству, фразе восстановления, паролям и внешнему wallet-софту.",
          "Блокчейн-транзакции могут быть необратимыми. Всегда проверяйте адреса, сети, суммы токенов и комиссии перед подтверждением.",
        ],
      },
      {
        title: "4. Не финансовый совет",
        body: [
          "Балансы, цены токенов, графики и история транзакций показываются только в информационных целях.",
          "Ничто в приложении не является финансовой, инвестиционной, юридической, налоговой или бухгалтерской консультацией.",
        ],
      },
      {
        title: "5. Риски",
        body: [
          "Цифровые активы волатильны и могут потерять стоимость. Блокчейн-сети, RPC, wallet-провайдеры и сторонние сервисы могут работать с перебоями.",
          "Вы используете приложение на свой риск и отвечаете за соблюдение применимого законодательства.",
        ],
      },
      {
        title: "6. Изменения и доступность",
        body: [
          "Мы можем обновлять, приостанавливать или прекращать отдельные части приложения. Условия также могут обновляться по мере развития продукта.",
        ],
      },
    ],
    privacySections: [
      {
        title: "1. Какие данные мы обрабатываем",
        body: [
          "Мы можем обрабатывать Ваш email для регистрации, входа, одноразовых кодов, восстановления пароля и управления сессиями.",
          "Мы можем обрабатывать публичные адреса кошельков, балансы токенов и ссылки на транзакции для отображения информации о кошельке. Данные блокчейна публичны по своей природе.",
        ],
      },
      {
        title: "2. Технические данные",
        body: [
          "Мы можем обрабатывать базовые технические данные: тип браузера, информацию об устройстве, маршрут в приложении, примерные временные метки и журналы ошибок.",
        ],
      },
      {
        title: "3. Провайдеры входа и кошельков",
        body: [
          "Приложение может использовать Web3Auth, внешние кошельки, email-провайдеров, Solana RPC, Telegram Mini App API и хостинг-провайдеров.",
          "Эти провайдеры могут обрабатывать данные согласно собственным политикам.",
        ],
      },
      {
        title: "4. Как мы используем данные",
        body: [
          "Мы используем данные для входа, защиты сессий, отображения информации о кошельке, предотвращения злоупотреблений, исправления ошибок и улучшения продукта.",
          "Мы не продаем Ваши персональные данные.",
        ],
      },
      {
        title: "5. Безопасность и хранение",
        body: [
          "Мы применяем разумные технические меры безопасности, но ни одна система не защищена идеально. Данные хранятся только настолько, насколько это нужно для сервиса, безопасности, юридических требований и работы продукта.",
        ],
      },
      {
        title: "6. Ваш выбор",
        body: [
          "Вы можете отключить кошелек, не использовать опциональные wallet-подключения и обратиться за помощью по аккаунту через контактный канал проекта.",
        ],
      },
    ],
  },
};

interface LegalDocumentPageProps {
  locale: AppLocale;
  document: LegalDocument;
}

export function LegalDocumentPage({ locale, document }: LegalDocumentPageProps) {
  const copy = LEGAL_COPY[locale];
  const title = document === "terms" ? copy.termsTitle : copy.privacyTitle;
  const sections =
    document === "terms" ? copy.termsSections : copy.privacySections;

  return (
    <main className="min-h-screen bg-dark-950 px-4 py-8 text-white sm:px-6">
      <div aria-hidden="true" className="fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(65,105,225,0.2),transparent_42%),linear-gradient(180deg,#0a0e27_0%,#050712_100%)]" />

      <article className="relative z-10 mx-auto max-w-3xl pb-10 pt-[max(env(safe-area-inset-top),1rem)]">
        <Link
          className="inline-flex min-h-11 items-center rounded-2xl border border-white/10 bg-dark-900/70 px-4 text-sm font-semibold text-gray-200 backdrop-blur-xl transition hover:border-accent-500/50 hover:text-white"
          href={`/${locale}`}
        >
          {copy.back}
        </Link>

        <div className="mt-8 rounded-3xl border border-white/10 bg-dark-900/55 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-400">
            Cyclos Hryvnia
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-normal text-white sm:text-4xl">
            {title}
          </h1>
          <p className="mt-3 text-sm text-gray-500">{copy.effectiveDate}</p>
          <p className="mt-5 rounded-2xl border border-accent-500/20 bg-accent-500/10 px-4 py-3 text-sm leading-6 text-accent-100">
            {copy.note}
          </p>

          <div className="mt-8 space-y-7">
            {sections.map((section) => (
              <section key={section.title}>
                <h2 className="text-lg font-semibold text-white">
                  {section.title}
                </h2>
                <div className="mt-3 space-y-3">
                  {section.body.map((paragraph) => (
                    <p className="text-sm leading-7 text-gray-400" key={paragraph}>
                      {paragraph}
                    </p>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </article>
    </main>
  );
}

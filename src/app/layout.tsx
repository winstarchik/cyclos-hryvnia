import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { Manrope } from "next/font/google";
import "@/styles/globals.css";
import { TMAProvider } from "@/app/TMAProvider";
import { Web3AuthAppProvider } from "@/app/Web3AuthAppProvider";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "cyrillic"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Cyclos Hryvnia",
  description: "Cyclos Hryvnia Telegram Mini App for Solana DeFi",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  return (
    <html
      lang={locale}
      className={`${manrope.variable} dark h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-dark-950 font-sans text-dark-100 scrollbar-dark">
        <TMAProvider>
          <Web3AuthAppProvider>{children}</Web3AuthAppProvider>
        </TMAProvider>
      </body>
    </html>
  );
}

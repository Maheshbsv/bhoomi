import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Noto_Sans, Noto_Sans_Kannada } from "next/font/google";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { StoreProvider } from "@/data/provider";
import { Header } from "@/components/shell/Header";
import { DemoControls } from "@/components/shell/DemoControls";
import { SessionHydrator } from "@/components/shell/SessionHydrator";
import { Toaster } from "@/components/ui/sonner";

const notoSans = Noto_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});
const notoKannada = Noto_Sans_Kannada({
  subsets: ["kannada"],
  variable: "--font-kn",
  display: "swap",
});

export function generateStaticParams() {
  return [{ locale: "en" }, { locale: "kn" }];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "brand" });
  return { title: `${t("name")} — ${t("tagline")}` };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    <html
      lang={locale}
      className={`${notoSans.variable} ${notoKannada.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider>
          <Header />
          <SessionHydrator />
          <StoreProvider>
            <main className="flex-1">{children}</main>
            <footer className="border-t bg-muted/50">
              <DemoControls />
            </footer>
          </StoreProvider>
          <Toaster theme="light" />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

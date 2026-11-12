import type { Metadata } from "next";
import { cookies } from "next/headers";
import { I18nProvider } from "@/components/i18n-provider";
import { LOCALE_COOKIE, parseLocale } from "@/lib/i18n";
import { themeInitScript } from "@/lib/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: "X_Farm | Panou virtual de cultivare",
  description: "Monitorizează plante virtuale și condiții de creștere simulate cu X_Farm.",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Romanian by default; a saved choice from the language button is kept in a cookie.
  const locale = parseLocale((await cookies()).get(LOCALE_COOKIE)?.value);
  return (
    <html lang={locale} suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeInitScript }} /></head>
      <body><I18nProvider initialLocale={locale}>{children}</I18nProvider></body>
    </html>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppShell } from "../components/AppShell";
import "../globals.css";
import { getUiCopy, type Locale } from "@/lib/i18n";

const configuredSiteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? process.env.CF_PAGES_URL;

type LocaleParams = { locale?: string[] };

function resolveLocale({ locale }: LocaleParams): Locale {
  if (!locale || locale.length === 0) return "en";
  if (locale.length === 1 && locale[0] === "zh") return "zh";
  notFound();
}

export async function generateMetadata({
  params,
}: Readonly<{ params: Promise<LocaleParams> }>): Promise<Metadata> {
  const locale = resolveLocale(await params);
  const copy = getUiCopy(locale);
  const canonical = locale === "zh" ? "/zh" : "/";
  const title = `ClearTag · ${copy.hero.eyebrow}`;
  const description = copy.hero.lead;

  return {
    metadataBase: configuredSiteUrl ? new URL(configuredSiteUrl) : undefined,
    title,
    description,
    robots: { index: false, follow: false },
    alternates: {
      canonical,
      languages: {
        "en-US": "/",
        "zh-CN": "/zh",
        "x-default": "/",
      },
    },
    openGraph: {
      type: "website",
      url: canonical,
      locale: locale === "zh" ? "zh_CN" : "en_US",
      alternateLocale: locale === "zh" ? ["en_US"] : ["zh_CN"],
      title,
      description,
      siteName: "ClearTag",
      images: [{ url: "/og.png", width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/og.png"],
    },
    icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<LocaleParams>;
}>) {
  const locale = resolveLocale(await params);

  return (
    <html lang={locale === "zh" ? "zh-CN" : "en"}>
      <body>
        <AppShell initialLocale={locale}>{children}</AppShell>
      </body>
    </html>
  );
}

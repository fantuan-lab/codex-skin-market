import type { Metadata } from "next";
import { getUiCopy } from "@/lib/i18n";
import "../globals.css";

const configuredSiteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? process.env.CF_PAGES_URL;
const copy = getUiCopy("zh");
const title = `ClearTag · ${copy.hero.eyebrow}`;
const description = copy.hero.lead;

export const metadata: Metadata = {
  metadataBase: configuredSiteUrl ? new URL(configuredSiteUrl) : undefined,
  title,
  description,
  robots: { index: false, follow: false },
  alternates: {
    canonical: "/zh",
    languages: {
      "en-US": "/",
      "zh-CN": "/zh",
      "x-default": "/",
    },
  },
  openGraph: {
    type: "website",
    url: "/zh",
    locale: "zh_CN",
    alternateLocale: ["en_US"],
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
  icons: {
    icon: [
      { url: "/cleartag-mark-v2.svg", type: "image/svg+xml", sizes: "any" },
      { url: "/favicon-32-v2.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon-16-v2.png", type: "image/png", sizes: "16x16" },
    ],
    shortcut: "/favicon.ico",
    apple: [
      {
        url: "/apple-touch-icon-v2.png",
        type: "image/png",
        sizes: "180x180",
      },
    ],
  },
};

export default function ChineseRootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}

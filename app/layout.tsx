import type { Metadata } from "next";
import "./globals.css";

const configuredSiteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? process.env.CF_PAGES_URL;

export const metadata: Metadata = {
  metadataBase: configuredSiteUrl ? new URL(configuredSiteUrl) : undefined,
  title: "ClearTag · Guided PDF accessibility remediation",
  description:
    "Analyze text-based PDFs, guide accessibility remediation, record human review, and export a defensible audit pack.",
  robots: { index: false, follow: false },
  openGraph: {
    type: "website",
    locale: "en_US",
    title: "ClearTag · Guided PDF accessibility remediation",
    description:
      "Evidence-first PDF accessibility review with explicit human verification.",
    siteName: "ClearTag",
    images: [{ url: "/og.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "ClearTag · Guided PDF accessibility remediation",
    description:
      "Evidence-first PDF accessibility review with explicit human verification.",
    images: ["/og.png"],
  },
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

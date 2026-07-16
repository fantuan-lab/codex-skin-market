import type { Metadata } from "next";
import "./globals.css";

const repositoryUrl = "https://github.com/fantuan-lab/codex-skin-market";
const ogImageUrl = "https://raw.githubusercontent.com/fantuan-lab/codex-skin-market/main/public/og.png";

export const metadata: Metadata = {
  title: "Codex 皮肤｜月影灵编 macOS / Windows Beta",
  description: "免费体验第三方 Codex Desktop 互动皮肤，支持 macOS、Windows 与一键恢复。查看源码、下载 Beta 或申请 Relay Provider 合作。",
  keywords: ["Codex 皮肤", "Codex Desktop", "Codex theme", "macOS", "Windows", "Relay Provider", "API 中转站"],
  authors: [{ name: "Codex Skin Lab", url: repositoryUrl }],
  creator: "Codex Skin Lab",
  publisher: "Codex Skin Lab",
  category: "developer tools",
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    locale: "zh_CN",
    title: "月影灵编｜给 Codex 桌面端换一张会呼吸的脸",
    description: "macOS 与 Windows 双平台第三方 Codex Desktop 互动皮肤，公开 Beta、源码可查、随时恢复。",
    siteName: "Codex Skin Lab",
    images: [{ url: ogImageUrl, width: 1200, height: 630, alt: "月影灵编 Codex Desktop 皮肤 Beta" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "月影灵编｜Codex Desktop Skin Beta",
    description: "macOS + Windows，免费 Beta，源码可查，随时恢复。",
    images: [ogImageUrl],
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}

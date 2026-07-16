import type { Metadata } from "next";
import "./globals.css";

const repositoryUrl = "https://github.com/fantuan-lab/codex-skin-market";
const siteUrl = "https://codex-skin-market.liucui19981231.chatgpt.site";
const ogImageUrl = `${siteUrl}/skins/bamboo-panda-hero.png`;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Codex 皮肤库｜竹影熊猫、月影灵编 macOS / Windows Beta",
  description: "直接下载竹影熊猫与月影灵编第三方 Codex Desktop 互动皮肤，支持 macOS、Windows、验证与一键恢复。免费公开 Beta，源码可查。",
  keywords: ["Codex 皮肤", "Codex Desktop", "Codex theme", "竹影熊猫", "月影灵编", "熊猫皮肤", "macOS", "Windows", "Relay Provider", "API 中转站"],
  authors: [{ name: "Codex Skin Lab", url: repositoryUrl }],
  creator: "Codex Skin Lab",
  publisher: "Codex Skin Lab",
  category: "developer tools",
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    locale: "zh_CN",
    url: siteUrl,
    title: "竹影熊猫｜陪你把今天的项目啃下来",
    description: "Codex Skin Lab 双平台皮肤库：竹影熊猫与月影灵编，macOS / Windows 直接下载，公开 Beta、源码可查、随时恢复。",
    siteName: "Codex Skin Lab",
    images: [{ url: ogImageUrl, width: 1942, height: 809, alt: "竹影熊猫 Codex Desktop 皮肤视觉概念图" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "竹影熊猫｜Codex Desktop Skin Beta",
    description: "熊猫陪你写代码。macOS + Windows 直接下载，免费公开 Beta，源码可查，随时恢复。",
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

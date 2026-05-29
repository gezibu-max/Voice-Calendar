import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Voice Calendar · 语音日历",
  description:
    "以语音交互为核心、参考 Notion Calendar 风格的简约日程管理工具",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}

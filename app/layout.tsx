import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "图库管理后台",
  description: "图片合集管理系统 - 后端驱动小程序内容",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}

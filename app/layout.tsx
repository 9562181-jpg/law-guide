import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "112 경찰 처리 보조 시스템",
  description: "112 신고 처리 매뉴얼 조회 및 서류 자동 생성",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-slate-50 text-gray-900">
        {children}
      </body>
    </html>
  );
}

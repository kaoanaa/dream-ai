import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI 解梦",
  description: "用通义千问生成结构化解梦解读与历史记录。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        <div className="min-h-dvh bg-background">
          <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
            <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
              <Link href="/" className="font-semibold tracking-tight">
                AI 解梦
              </Link>
              <nav className="flex items-center gap-4 text-sm text-muted-foreground">
                <Link href="/" className="hover:text-foreground">
                  解梦
                </Link>
                <Link href="/history" className="hover:text-foreground">
                  历史
                </Link>
              </nav>
            </div>
          </header>
          <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
          <footer className="mx-auto max-w-5xl px-4 pb-10 text-xs text-muted-foreground">
            解梦结果仅供自我探索与娱乐参考，不构成医疗/心理/法律建议。
          </footer>
        </div>
      </body>
    </html>
  );
}

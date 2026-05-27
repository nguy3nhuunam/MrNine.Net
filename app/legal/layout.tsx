import type { ReactNode } from "react";
import Link from "next/link";

export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0b0a08] text-white/90">
      <header className="border-b border-white/10 px-6 py-4 sm:px-12">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link href="/" className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-400/90">
            ← MrNine
          </Link>
          <nav className="flex gap-4 text-xs uppercase tracking-wider text-white/60">
            <Link href="/about" className="hover:text-white">Giới thiệu</Link>
            <Link href="/legal/privacy" className="hover:text-white">Quyền riêng tư</Link>
            <Link href="/legal/terms" className="hover:text-white">Điều khoản</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-12 sm:px-12">{children}</main>
      <footer className="mt-16 border-t border-white/10 px-6 py-8 text-xs text-white/40 sm:px-12">
        <div className="mx-auto max-w-3xl">© {new Date().getFullYear()} MrNine. Cập nhật lần cuối: 27/05/2026.</div>
      </footer>
    </div>
  );
}

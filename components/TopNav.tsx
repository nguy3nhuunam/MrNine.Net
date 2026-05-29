"use client";

/**
 * Sticky top nav cho trang public — landing, pricing, api-docs, sign-in.
 * Ẩn trên /dashboard và /admin (đã có header riêng).
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";

const HIDE_PREFIXES = ["/dashboard", "/admin", "/sign-in", "/sign-up"];

export function TopNav() {
  const pathname = usePathname() ?? "/";
  if (HIDE_PREFIXES.some((p) => pathname.startsWith(p))) return null;

  return <NavInner />;
}

function NavInner() {
  const { data: session, status } = useSession();
  const signedIn = status === "authenticated" && session?.user;

  return (
    <nav className="sticky top-0 z-40 border-b border-white/8 bg-[#0b0a08]/85 backdrop-blur supports-[backdrop-filter]:bg-[#0b0a08]/60">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2.5 sm:px-6">
        <Link href="/" className="font-mono text-[0.72rem] uppercase tracking-[0.32em] text-[#ef4444]">
          MrNine
        </Link>

        <div className="hidden items-center gap-5 text-sm text-[#c8bdaf] md:flex">
          <Link href="/legal/terms" className="text-[#9a9087] hover:text-[#f4eadc]">
            Điều khoản
          </Link>
        </div>

        <div className="flex items-center gap-2">
          {signedIn ? (
            <>
              <Link
                href="/dashboard"
                className="rounded-md border border-[#ef4444]/40 bg-[#ef4444]/10 px-3 py-1.5 font-mono text-[0.65rem] uppercase tracking-[0.16em] text-[#f4eadc]"
              >
                Dashboard
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="rounded-md border border-white/10 px-2.5 py-1.5 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-[#9a9087] hover:border-white/30"
              >
                Thoát
              </button>
            </>
          ) : (
            <>
              <Link
                href="/sign-in"
                className="rounded-md border border-white/15 px-3 py-1.5 font-mono text-[0.65rem] uppercase tracking-[0.16em] text-[#c8bdaf] hover:border-white/40"
              >
                Đăng nhập
              </Link>
              <Link
                href="/sign-up"
                className="rounded-md bg-[#ef4444] px-3 py-1.5 font-mono text-[0.65rem] uppercase tracking-[0.16em] text-[#090807] hover:bg-[#dc2626]"
              >
                Đăng ký
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

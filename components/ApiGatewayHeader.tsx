"use client";

/**
 * Header riêng cho trang /api-gateway.
 * Mang nút Dashboard (chỉ dành cho API Gateway) — auth-aware:
 * đã đăng nhập → Dashboard, chưa → Đăng nhập.
 */
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ArrowLeft, LayoutDashboard } from "lucide-react";

export function ApiGatewayHeader() {
  const { status } = useSession();
  const signedIn = status === "authenticated";

  return (
    <header className="sticky top-0 z-40 border-b border-white/8 bg-[#0b0a08]/85 backdrop-blur supports-[backdrop-filter]:bg-[#0b0a08]/60">
      <div className="mx-auto flex h-14 max-w-[110rem] items-center justify-between px-6 lg:px-10">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            aria-label="Về MrNine"
            className="flex size-8 items-center justify-center rounded-md border border-white/10 text-[#9a9087] transition hover:border-white/30 hover:text-[#f4eadc]"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <Link href="/" className="font-display text-lg font-black tracking-[-0.06em] text-[#f4eadc]">
            Mr<span className="text-[#ef4444]">Nine</span>
          </Link>
          <span className="hidden font-mono text-[0.55rem] uppercase tracking-[0.24em] text-[#5d544a] sm:inline">
            / API Gateway
          </span>
        </div>

        <Link
          href={signedIn ? "/dashboard" : "/sign-in?callbackUrl=/dashboard"}
          className="inline-flex items-center gap-1.5 rounded-md border border-[#ef4444]/40 bg-[#ef4444]/10 px-3.5 py-1.5 font-mono text-[0.62rem] uppercase tracking-[0.18em] text-[#f4eadc] transition hover:border-[#ef4444]/70 hover:bg-[#ef4444]/16 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ef4444]/70"
        >
          <LayoutDashboard className="size-3.5" />
          Dashboard
        </Link>
      </div>
    </header>
  );
}

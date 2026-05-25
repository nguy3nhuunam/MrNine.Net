"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useSession, signOut, signIn } from "next-auth/react";
import {
  ArrowLeft,
  ArrowRight,
  History,
  Lock,
  LogOut,
  Settings,
  Ticket,
  Sparkles,
} from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { cn } from "@/lib/utils";

const PLAN_CYCLE_DAYS = 30;
const FREE_PLAN_CREDITS = 20;

const COPY = {
  vi: {
    back: "Quay lại trang chủ",
    studioLabel: "Tài khoản",
    headerTitle: "Hồ sơ",
    upgradePlan: "Nâng cấp gói",
    creditsCycle: "Số credit chu kỳ này",
    remaining: "remaining",
    used: "đã dùng",
    resetsIn: (n: number) => `Reset trong ${n} ngày`,
    howCreditsTitle: "Cách credit hoạt động",
    howCreditsLead: "100 ký tự output = 1 credit cho mọi engine.",
    quickActions: "Hành động nhanh",
    viewHistory: "Xem lịch sử",
    viewHistoryHint: "Mọi bản dựng",
    redeemCoupon: "Đổi mã coupon",
    redeemCouponHint: "Nhận credit miễn phí",
    signOut: "Đăng xuất",
    signedOut: "Bạn đang chưa đăng nhập.",
    signIn: "Đăng nhập",
    free: "Free",
    pro: "Pro",
    settings: "Cài đặt",
  },
  en: {
    back: "Back to home",
    studioLabel: "Account",
    headerTitle: "Profile",
    upgradePlan: "Upgrade plan",
    creditsCycle: "Credits this cycle",
    remaining: "remaining",
    used: "used",
    resetsIn: (n: number) => `Resets in ${n} days`,
    howCreditsTitle: "How credits work",
    howCreditsLead: "100 output characters = 1 credit across all generators.",
    quickActions: "Quick actions",
    viewHistory: "View History",
    viewHistoryHint: "All generations",
    redeemCoupon: "Redeem Coupon",
    redeemCouponHint: "Get free credits",
    signOut: "Sign Out",
    signedOut: "You are not signed in.",
    signIn: "Sign in",
    free: "Free",
    pro: "Pro",
    settings: "Settings",
  },
};

const CREDIT_RULES = [
  { label: { vi: "Image generation (chat)", en: "Image generation (chat)" }, cost: "10 credits" },
  { label: { vi: "Web search (chat / script / blog)", en: "Web search (chat / script / blog)" }, cost: "+2 credits" },
  { label: { vi: "Video → Script", en: "Video → Script" }, cost: "+10 credits" },
  { label: { vi: "Script → Script rewrite", en: "Script → Script rewrite" }, cost: "+5 credits" },
  { label: { vi: "Mystic Deck · Luận giải AI", en: "Mystic Deck · AI interpretation" }, cost: "+8 credits" },
  { label: { vi: "Voice input", en: "Voice input" }, cost: "Free" },
];

function getInitials(name?: string | null, email?: string | null) {
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean).slice(0, 2);
    return parts.map((p) => p[0]?.toUpperCase()).join("") || "MR";
  }
  if (email) return email[0]?.toUpperCase() ?? "MR";
  return "MR";
}

export function ProfileShell() {
  const { language } = useLanguage();
  const { data: session, status } = useSession();
  const copy = COPY[language];
  const [creditsUsed, setCreditsUsed] = useState(0);
  const limit = FREE_PLAN_CREDITS;

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("mrnine-credits-used");
      if (raw) setCreditsUsed(Math.min(limit, Math.max(0, Number(raw) || 0)));
    } catch {
      // ignore
    }
  }, [limit]);

  const remaining = Math.max(0, limit - creditsUsed);
  const percentUsed = limit > 0 ? Math.round((creditsUsed / limit) * 100) : 0;

  if (status === "loading") {
    return (
      <ShellFrame copy={copy} language={language}>
        <div className="flex h-64 items-center justify-center text-[#9a9087]">{language === "vi" ? "Đang tải..." : "Loading..."}</div>
      </ShellFrame>
    );
  }

  if (status === "unauthenticated") {
    return (
      <ShellFrame copy={copy} language={language}>
        <div className="rounded-xl border border-[#3a322a] bg-[#100b04]/72 p-8 text-center">
          <Lock className="mx-auto size-7 text-[#ef4444]" />
          <h2 className="mt-3 font-display text-2xl font-black tracking-[-0.04em] text-[#f4eadc]">
            {copy.signedOut}
          </h2>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => void signIn("google")}
              className="rounded-md border border-[#ef4444]/45 bg-[#ef4444]/14 px-4 py-2 font-mono text-[0.6rem] uppercase tracking-[0.18em] text-[#ffe9e5] transition hover:bg-[#ef4444]/24"
            >
              Google · {copy.signIn}
            </button>
            <button
              type="button"
              onClick={() => void signIn("discord")}
              className="rounded-md border border-[#47c9d9]/35 bg-[#47c9d9]/12 px-4 py-2 font-mono text-[0.6rem] uppercase tracking-[0.18em] text-[#cef0f6] transition hover:bg-[#47c9d9]/22"
            >
              Discord · {copy.signIn}
            </button>
          </div>
        </div>
      </ShellFrame>
    );
  }

  const user = session?.user;
  const initials = getInitials(user?.name, user?.email);

  return (
    <ShellFrame copy={copy} language={language}>
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex flex-col items-center text-center">
          <div className="relative">
            {user?.image ? (
              <Image
                src={user.image}
                alt={user.name || "Avatar"}
                width={120}
                height={120}
                className="rounded-full border-2 border-[#d6a548]/45 object-cover"
              />
            ) : (
              <div className="flex size-[120px] items-center justify-center rounded-full border-2 border-[#d6a548]/45 bg-[#1b1508] font-display text-3xl font-black text-[#fff2d3]">
                {initials}
              </div>
            )}
            <button
              type="button"
              aria-label={copy.settings}
              title={copy.settings}
              className="absolute bottom-1 right-1 flex size-8 items-center justify-center rounded-full border border-white/15 bg-[#0b0a08] text-[#9a9087] transition hover:border-[#d6a548]/50 hover:text-[#f4eadc]"
            >
              <Settings className="size-3.5" />
            </button>
          </div>
          <h1 className="mt-4 font-display text-3xl font-black tracking-[-0.04em] text-[#f4eadc]">
            {user?.name || (language === "vi" ? "Người dùng MrNine" : "MrNine user")}
          </h1>
          <p className="mt-1 text-[0.85rem] text-[#b5ab9f]">{user?.email}</p>
          <span className="mt-3 rounded-full border border-[#45a85d]/35 bg-[#071109] px-3 py-1 font-mono text-[0.6rem] font-bold uppercase tracking-[0.18em] text-[#7dd391]">
            {copy.free}
          </span>
        </div>

        <div className="rounded-xl border border-[#3b2a0d] bg-[#100b04]/72 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset,0_18px_60px_rgba(0,0,0,0.4)]">
          <div className="flex items-center justify-between font-mono text-[0.58rem] uppercase tracking-[0.18em]">
            <span className="text-[#d6a548]">{copy.creditsCycle}</span>
            <span className="text-[#9a9087]">{copy.resetsIn(PLAN_CYCLE_DAYS)}</span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-display text-5xl font-black tracking-[-0.06em] text-[#f4eadc]">{remaining}</span>
            <span className="text-[0.85rem] text-[#9a9087]">/ {limit} {copy.remaining}</span>
          </div>
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/[0.05]">
            <div className="h-full bg-gradient-to-r from-[#45a85d] to-[#d6a548]" style={{ width: `${percentUsed}%` }} />
          </div>
          <div className="mt-1 flex items-center justify-between font-mono text-[0.5rem] uppercase tracking-[0.16em] text-[#9a9087]">
            <span>{creditsUsed} {copy.used}</span>
            <span>{percentUsed}%</span>
          </div>
          <button
            type="button"
            className="mt-5 flex h-11 w-full items-center justify-center rounded-md bg-gradient-to-r from-[#45a85d] to-[#22d29a] font-mono text-[0.7rem] font-bold uppercase tracking-[0.18em] text-[#061009] transition hover:from-[#52bd6c] hover:to-[#33dba5]"
          >
            {copy.upgradePlan}
          </button>
        </div>

        <div className="rounded-xl border border-[#3a322a] bg-[#100b04]/72 p-5">
          <div className="font-mono text-[0.58rem] uppercase tracking-[0.18em] text-[#9a9087]">
            {copy.howCreditsTitle}
          </div>
          <p className="mt-2 text-[0.92rem] font-bold text-[#f4eadc]">
            {copy.howCreditsLead.split("=")[0]}={" "}
            <span className="text-[#d6a548]">{copy.howCreditsLead.split("=")[1]}</span>
          </p>
          <ul className="mt-4 divide-y divide-white/5">
            {CREDIT_RULES.map((rule) => (
              <li key={rule.label.en} className="flex items-center justify-between py-2.5">
                <span className="text-[0.82rem] text-[#dfd5c7]">{rule.label[language]}</span>
                <span className={cn("font-mono text-[0.74rem] font-bold tracking-[-0.01em]", rule.cost === "Free" ? "text-[#7dd391]" : "text-[#f4eadc]")}>
                  {rule.cost}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-2">
          <div className="font-mono text-[0.58rem] uppercase tracking-[0.18em] text-[#9a9087]">
            {copy.quickActions}
          </div>
          <Link
            href="/"
            className="group flex items-center justify-between rounded-md border border-[#3a322a] bg-[#100b04]/72 px-4 py-3 transition hover:-translate-y-0.5 hover:border-[#45a85d]/35 hover:bg-[#0b1a0e]"
          >
            <span className="flex items-center gap-3">
              <History className="size-4 text-[#45a85d]" />
              <span className="text-[0.85rem] font-bold text-[#f4eadc]">{copy.viewHistory}</span>
            </span>
            <span className="text-[0.7rem] text-[#9a9087]">{copy.viewHistoryHint}</span>
          </Link>
          <button
            type="button"
            className="group flex w-full items-center justify-between rounded-md border border-[#3a322a] bg-[#100b04]/72 px-4 py-3 transition hover:-translate-y-0.5 hover:border-[#47c9d9]/35 hover:bg-[#06141a]"
          >
            <span className="flex items-center gap-3">
              <Ticket className="size-4 text-[#47c9d9]" />
              <span className="text-[0.85rem] font-bold text-[#f4eadc]">{copy.redeemCoupon}</span>
            </span>
            <span className="text-[0.7rem] text-[#9a9087]">{copy.redeemCouponHint}</span>
          </button>
          <button
            type="button"
            onClick={() => void signOut({ callbackUrl: "/" })}
            className="group flex w-full items-center justify-between rounded-md border border-[#ef4444]/30 bg-[#1a0807]/72 px-4 py-3 text-left transition hover:-translate-y-0.5 hover:border-[#ef4444]/60 hover:bg-[#1f0a08]"
          >
            <span className="flex items-center gap-3">
              <LogOut className="size-4 text-[#ef4444]" />
              <span className="text-[0.85rem] font-bold text-[#ffb4ad]">{copy.signOut}</span>
            </span>
            <ArrowRight className="size-3.5 text-[#ef4444]" />
          </button>
        </div>
      </div>
    </ShellFrame>
  );
}

function ShellFrame({
  copy,
  language,
  children,
}: Readonly<{ copy: typeof COPY[keyof typeof COPY]; language: "vi" | "en"; children: React.ReactNode }>) {
  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#0b0a08] text-[#e8dfd4]">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(circle at 16% 10%, rgba(214,165,72,0.16), transparent 30%), radial-gradient(circle at 78% 12%, rgba(69,168,93,0.08), transparent 24%), linear-gradient(180deg, #0d0c0a 0%, #070604 100%)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 bg-[size:24px_24px] opacity-50"
        style={{
          backgroundImage:
            "linear-gradient(rgba(94,86,75,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(94,86,75,0.055) 1px, transparent 1px)",
        }}
      />
      <header className="relative z-20 flex h-14 shrink-0 items-center gap-3 border-b border-[#25211b] bg-[#0a0907]/92 px-3 backdrop-blur md:px-5">
        <Link
          href="/"
          aria-label={copy.back}
          className="flex size-9 items-center justify-center rounded-md border border-white/10 text-[#a79d91] transition hover:border-[#d6a548]/40 hover:text-[#f4eadc]"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <Link
          href="/"
          aria-label="MrNine home"
          className="font-display text-xl font-black tracking-[-0.08em] text-[#f4eadc] outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#d6a548]/70 sm:text-2xl"
        >
          Mr<span className="text-[#d6a548]">Nine</span>
        </Link>
        <span aria-hidden="true" className="hidden h-6 w-px bg-white/10 sm:block" />
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-md border border-[#d6a548]/30 bg-[#d6a548]/10 text-[#d6a548]">
            <Sparkles className="size-4" />
          </div>
          <div className="hidden min-w-0 sm:block">
            <p className="font-mono text-[0.58rem] uppercase tracking-[0.22em] text-[#d6a548]">{copy.studioLabel}</p>
            <h1 className="truncate text-base font-black tracking-[-0.04em] text-[#f4eadc]">{copy.headerTitle}</h1>
          </div>
        </div>
      </header>

      <section className="relative z-10 mx-auto w-full max-w-[120rem] px-4 py-8 sm:px-6 lg:px-8">{children}</section>
    </main>
  );
}

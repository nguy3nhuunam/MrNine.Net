"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Bot,
  CheckCircle2,
  Code2,
  Filter,
  Image as ImageIcon,
  KeyRound,
  Mail,
  MessageCircle,
  Music2,
  Send,
  ShoppingBag,
  Sparkles,
  Video,
  Wrench,
} from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { aiStoreCatalog, type StoreItem, type StoreItemKind } from "@/lib/ai-store-catalog";
import { cn } from "@/lib/utils";

const TELEGRAM_URL = "https://t.me/mrninenet";
const FACEBOOK_URL = "https://www.facebook.com/nguyenhuunam.fb/";
const EMAIL_URL = "mailto:mrnine.net@gmail.com?subject=Mua%20t%C3%A0i%20kho%E1%BA%A3n%20AI";

const fmtVnd = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 });

const kindMeta: Record<StoreItemKind, { label: string; icon: typeof Sparkles; tone: string }> = {
  chatbot: { label: "Chatbot", icon: Sparkles, tone: "border-[#d6a548]/35 bg-[#d6a548]/12 text-[#fff2d3]" },
  api: { label: "API key", icon: KeyRound, tone: "border-[#ef4444]/35 bg-[#ef4444]/12 text-[#ffd7d3]" },
  image: { label: "Image", icon: ImageIcon, tone: "border-[#a78bfa]/35 bg-[#a78bfa]/12 text-[#e3d9ff]" },
  video: { label: "Video", icon: Video, tone: "border-[#47c9d9]/35 bg-[#47c9d9]/12 text-[#cdf3fa]" },
  audio: { label: "Audio", icon: Music2, tone: "border-[#45a85d]/35 bg-[#45a85d]/12 text-[#dff8e4]" },
  code: { label: "Code", icon: Code2, tone: "border-[#ec4899]/35 bg-[#ec4899]/12 text-[#ffd9ec]" },
};

const kindFilters: ReadonlyArray<{ value: StoreItemKind | "all"; labelVi: string; labelEn: string }> = [
  { value: "all", labelVi: "Tất cả", labelEn: "All" },
  { value: "chatbot", labelVi: "Chatbot", labelEn: "Chatbots" },
  { value: "api", labelVi: "API key", labelEn: "API keys" },
  { value: "code", labelVi: "Code", labelEn: "Coding" },
  { value: "image", labelVi: "Ảnh", labelEn: "Image" },
  { value: "video", labelVi: "Video", labelEn: "Video" },
  { value: "audio", labelVi: "Audio", labelEn: "Audio" },
];

export function AIStoreShell() {
  const { language } = useLanguage();
  const [filter, setFilter] = useState<StoreItemKind | "all">("all");

  const items = useMemo(() => {
    if (filter === "all") return aiStoreCatalog;
    return aiStoreCatalog.filter((item) => item.kind === filter);
  }, [filter]);

  const stockCounts = useMemo(() => {
    const map: Record<StoreItemKind | "all", number> = {
      all: aiStoreCatalog.length,
      chatbot: 0,
      api: 0,
      code: 0,
      image: 0,
      video: 0,
      audio: 0,
    };
    for (const item of aiStoreCatalog) map[item.kind] += 1;
    return map;
  }, []);

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#0e0b06] text-[#eee2cc]">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(circle at 14% 14%, rgba(214,165,72,0.22), transparent 32%), radial-gradient(circle at 84% 18%, rgba(239,68,68,0.1), transparent 28%), radial-gradient(circle at 50% 92%, rgba(167,139,250,0.06), transparent 32%), linear-gradient(180deg, #130d05 0%, #070501 100%)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 bg-[size:24px_24px] opacity-50"
        style={{
          backgroundImage:
            "linear-gradient(rgba(214,165,72,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(214,165,72,0.045) 1px, transparent 1px)",
        }}
      />
      <div className="blueprint-layer pointer-events-none fixed inset-0 -z-10" aria-hidden="true" />

      <header className="relative z-20 flex h-14 shrink-0 items-center gap-3 border-b border-[#3b2a0d] bg-[#100b04]/92 px-3 backdrop-blur md:px-5">
        <Link
          href="/"
          aria-label={language === "vi" ? "Quay lại trang chủ" : "Back to home"}
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
            <ShoppingBag className="size-4" />
          </div>
          <div className="hidden min-w-0 sm:block">
            <p className="font-mono text-[0.58rem] uppercase tracking-[0.22em] text-[#f0c86d]">MrNine Studio</p>
            <h1 className="truncate text-base font-black tracking-[-0.04em] text-[#f4eadc]">AI Store</h1>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <a
            href={TELEGRAM_URL}
            target="_blank"
            rel="noreferrer noopener"
            className="hidden h-9 items-center gap-2 rounded-full border border-[#47c9d9]/35 bg-[#06181c]/82 px-3 font-mono text-[0.58rem] uppercase tracking-[0.18em] text-[#a8e8f0] transition hover:border-[#47c9d9]/65 hover:bg-[#0a2228] md:flex"
          >
            <Send className="size-3.5" />
            Telegram
          </a>
          <a
            href={EMAIL_URL}
            className="flex h-9 items-center gap-2 rounded-md border border-[#d6a548]/40 bg-[#211606]/82 px-3 font-mono text-[0.58rem] uppercase tracking-[0.18em] text-[#fff2d3] transition hover:border-[#d6a548]/70 hover:bg-[#2a1c08]"
          >
            <Mail className="size-3.5" />
            {language === "vi" ? "Liên hệ" : "Contact"}
          </a>
        </div>
      </header>

      <section className="relative z-10 w-full px-4 pb-12 pt-5 sm:px-6 lg:px-10 xl:px-14 2xl:px-20">
        <div className="border-b border-[#3b2a0d] pb-5 sm:pb-7">
          <p className="font-mono text-[0.62rem] uppercase tracking-[0.28em] text-[#8f8579]">
            {language === "vi" ? "Trang chủ" : "Home"}
            <span className="mx-2 text-[#5e574e]">/</span>
            {language === "vi" ? "Cửa hàng AI" : "AI Store"}
          </p>
          <h2 className="mt-3 font-display text-[clamp(2.4rem,4.4vw,4.4rem)] font-black leading-[0.92] tracking-[-0.06em] text-[#f4eadc]">
            {language === "vi" ? "tài khoản AI · giá tốt · bảo hành" : "AI accounts · good price · warranty"}
          </h2>
          <p className="mt-3 max-w-3xl text-[0.85rem] leading-7 text-[#c4b9ad] sm:text-base">
            {language === "vi"
              ? "Bán lẻ và sỉ tài khoản AI premium: ChatGPT Plus / Pro, Claude Pro / Max, Codex API key, Cursor, Copilot, Midjourney, Dreamina, Runway, Kling, Suno, ElevenLabs, FAL credits. Bảo hành 1-1, hỗ trợ qua Telegram và email."
              : "Premium AI accounts at the best Vietnam rates: ChatGPT Plus/Pro, Claude Pro/Max, Codex API key, Cursor, Copilot, Midjourney, Dreamina, Runway, Kling, Suno, ElevenLabs, FAL credits. Lifetime warranty, support via Telegram and email."}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3 font-mono text-[0.5rem] uppercase tracking-[0.18em] text-[#f0c86d]">
            <span className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-[#d6a548]" />
              {language === "vi" ? "Đã phục vụ 1200+ khách" : "1200+ happy customers"}
            </span>
            <span className="text-[#5e574e]">/</span>
            <span>{language === "vi" ? "Bảo hành trọn vòng đời" : "Lifetime 1-1 warranty"}</span>
            <span className="text-[#5e574e]">/</span>
            <span>{language === "vi" ? "Hỗ trợ 24/7 qua Telegram" : "24/7 support on Telegram"}</span>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-md border border-[#3b2a0d] bg-[#100b04]/72 px-2.5 py-1.5 font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[#f0c86d]">
            <Filter className="size-3" />
            {language === "vi" ? "Lọc" : "Filter"}
          </div>
          {kindFilters.map((option) => {
            const active = filter === option.value;
            const count = option.value === "all" ? stockCounts.all : stockCounts[option.value];
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setFilter(option.value)}
                className={cn(
                  "flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 font-mono text-[0.55rem] uppercase tracking-[0.18em] transition",
                  active
                    ? "border-[#d6a548]/70 bg-[#d6a548]/14 text-[#fff2d3]"
                    : "border-white/8 bg-white/[0.03] text-[#a79d91] hover:border-[#d6a548]/30 hover:text-[#f4eadc]",
                )}
              >
                {language === "vi" ? option.labelVi : option.labelEn}
                <span className={cn("text-[0.5rem]", active ? "text-[#fff2d3]/70" : "text-[#5e574e]")}>{count}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((item) => (
            <StoreCard key={item.id} item={item} language={language} />
          ))}
          {items.length === 0 ? (
            <div className="col-span-full flex h-32 items-center justify-center rounded-xl border border-dashed border-[#3b2a0d] bg-[#100b04]/40 text-[0.78rem] text-[#a79d91]">
              {language === "vi" ? "Chưa có sản phẩm trong nhóm này" : "No products in this group yet"}
            </div>
          ) : null}
        </div>

        <div className="mt-8 grid gap-3 lg:grid-cols-3">
          <div className="rounded-xl border border-[#3b2a0d] bg-[#100b04]/72 p-4">
            <div className="flex items-center gap-2 font-mono text-[0.58rem] uppercase tracking-[0.18em] text-[#f0c86d]">
              <CheckCircle2 className="size-3.5" />
              {language === "vi" ? "An toàn" : "Safe"}
            </div>
            <p className="mt-2 text-[0.78rem] leading-5 text-[#b5ab9f]">
              {language === "vi"
                ? "Tài khoản chính chủ, không share spam. Bảo hành đến hết hạn, đổi mới ngay nếu lỗi từ phía nhà cung cấp."
                : "Authentic accounts, no spam sharing. Warranty until expiry, instant replacement if provider-side error."}
            </p>
          </div>
          <div className="rounded-xl border border-[#3b2a0d] bg-[#100b04]/72 p-4">
            <div className="flex items-center gap-2 font-mono text-[0.58rem] uppercase tracking-[0.18em] text-[#f0c86d]">
              <Bot className="size-3.5" />
              {language === "vi" ? "Đặt qua chat" : "Order via chat"}
            </div>
            <p className="mt-2 text-[0.78rem] leading-5 text-[#b5ab9f]">
              {language === "vi"
                ? "Bấm nút Mua trên thẻ → mở Telegram/email với tin nhắn đã soạn sẵn. Có thể hỏi MrNine AI ngay trên trang để tư vấn."
                : "Click Buy on a card → opens Telegram/email with pre-filled message. Or ask MrNine AI on this site for advice."}
            </p>
          </div>
          <div className="rounded-xl border border-[#3b2a0d] bg-[#100b04]/72 p-4">
            <div className="flex items-center gap-2 font-mono text-[0.58rem] uppercase tracking-[0.18em] text-[#f0c86d]">
              <Wrench className="size-3.5" />
              {language === "vi" ? "Cần combo?" : "Need a bundle?"}
            </div>
            <p className="mt-2 text-[0.78rem] leading-5 text-[#b5ab9f]">
              {language === "vi"
                ? "Mua 3 món trở lên hoặc chu kỳ 1 năm: giảm thêm 10–20%. Liên hệ trực tiếp Telegram để lấy báo giá riêng."
                : "Buy 3+ items or 1-year plans: extra 10–20% off. DM Telegram for a custom quote."}
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

function StoreCard({ item, language }: Readonly<{ item: StoreItem; language: "vi" | "en" }>) {
  const meta = kindMeta[item.kind];
  const Icon = meta.icon;
  const message = language === "vi"
    ? `Chào MrNine, mình muốn mua ${item.product} (${item.brand}) – ${item.duration} – ${fmtVnd.format(item.priceVnd)}.`
    : `Hi MrNine, I want to buy ${item.product} (${item.brand}) – ${item.duration} – ${fmtVnd.format(item.priceVnd)}.`;
  const telegramHref = `${TELEGRAM_URL}?text=${encodeURIComponent(message)}`;
  const emailHref = `mailto:mrnine.net@gmail.com?subject=${encodeURIComponent(`Mua ${item.product}`)}&body=${encodeURIComponent(message)}`;

  const askAi = () => {
    if (typeof window === "undefined") return;
    const askPrompt = language === "vi"
      ? `Tư vấn nhanh: ${item.product} (${item.brand}) – ${item.detail}. Có nên mua không và dùng cho việc gì?`
      : `Quick advice: ${item.product} (${item.brand}) – ${item.detail}. Should I buy it and what's it best for?`;
    window.dispatchEvent(new CustomEvent("mrnine-open-chat", { detail: { prompt: askPrompt } }));
  };

  const stockBadge = item.stock === "in"
    ? { label: language === "vi" ? "Sẵn hàng" : "In stock", tone: "bg-[#45a85d]/14 text-[#7dd391] border-[#45a85d]/35" }
    : item.stock === "low"
    ? { label: language === "vi" ? "Sắp hết" : "Low stock", tone: "bg-[#d6a548]/14 text-[#f0c86d] border-[#d6a548]/35" }
    : { label: language === "vi" ? "Đặt trước" : "Pre-order", tone: "bg-[#a78bfa]/14 text-[#c4b3ff] border-[#a78bfa]/35" };

  const discount = item.originalVnd && item.originalVnd > item.priceVnd
    ? Math.round((1 - item.priceVnd / item.originalVnd) * 100)
    : 0;

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-[#3b2a0d] bg-[#100b04]/72 p-4 transition hover:border-[#d6a548]/55 hover:bg-[#1a1209]/80">
      <header className="flex items-start gap-3">
        <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-md border", meta.tone)}>
          <Icon className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-[0.95rem] font-bold text-[#f4eadc]">{item.product}</span>
            {item.badge ? (
              <span className="rounded border border-[#ef4444]/45 bg-[#ef4444]/14 px-1.5 py-0.5 font-mono text-[0.46rem] font-bold uppercase tracking-[0.18em] text-[#ffb4ad]">
                {item.badge}
              </span>
            ) : null}
          </div>
          <p className="font-mono text-[0.5rem] uppercase tracking-[0.16em] text-[#5e574e]">{item.brand}</p>
        </div>
        <span className={cn("shrink-0 rounded-md border px-1.5 py-0.5 font-mono text-[0.5rem] uppercase tracking-[0.16em]", stockBadge.tone)}>
          {stockBadge.label}
        </span>
      </header>

      <p className="mt-3 line-clamp-2 text-[0.78rem] leading-5 text-[#b5ab9f]">{item.detail}</p>

      <div className="mt-3 flex items-end justify-between gap-3">
        <div>
          <div className="font-mono text-[1.25rem] font-bold tabular-nums text-[#f4eadc] sm:text-[1.4rem]">
            {fmtVnd.format(item.priceVnd)}
          </div>
          {item.originalVnd ? (
            <div className="mt-0.5 flex items-center gap-1.5 font-mono text-[0.62rem] tabular-nums">
              <span className="text-[#5e574e] line-through">{fmtVnd.format(item.originalVnd)}</span>
              {discount > 0 ? <span className="text-[#7dd391]">−{discount}%</span> : null}
            </div>
          ) : null}
        </div>
        <div className="text-right">
          <div className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-[#5e574e]">{item.duration}</div>
          <div className="font-mono text-[0.5rem] uppercase tracking-[0.14em] text-[#7dd391]">{item.warranty}</div>
        </div>
      </div>

      {item.notes ? (
        <p className="mt-2 rounded-md border border-[#d6a548]/22 bg-[#1b1508]/60 px-2 py-1.5 text-[0.66rem] leading-4 text-[#dfd5c7]">
          {item.notes}
        </p>
      ) : null}

      <div className="mt-3 flex items-center gap-1.5">
        <a
          href={telegramHref}
          target="_blank"
          rel="noreferrer noopener"
          className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-[#47c9d9]/40 bg-[#06181c]/72 px-2.5 py-2 font-mono text-[0.58rem] uppercase tracking-[0.16em] text-[#a8e8f0] transition hover:border-[#47c9d9]/70 hover:bg-[#0a2228]"
        >
          <Send className="size-3.5" />
          {language === "vi" ? "Mua qua Telegram" : "Buy via Telegram"}
        </a>
        <a
          href={emailHref}
          aria-label="Email"
          className="flex size-9 items-center justify-center rounded-md border border-[#d6a548]/35 bg-[#211606]/72 text-[#f0c86d] transition hover:border-[#d6a548]/65 hover:bg-[#2a1c08]"
        >
          <Mail className="size-3.5" />
        </a>
        <button
          type="button"
          onClick={askAi}
          aria-label={language === "vi" ? "Hỏi MrNine AI" : "Ask MrNine AI"}
          className="flex size-9 items-center justify-center rounded-md border border-[#45a85d]/35 bg-[#071109]/72 text-[#7dd391] transition hover:border-[#45a85d]/65 hover:bg-[#0a1a0d]"
        >
          <MessageCircle className="size-3.5" />
        </button>
      </div>

      <div className="mt-2 flex items-center gap-2 font-mono text-[0.48rem] uppercase tracking-[0.16em] text-[#5e574e]">
        <a href={FACEBOOK_URL} target="_blank" rel="noreferrer noopener" className="transition hover:text-[#f0c86d]">
          Facebook
        </a>
        <span>/</span>
        <a href={TELEGRAM_URL} target="_blank" rel="noreferrer noopener" className="transition hover:text-[#f0c86d]">
          @mrninenet
        </a>
      </div>
    </article>
  );
}

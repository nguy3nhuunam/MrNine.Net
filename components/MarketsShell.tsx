"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  LineChart,
  LoaderCircle,
  RefreshCw,
} from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { cn } from "@/lib/utils";

type MarketRow = {
  id: string;
  symbol: string;
  name: string;
  kind: "crypto" | "metal" | "forex";
  usd: number;
  vnd: number;
  change24h: number | null;
};

type MarketsResponse = {
  rows: MarketRow[];
  usdToVnd: number;
  updatedAt: string;
};

const REFRESH_MS = 60_000;

const numberFmtUsd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
const numberFmtVnd = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 });
const numberFmtUsdSmall = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 6 });

function fmtUsd(v: number): string {
  if (v < 1) return numberFmtUsdSmall.format(v);
  return numberFmtUsd.format(v);
}

function fmtVnd(v: number): string {
  return numberFmtVnd.format(v);
}

function fmtChange(v: number | null): string {
  if (v === null) return "—";
  const sign = v >= 0 ? "+" : "";
  return `${sign}${v.toFixed(2)}%`;
}

export function MarketsShell() {
  const { language } = useLanguage();
  const [data, setData] = useState<MarketsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [autoUpdate, setAutoUpdate] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch("/api/markets", { cache: "no-store" });
        const json = await response.json().catch(() => null);
        if (cancelled) return;
        if (response.ok && json?.rows) {
          setData(json as MarketsResponse);
          setError("");
        } else {
          setError(json?.error || "Không lấy được dữ liệu thị trường");
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Lỗi mạng");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    if (!autoUpdate) return () => {
      cancelled = true;
    };
    const interval = window.setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [autoUpdate]);

  function refresh() {
    setLoading(true);
    void (async () => {
      try {
        const response = await fetch("/api/markets", { cache: "no-store" });
        const json = await response.json().catch(() => null);
        if (response.ok && json?.rows) {
          setData(json as MarketsResponse);
          setError("");
        }
      } finally {
        setLoading(false);
      }
    })();
  }

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#070d09] text-[#e4f0e5]">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(circle at 12% 12%, rgba(69,168,93,0.22), transparent 32%), radial-gradient(circle at 86% 18%, rgba(214,165,72,0.12), transparent 28%), radial-gradient(circle at 50% 92%, rgba(239,68,68,0.06), transparent 32%), linear-gradient(180deg, #071109 0%, #030604 100%)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 bg-[size:24px_24px] opacity-55"
        style={{
          backgroundImage:
            "linear-gradient(rgba(69,168,93,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(69,168,93,0.055) 1px, transparent 1px)",
        }}
      />
      <div className="blueprint-layer pointer-events-none fixed inset-0 -z-10" aria-hidden="true" />

      <header className="relative z-20 flex h-14 shrink-0 items-center gap-3 border-b border-[#15351e] bg-[#050c07]/92 px-3 backdrop-blur md:px-5">
        <Link
          href="/"
          aria-label={language === "vi" ? "Quay lại trang chủ" : "Back to home"}
          className="flex size-9 items-center justify-center rounded-md border border-white/10 text-[#a79d91] transition hover:border-[#45a85d]/40 hover:text-[#f4eadc]"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <Link
          href="/"
          aria-label="MrNine home"
          className="font-display text-xl font-black tracking-[-0.08em] text-[#f4eadc] outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#45a85d]/70 sm:text-2xl"
        >
          Mr<span className="text-[#45a85d]">Nine</span>
        </Link>
        <span aria-hidden="true" className="hidden h-6 w-px bg-white/10 sm:block" />
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-md border border-[#45a85d]/30 bg-[#45a85d]/10 text-[#45a85d]">
            <LineChart className="size-4" />
          </div>
          <div className="hidden min-w-0 sm:block">
            <p className="font-mono text-[0.58rem] uppercase tracking-[0.22em] text-[#7dd391]">MrNine Studio</p>
            <h1 className="truncate text-base font-black tracking-[-0.04em] text-[#f4eadc]">Markets</h1>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAutoUpdate((current) => !current)}
            className={cn(
              "hidden h-9 items-center gap-2 rounded-full border px-3 font-mono text-[0.58rem] uppercase tracking-[0.18em] transition md:flex",
              autoUpdate
                ? "border-[#45a85d]/50 bg-[#071109] text-[#7dd391]"
                : "border-white/10 bg-white/[0.025] text-[#9a9087] hover:text-[#f4eadc]",
            )}
            aria-pressed={autoUpdate}
          >
            <span className={cn("size-1.5 rounded-full", autoUpdate ? "bg-[#45a85d] markets-pulse" : "bg-[#9a9087]")} />
            {autoUpdate ? (language === "vi" ? "Live · 60s" : "Live · 60s") : language === "vi" ? "Tạm dừng" : "Paused"}
          </button>
          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            className="flex h-9 items-center gap-2 rounded-md border border-[#45a85d]/40 bg-[#071109]/82 px-3 font-mono text-[0.58rem] uppercase tracking-[0.18em] text-[#dff8e4] transition hover:border-[#45a85d]/70 hover:bg-[#0a1a0d] disabled:opacity-55"
          >
            {loading ? <LoaderCircle className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
            {language === "vi" ? "Cập nhật" : "Refresh"}
          </button>
        </div>
      </header>

      <section className="relative z-10 mx-auto w-full max-w-[120rem] px-4 pb-10 pt-5 sm:px-6 lg:px-10">
        <div className="border-b border-[#15351e] pb-5 sm:pb-7">
          <p className="font-mono text-[0.62rem] uppercase tracking-[0.28em] text-[#8f8579]">
            {language === "vi" ? "Trang chủ" : "Home"}
            <span className="mx-2 text-[#5e574e]">/</span>
            {language === "vi" ? "Thị trường realtime" : "Realtime markets"}
          </p>
          <h2 className="mt-3 font-display text-[clamp(2.4rem,4.4vw,4.4rem)] font-black leading-[0.92] tracking-[-0.06em] text-[#f4eadc]">
            {language === "vi" ? "vàng · crypto · ngoại tệ" : "gold · crypto · forex"}
          </h2>
          <p className="mt-3 max-w-2xl text-[0.85rem] leading-7 text-[#c4b9ad] sm:text-base">
            {language === "vi"
              ? "Giá realtime từ CoinGecko (crypto + PAXG vàng) và Exchange-Rate-API (forex). Tự cập nhật mỗi 60 giây."
              : "Realtime prices from CoinGecko (crypto + PAXG gold) and Exchange-Rate-API (forex). Auto-refresh every 60s."}
          </p>
          {data ? (
            <div className="mt-3 font-mono text-[0.5rem] uppercase tracking-[0.18em] text-[#7dd391]">
              <span className="size-1.5 inline-block rounded-full bg-[#45a85d] markets-pulse mr-2 align-middle" />
              {language === "vi" ? "Cập nhật lần cuối" : "Updated"}: {new Date(data.updatedAt).toLocaleTimeString(language === "vi" ? "vi-VN" : "en-US")}
              <span className="ml-3 text-[#5e574e]">/ 1 USD ≈ {numberFmtVnd.format(data.usdToVnd)}</span>
            </div>
          ) : null}
        </div>

        {error ? (
          <div className="mt-5 rounded-md border border-[#ef4444]/30 bg-[#ef4444]/10 px-3 py-2 text-[0.78rem] text-[#ffb4ad]">
            {error}
          </div>
        ) : null}

        <div className="mt-5 overflow-hidden rounded-xl border border-[#15351e] bg-[#050c07]/72">
          <div className="grid grid-cols-[1.4fr_1fr_1fr_0.8fr] gap-3 border-b border-[#15351e] px-4 py-2.5 font-mono text-[0.5rem] uppercase tracking-[0.18em] text-[#5e574e] sm:grid-cols-[1.6fr_1fr_1fr_0.7fr] sm:px-6">
            <span>{language === "vi" ? "Tên" : "Name"}</span>
            <span className="text-right">USD</span>
            <span className="text-right">VND</span>
            <span className="text-right">24h</span>
          </div>
          {!data && loading ? (
            <div className="flex h-32 items-center justify-center">
              <LoaderCircle className="size-5 animate-spin text-[#45a85d]" />
            </div>
          ) : null}
          {data?.rows.map((row) => (
            <MarketRowView key={row.id} row={row} language={language} />
          ))}
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <div className="rounded-xl border border-[#15351e] bg-[#050c07]/72 p-4">
            <div className="flex items-center gap-2 font-mono text-[0.58rem] uppercase tracking-[0.18em] text-[#7dd391]">
              <span className="size-1.5 rounded-full bg-[#45a85d]" />
              {language === "vi" ? "Nguồn" : "Sources"}
            </div>
            <ul className="mt-2 space-y-1 text-[0.78rem] leading-5 text-[#b5ab9f]">
              <li>• <span className="text-[#7dd391]">CoinGecko</span> — crypto + PAX Gold (PAXG ≈ 1 oz vàng)</li>
              <li>• <span className="text-[#7dd391]">Exchange-Rate-API</span> — tỉ giá USD/VND</li>
              <li>• {language === "vi" ? "PAXG là token bảo chứng vàng vật chất 1:1, dùng để ước lượng giá vàng quốc tế." : "PAXG is a gold-backed token (1:1) used as a proxy for international gold price."}</li>
            </ul>
          </div>
          <div className="rounded-xl border border-[#3b2a0d] bg-[#100b04]/72 p-4">
            <div className="flex items-center gap-2 font-mono text-[0.58rem] uppercase tracking-[0.18em] text-[#d6a548]">
              <span className="size-1.5 rounded-full bg-[#d6a548]" />
              {language === "vi" ? "Lưu ý" : "Note"}
            </div>
            <p className="mt-2 text-[0.78rem] leading-5 text-[#b5ab9f]">
              {language === "vi"
                ? "Số liệu chỉ tham khảo. Giao dịch thật cần dùng broker chính thống. Không có giá xăng dầu vì không có nguồn realtime miễn phí ổn định cho VN."
                : "Reference figures only. Real trading needs a regulated broker. Fuel prices not shown — no stable free realtime feed for Vietnam."}
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

function MarketRowView({ row, language }: Readonly<{ row: MarketRow; language: "vi" | "en" }>) {
  const change = row.change24h;
  const tone = change === null ? "neutral" : change >= 0 ? "up" : "down";
  return (
    <div
      className={cn(
        "markets-row grid grid-cols-[1.4fr_1fr_1fr_0.8fr] items-center gap-3 border-b border-[#15351e] px-4 py-3 transition sm:grid-cols-[1.6fr_1fr_1fr_0.7fr] sm:px-6",
        "last:border-b-0 hover:bg-white/[0.02]",
      )}
    >
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-md border font-display text-[0.78rem] font-bold",
            row.kind === "metal"
              ? "border-[#d6a548]/35 bg-[#d6a548]/12 text-[#fff2d3]"
              : "border-[#45a85d]/35 bg-[#45a85d]/12 text-[#dff8e4]",
          )}
        >
          {row.symbol}
        </span>
        <div className="min-w-0">
          <div className="truncate text-[0.85rem] font-bold text-[#f4eadc]">{row.name}</div>
          <div className="font-mono text-[0.5rem] uppercase tracking-[0.16em] text-[#5e574e]">
            {row.kind === "metal" ? (language === "vi" ? "Kim loại quý" : "Precious metal") : "Crypto"}
          </div>
        </div>
      </div>
      <div className="text-right font-mono text-[0.85rem] tabular-nums text-[#f4eadc]">{fmtUsd(row.usd)}</div>
      <div className="text-right font-mono text-[0.74rem] tabular-nums text-[#b5ab9f]">{fmtVnd(row.vnd)}</div>
      <div
        className={cn(
          "flex items-center justify-end gap-1 font-mono text-[0.74rem] font-bold tabular-nums",
          tone === "up" ? "text-[#7dd391]" : tone === "down" ? "text-[#ffb4ad]" : "text-[#9a9087]",
        )}
      >
        {tone === "up" ? <ArrowUp className="size-3" /> : tone === "down" ? <ArrowDown className="size-3" /> : null}
        {fmtChange(change)}
      </div>
    </div>
  );
}

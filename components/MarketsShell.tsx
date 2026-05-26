"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
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

type MarketKind = "crypto" | "metal" | "forex";

type MarketRow = {
  id: string;
  symbol: string;
  name: string;
  kind: MarketKind;
  usd: number;
  vnd: number;
  change24h: number | null;
  sparkline: number[];
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
  const searchParams = useSearchParams();
  const focusSymbol = (searchParams?.get("focus") ?? "").toUpperCase();
  const [data, setData] = useState<MarketsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [autoUpdate, setAutoUpdate] = useState(true);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (!focusSymbol || !data) return;
    const match = data.rows.find(
      (row) => row.symbol.toUpperCase() === focusSymbol || row.id.toUpperCase() === focusSymbol,
    );
    if (!match) return;
    const node = cardRefs.current[match.id];
    if (!node) return;
    node.scrollIntoView({ behavior: "smooth", block: "center" });
    node.classList.add("markets-card-focus");
    const id = window.setTimeout(() => node.classList.remove("markets-card-focus"), 2200);
    return () => window.clearTimeout(id);
  }, [focusSymbol, data]);

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
            {autoUpdate ? "Live · 60s" : language === "vi" ? "Tạm dừng" : "Paused"}
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

      <section className="relative z-10 w-full px-4 pb-12 pt-5 sm:px-6 lg:px-10 xl:px-14 2xl:px-20">
        <div className="border-b border-[#15351e] pb-5 sm:pb-7">
          <p className="font-mono text-[0.62rem] uppercase tracking-[0.28em] text-[#8f8579]">
            {language === "vi" ? "Trang chủ" : "Home"}
            <span className="mx-2 text-[#5e574e]">/</span>
            {language === "vi" ? "Thị trường realtime" : "Realtime markets"}
          </p>
          <h2 className="mt-3 font-display text-[clamp(2.4rem,4.4vw,4.4rem)] font-black leading-[0.92] tracking-[-0.06em] text-[#f4eadc]">
            {language === "vi" ? "vàng · bạc · top 10 crypto · forex" : "gold · silver · top 10 crypto · forex"}
          </h2>
          <p className="mt-3 max-w-3xl text-[0.85rem] leading-7 text-[#c4b9ad] sm:text-base">
            {language === "vi"
              ? "Giá realtime + biểu đồ 7 ngày cho top 10 crypto, vàng (PAXG), bạc (XAG), và 4 cặp ngoại tệ lớn (USD/VND, CNY/VND, TWD/VND, JPY/VND). Tự cập nhật mỗi 60 giây."
              : "Realtime prices + 7-day sparkline for the top 10 cryptos, gold (PAXG), silver (XAG), and 4 forex pairs (USD/VND, CNY/VND, TWD/VND, JPY/VND). Auto-refresh every 60s."}
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

        {!data && loading ? (
          <div className="mt-10 flex h-40 items-center justify-center">
            <LoaderCircle className="size-6 animate-spin text-[#45a85d]" />
          </div>
        ) : null}

        {data ? (
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {data.rows.map((row) => (
              <div
                key={row.id}
                ref={(node) => {
                  cardRefs.current[row.id] = node;
                }}
              >
                <MarketCard row={row} language={language} />
              </div>
            ))}
          </div>
        ) : null}

        <div className="mt-8 grid gap-3 lg:grid-cols-2">
          <div className="rounded-xl border border-[#15351e] bg-[#050c07]/72 p-4">
            <div className="flex items-center gap-2 font-mono text-[0.58rem] uppercase tracking-[0.18em] text-[#7dd391]">
              <span className="size-1.5 rounded-full bg-[#45a85d]" />
              {language === "vi" ? "Nguồn" : "Sources"}
            </div>
            <ul className="mt-2 space-y-1 text-[0.78rem] leading-5 text-[#b5ab9f]">
              <li>• <span className="text-[#7dd391]">CoinGecko</span> — Top 10 crypto + PAX Gold (PAXG ≈ 1 oz vàng) + sparkline 7 ngày</li>
              <li>• <span className="text-[#7dd391]">gold-api.com</span> — giá bạc spot (XAG)</li>
              <li>• <span className="text-[#7dd391]">Exchange-Rate-API</span> — tỉ giá USD/VND</li>
            </ul>
          </div>
          <div className="rounded-xl border border-[#3b2a0d] bg-[#100b04]/72 p-4">
            <div className="flex items-center gap-2 font-mono text-[0.58rem] uppercase tracking-[0.18em] text-[#d6a548]">
              <span className="size-1.5 rounded-full bg-[#d6a548]" />
              {language === "vi" ? "Lưu ý" : "Note"}
            </div>
            <p className="mt-2 text-[0.78rem] leading-5 text-[#b5ab9f]">
              {language === "vi"
                ? "Số liệu chỉ tham khảo. Giao dịch thật cần broker chính thống. Sparkline của bạc là ước lượng từ giá mở/đóng cửa (free tier không có lịch sử 7 ngày)."
                : "Reference figures only. Real trading needs a regulated broker. Silver sparkline is approximated from open/close (no 7d history on free tier)."}
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

function MarketCard({ row, language }: Readonly<{ row: MarketRow; language: "vi" | "en" }>) {
  const change = row.change24h;
  const tone = change === null ? "neutral" : change >= 0 ? "up" : "down";
  const stroke = tone === "up" ? "#7dd391" : tone === "down" ? "#ffb4ad" : "#9a9087";
  const fill = tone === "up" ? "rgba(125,211,145,0.18)" : tone === "down" ? "rgba(255,180,173,0.16)" : "rgba(154,144,135,0.14)";
  const isForex = row.kind === "forex";

  const badgeClass = (() => {
    if (row.kind === "metal") {
      if (row.symbol === "XAG") return "border-[#c0c0c0]/35 bg-[#c0c0c0]/10 text-[#e9e9e9]";
      return "border-[#d6a548]/35 bg-[#d6a548]/12 text-[#fff2d3]";
    }
    if (row.kind === "forex") {
      return "border-[#47c9d9]/35 bg-[#47c9d9]/12 text-[#cdf3fa]";
    }
    return "border-[#45a85d]/35 bg-[#45a85d]/12 text-[#dff8e4]";
  })();

  const kindLabel = (() => {
    if (row.kind === "metal") return language === "vi" ? "Kim loại quý" : "Precious metal";
    if (row.kind === "forex") return language === "vi" ? "Ngoại tệ" : "Forex";
    return "Crypto";
  })();

  return (
    <div className="markets-card group relative overflow-hidden rounded-xl border border-[#15351e] bg-[#050c07]/72 p-4 transition hover:border-[#45a85d]/45 hover:bg-[#0a1a0d]/72">
      <div className="flex items-center gap-3">
        <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-md border font-display text-[0.75rem] font-bold tracking-tight", badgeClass)}>
          {row.symbol}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[0.95rem] font-bold text-[#f4eadc]">{row.name}</div>
          <div className="font-mono text-[0.5rem] uppercase tracking-[0.16em] text-[#5e574e]">{kindLabel}</div>
        </div>
        {change !== null ? (
          <div
            className={cn(
              "flex shrink-0 items-center gap-1 rounded-md px-2 py-1 font-mono text-[0.68rem] font-bold tabular-nums",
              tone === "up"
                ? "bg-[#45a85d]/14 text-[#7dd391]"
                : tone === "down"
                ? "bg-[#ef4444]/14 text-[#ffb4ad]"
                : "bg-white/5 text-[#9a9087]",
            )}
          >
            {tone === "up" ? <ArrowUp className="size-3" /> : tone === "down" ? <ArrowDown className="size-3" /> : null}
            {fmtChange(change)}
          </div>
        ) : null}
      </div>

      <div className="mt-3 flex items-baseline justify-between gap-3">
        {isForex ? (
          <>
            <div className="font-mono text-[1.25rem] font-bold tabular-nums text-[#f4eadc] sm:text-[1.4rem]">{fmtVnd(row.vnd)}</div>
            <div className="font-mono text-[0.7rem] tabular-nums text-[#a79d91]">1 {row.symbol}</div>
          </>
        ) : (
          <>
            <div className="font-mono text-[1.25rem] font-bold tabular-nums text-[#f4eadc] sm:text-[1.4rem]">{fmtUsd(row.usd)}</div>
            <div className="font-mono text-[0.7rem] tabular-nums text-[#a79d91]">{fmtVnd(row.vnd)}</div>
          </>
        )}
      </div>

      <Sparkline points={row.sparkline} stroke={stroke} fill={fill} />
    </div>
  );
}

function Sparkline({ points, stroke, fill }: Readonly<{ points: number[]; stroke: string; fill: string }>) {
  const path = useMemo(() => buildSparkline(points), [points]);
  if (!path) {
    return <div className="mt-3 h-14 rounded-md bg-white/[0.02]" />;
  }
  return (
    <svg viewBox="0 0 200 60" preserveAspectRatio="none" className="mt-3 h-14 w-full" aria-hidden="true">
      <path d={path.area} fill={fill} />
      <path d={path.line} fill="none" stroke={stroke} strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function buildSparkline(points: number[]): { line: string; area: string } | null {
  if (!points || points.length < 2) return null;
  // Downsample to ~80 points so the SVG path stays small.
  const max = 80;
  const step = points.length > max ? points.length / max : 1;
  const sampled: number[] = [];
  for (let i = 0; i < points.length; i += step) sampled.push(points[Math.floor(i)]);
  if (sampled.length < 2) return null;

  let lo = Infinity;
  let hi = -Infinity;
  for (const v of sampled) {
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  const span = hi - lo || 1;
  const w = 200;
  const h = 60;
  const pad = 4;
  const drawW = w;
  const drawH = h - pad * 2;

  const line = sampled
    .map((v, i) => {
      const x = (i / (sampled.length - 1)) * drawW;
      const y = pad + drawH - ((v - lo) / span) * drawH;
      return `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");

  const area = `${line} L ${drawW.toFixed(2)} ${h} L 0 ${h} Z`;
  return { line, area };
}

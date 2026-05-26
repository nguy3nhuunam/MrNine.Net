"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  CircleDot,
  Eye,
  EyeOff,
  GripVertical,
  LayoutGrid,
  Loader2,
  Lock,
  Plus,
  Save,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Trash2,
  Type,
  Wrench,
} from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { cn } from "@/lib/utils";
import type { StoreItem, StoreItemKind } from "@/lib/ai-store-catalog";

type Section = "overview" | "hero" | "modules" | "store" | "themes" | "stats";

type SiteConfig = {
  hero: { vi: string[]; en: string[] };
  modules: Record<string, { hidden?: boolean; comingSoon?: boolean; detailVi?: string; detailEn?: string }>;
  themes: Record<string, { hidden?: boolean }>;
};

const MODULE_TITLES = [
  "AI Playground",
  "Photo Fix",
  "Smart Recap",
  "DocSense",
  "Story Writer",
  "Language Tutor",
  "Mystic Deck",
  "Voice Lab",
  "Markets",
  "AI Store",
  "Tools",
  "Calculators",
];

const THEME_VALUES = ["auto", "crimson", "signal", "gold", "frost", "eclipse", "plasma"];

const fmtVnd = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 });

export function AdminShell({ adminEmail }: Readonly<{ adminEmail: string }>) {
  const { language } = useLanguage();
  const [section, setSection] = useState<Section>("overview");
  const [config, setConfig] = useState<SiteConfig | null>(null);
  const [products, setProducts] = useState<StoreItem[]>([]);
  const [stats, setStats] = useState<{ byModule: Record<string, number>; total: number }>({ byModule: {}, total: 0 });
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    void Promise.all([
      fetch("/api/admin/config", { cache: "no-store" }).then((r) => r.json()).then(setConfig).catch(() => null),
      fetch("/api/admin/products", { cache: "no-store" }).then((r) => r.json()).then((d) => setProducts(d.items ?? [])).catch(() => null),
      fetch("/api/admin/stats", { cache: "no-store" }).then((r) => r.json()).then(setStats).catch(() => null),
    ]);
  }, []);

  async function saveConfig(patch: Partial<SiteConfig>) {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = (await res.json()) as SiteConfig;
      setConfig(data);
      setSavedAt(Date.now());
    } finally {
      setSaving(false);
    }
  }

  const sections: ReadonlyArray<{ id: Section; vi: string; en: string; icon: typeof Sparkles; hintVi: string; hintEn: string }> = [
    { id: "overview", vi: "Tổng quan", en: "Overview", icon: LayoutGrid, hintVi: "Bảng điều khiển", hintEn: "Control panel" },
    { id: "hero", vi: "Hero", en: "Hero", icon: Type, hintVi: "Câu chạy banner", hintEn: "Banner headlines" },
    { id: "modules", vi: "Modules", en: "Modules", icon: CircleDot, hintVi: "12 thẻ trang chủ", hintEn: "12 home tiles" },
    { id: "store", vi: "AI Store", en: "AI Store", icon: ShoppingBag, hintVi: "Sản phẩm bán", hintEn: "Catalog" },
    { id: "themes", vi: "Themes", en: "Themes", icon: Sparkles, hintVi: "7 giao diện", hintEn: "7 themes" },
    { id: "stats", vi: "Stats", en: "Stats", icon: BarChart3, hintVi: "Lưu lượng module", hintEn: "Module traffic" },
  ];

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
            <ShieldCheck className="size-4" />
          </div>
          <div className="hidden min-w-0 sm:block">
            <p className="font-mono text-[0.58rem] uppercase tracking-[0.22em] text-[#f0c86d]">MrNine Control</p>
            <h1 className="truncate text-base font-black tracking-[-0.04em] text-[#f4eadc]">Admin</h1>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {savedAt ? (
            <span className="hidden h-9 items-center gap-2 rounded-full border border-[#45a85d]/40 bg-[#071109]/72 px-3 font-mono text-[0.58rem] uppercase tracking-[0.18em] text-[#7dd391] md:flex">
              <span className="size-1.5 rounded-full bg-[#45a85d] markets-pulse" />
              {language === "vi" ? "Đã lưu" : "Saved"} · {new Date(savedAt).toLocaleTimeString(language === "vi" ? "vi-VN" : "en-US")}
            </span>
          ) : null}
          <span className="hidden h-9 items-center gap-2 rounded-full border border-[#d6a548]/30 bg-[#1b1508] px-3 font-mono text-[0.58rem] uppercase tracking-[0.18em] text-[#f0c86d] lg:flex">
            <Lock className="size-3" />
            {adminEmail || (language === "vi" ? "Quản trị" : "Admin")}
          </span>
        </div>
      </header>

      <section className="relative z-10 w-full px-4 pb-12 pt-5 sm:px-6 lg:px-10 xl:px-14 2xl:px-20">
        <div className="border-b border-[#3b2a0d] pb-5 sm:pb-7">
          <p className="font-mono text-[0.62rem] uppercase tracking-[0.28em] text-[#8f8579]">
            {language === "vi" ? "Trang chủ" : "Home"}
            <span className="mx-2 text-[#5e574e]">/</span>
            {language === "vi" ? "Phòng điều khiển admin" : "Admin control room"}
          </p>
          <h2 className="mt-3 font-display text-[clamp(2.4rem,4.4vw,4.4rem)] font-black leading-[0.92] tracking-[-0.06em] text-[#f4eadc]">
            {language === "vi" ? "hero · modules · store · themes · stats" : "hero · modules · store · themes · stats"}
          </h2>
          <p className="mt-3 max-w-3xl text-[0.85rem] leading-7 text-[#c4b9ad] sm:text-base">
            {language === "vi"
              ? "Bảng điều khiển toàn bộ web. Sửa câu chạy banner, ẩn/hiện 12 thẻ module, thêm/xoá tài khoản AI Store, tắt theme và xem lưu lượng thực tế. Mọi thay đổi đẩy ra trang chủ trong vòng 30 giây."
              : "Single control room for the whole site. Edit hero headlines, hide modules, manage AI Store catalog, toggle themes and watch real traffic. Changes propagate to the live site within 30 seconds."}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3 font-mono text-[0.5rem] uppercase tracking-[0.18em] text-[#f0c86d]">
            <span className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-[#d6a548]" />
              {MODULE_TITLES.length} {language === "vi" ? "module" : "modules"}
            </span>
            <span className="text-[#5e574e]">/</span>
            <span>{products.length} {language === "vi" ? "sản phẩm" : "products"}</span>
            <span className="text-[#5e574e]">/</span>
            <span>{stats.total.toLocaleString(language === "vi" ? "vi-VN" : "en-US")} {language === "vi" ? "lượt mở" : "visits"}</span>
            <span className="text-[#5e574e]">/</span>
            <span className="text-[#7dd391]">cache 30s</span>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {sections.map((s) => {
            const Icon = s.icon;
            const isActive = section === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setSection(s.id)}
                className={cn(
                  "flex flex-col items-start gap-1.5 rounded-xl border px-3 py-3 text-left transition",
                  isActive
                    ? "border-[#d6a548]/65 bg-[#211606]/82 text-[#fff2d3]"
                    : "border-[#3b2a0d] bg-[#100b04]/70 text-[#f0c86d] hover:border-[#d6a548]/40 hover:text-[#f4eadc]",
                )}
              >
                <div className={cn(
                  "flex size-8 items-center justify-center rounded-md border",
                  isActive ? "border-[#d6a548]/65 bg-[#d6a548]/14" : "border-[#d6a548]/22 bg-[#d6a548]/8",
                )}>
                  <Icon className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[0.85rem] font-bold text-[#f4eadc]">{language === "vi" ? s.vi : s.en}</div>
                  <div className="font-mono text-[0.5rem] uppercase tracking-[0.14em] text-[#5e574e]">
                    {language === "vi" ? s.hintVi : s.hintEn}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-5">
          {!config ? (
            <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-[#3b2a0d] bg-[#100b04]/40">
              <Loader2 className="mr-2 size-4 animate-spin text-[#d6a548]" />
              <span className="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-[#a79d91]">
                {language === "vi" ? "Đang tải config..." : "Loading config..."}
              </span>
            </div>
          ) : (
            <>
              {section === "overview" ? <OverviewPanel config={config} products={products} stats={stats} language={language} /> : null}
              {section === "hero" ? <HeroPanel config={config} saving={saving} onSave={saveConfig} language={language} /> : null}
              {section === "modules" ? <ModulesPanel config={config} saving={saving} onSave={saveConfig} stats={stats} language={language} /> : null}
              {section === "store" ? <StorePanel products={products} setProducts={setProducts} language={language} /> : null}
              {section === "themes" ? <ThemesPanel config={config} saving={saving} onSave={saveConfig} language={language} /> : null}
              {section === "stats" ? <StatsPanel stats={stats} language={language} /> : null}
            </>
          )}
        </div>
      </section>
    </main>
  );
}

// ============================================================
// Shared primitives — match Markets / Tools / Calculators
// ============================================================

function Panel({ title, action, children }: Readonly<{ title: string; action?: React.ReactNode; children: React.ReactNode }>) {
  return (
    <div className="rounded-xl border border-[#3b2a0d] bg-[#100b04]/72 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 font-mono text-[0.58rem] uppercase tracking-[0.18em] text-[#f0c86d]">
          <span className="size-1.5 rounded-full bg-[#d6a548]" />
          {title}
        </div>
        {action ?? null}
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function PrimaryButton({ saving, onClick, label, icon: Icon = Save }: Readonly<{ saving?: boolean; onClick: () => void; label: string; icon?: typeof Save }>) {
  return (
    <button
      type="button"
      disabled={saving}
      onClick={onClick}
      className="flex h-9 items-center gap-2 rounded-md border border-[#d6a548]/40 bg-[#d6a548]/14 px-3 font-mono text-[0.6rem] font-bold uppercase tracking-[0.16em] text-[#fff2d3] transition hover:border-[#d6a548]/70 hover:bg-[#d6a548]/22 disabled:opacity-55"
    >
      {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Icon className="size-3.5" />}
      {label}
    </button>
  );
}

function GhostButton({ onClick, label, tone = "default", icon: Icon }: Readonly<{ onClick: () => void; label: string; tone?: "default" | "danger"; icon?: typeof Save }>) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-7 items-center gap-1.5 rounded-md border px-2.5 font-mono text-[0.55rem] uppercase tracking-[0.16em] transition",
        tone === "danger"
          ? "border-[#ef4444]/35 bg-[#ef4444]/8 text-[#ffb4ad] hover:border-[#ef4444]/65 hover:bg-[#ef4444]/14"
          : "border-white/10 bg-white/[0.025] text-[#a79d91] hover:border-white/30 hover:text-[#f4eadc]",
      )}
    >
      {Icon ? <Icon className="size-3" /> : null}
      {label}
    </button>
  );
}

function Input({ value, onChange, placeholder, type = "text" }: Readonly<{ value: string | number; onChange: (v: string) => void; placeholder?: string; type?: string }>) {
  return (
    <input
      type={type}
      value={value === undefined || value === null ? "" : value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-md border border-[#3b2a0d] bg-[#1a1209] px-3 py-2 font-mono text-[0.85rem] text-[#f4eadc] outline-none placeholder:text-[#5e574e] focus:border-[#d6a548]/55"
    />
  );
}

function Field({ label, children }: Readonly<{ label: string; children: React.ReactNode }>) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[#f0c86d]">{label}</span>
      {children}
    </label>
  );
}

// ============================================================
// Overview
// ============================================================

function OverviewPanel({ config, products, stats, language }: Readonly<{ config: SiteConfig; products: StoreItem[]; stats: { byModule: Record<string, number>; total: number }; language: "vi" | "en" }>) {
  const totalHidden = Object.values(config.modules).filter((m) => m?.hidden).length;
  const totalThemesHidden = Object.values(config.themes).filter((t) => t?.hidden).length;
  const topModule = Object.entries(stats.byModule).sort((a, b) => b[1] - a[1])[0];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label={language === "vi" ? "Module hiển thị" : "Modules visible"}
          value={`${MODULE_TITLES.length - totalHidden}/${MODULE_TITLES.length}`}
          icon={CircleDot}
        />
        <StatCard
          label={language === "vi" ? "Sản phẩm Store" : "Store items"}
          value={products.length.toString()}
          icon={ShoppingBag}
        />
        <StatCard
          label={language === "vi" ? "Lượt mở module" : "Module opens"}
          value={stats.total.toLocaleString(language === "vi" ? "vi-VN" : "en-US")}
          icon={BarChart3}
        />
        <StatCard
          label={language === "vi" ? "Module hot nhất" : "Top module"}
          value={topModule ? `${topModule[0]}` : "—"}
          sub={topModule ? `${topModule[1].toLocaleString(language === "vi" ? "vi-VN" : "en-US")} ${language === "vi" ? "lượt" : "visits"}` : undefined}
          icon={Sparkles}
        />
      </div>

      <Panel title={language === "vi" ? "Hướng dẫn nhanh" : "Cheatsheet"}>
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            { vi: "Hero: thêm/xoá câu chạy banner trang chủ. 1 dòng = 1 câu, lưu là user thấy ngay.", en: "Hero: edit homepage headlines. One per line. Saves instantly." },
            { vi: "Modules: ẩn thẻ khỏi grid + rail, đánh dấu Coming soon, sửa chú thích VI/EN.", en: "Modules: hide tiles, mark coming soon, custom VI/EN tagline." },
            { vi: "AI Store: thêm/sửa/xoá tài khoản, đặt giá, badge HOT/NEW, stock, ghi chú.", en: "AI Store: full CRUD, pricing, badges, stock, notes." },
            { vi: "Themes: tắt theme không muốn user chọn. Còn lại 7 - " + totalThemesHidden + ".", en: "Themes: disable any of 7 looks. " + (7 - totalThemesHidden) + " active." },
            { vi: "Stats: track lượt mở module realtime để biết user dùng gì nhiều nhất.", en: "Stats: realtime module opens to see what users actually use." },
            { vi: "Cache: thay đổi đẩy ra production sau tối đa 30 giây (in-memory + ISR).", en: "Cache: changes go live within 30s (in-memory + ISR)." },
          ].map((row, i) => (
            <div key={i} className="rounded-md border border-[#3b2a0d] bg-[#1a1209]/60 px-3 py-2.5 text-[0.78rem] leading-5 text-[#dfd5c7]">
              {language === "vi" ? row.vi : row.en}
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function StatCard({ label, value, sub, icon: Icon }: Readonly<{ label: string; value: string; sub?: string; icon: typeof Sparkles }>) {
  return (
    <div className="rounded-xl border border-[#3b2a0d] bg-[#100b04]/72 p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[#f0c86d]">{label}</span>
        <span className="flex size-7 items-center justify-center rounded-md border border-[#d6a548]/22 bg-[#d6a548]/8 text-[#d6a548]">
          <Icon className="size-3.5" />
        </span>
      </div>
      <div className="mt-3 truncate font-display text-[1.6rem] font-black leading-tight tracking-[-0.04em] text-[#fff2d3] sm:text-[1.9rem]">
        {value}
      </div>
      {sub ? <div className="mt-0.5 font-mono text-[0.5rem] uppercase tracking-[0.16em] text-[#5e574e]">{sub}</div> : null}
    </div>
  );
}

// ============================================================
// Hero
// ============================================================

function HeroPanel({ config, saving, onSave, language }: Readonly<{ config: SiteConfig; saving: boolean; onSave: (patch: Partial<SiteConfig>) => Promise<void>; language: "vi" | "en" }>) {
  const [vi, setVi] = useState(config.hero.vi.join("\n"));
  const [en, setEn] = useState(config.hero.en.join("\n"));

  const viCount = vi.split("\n").filter((l) => l.trim()).length;
  const enCount = en.split("\n").filter((l) => l.trim()).length;

  return (
    <div className="space-y-3">
      <div className="grid gap-3 lg:grid-cols-2">
        <Panel title={language === "vi" ? "Tiếng Việt" : "Vietnamese"} action={
          <span className="font-mono text-[0.55rem] uppercase tracking-[0.16em] text-[#7dd391]">
            {viCount} {language === "vi" ? "câu" : "lines"}
          </span>
        }>
          <textarea
            value={vi}
            onChange={(e) => setVi(e.target.value)}
            rows={14}
            placeholder={language === "vi" ? "Mỗi dòng là 1 câu hero..." : "One headline per line..."}
            className="w-full resize-y rounded-md border border-[#3b2a0d] bg-[#1a1209] px-3 py-2 font-mono text-[0.85rem] text-[#f4eadc] outline-none placeholder:text-[#5e574e] focus:border-[#d6a548]/55"
          />
        </Panel>
        <Panel title="English" action={
          <span className="font-mono text-[0.55rem] uppercase tracking-[0.16em] text-[#7dd391]">
            {enCount} lines
          </span>
        }>
          <textarea
            value={en}
            onChange={(e) => setEn(e.target.value)}
            rows={14}
            placeholder="One headline per line..."
            className="w-full resize-y rounded-md border border-[#3b2a0d] bg-[#1a1209] px-3 py-2 font-mono text-[0.85rem] text-[#f4eadc] outline-none placeholder:text-[#5e574e] focus:border-[#d6a548]/55"
          />
        </Panel>
      </div>

      <div className="flex items-center justify-end gap-2">
        <PrimaryButton
          saving={saving}
          label={language === "vi" ? "Lưu hero" : "Save hero"}
          onClick={() => onSave({ hero: { vi: vi.split("\n").map((s) => s.trim()).filter(Boolean), en: en.split("\n").map((s) => s.trim()).filter(Boolean) } })}
        />
      </div>
    </div>
  );
}

// ============================================================
// Modules
// ============================================================

function ModulesPanel({ config, saving, onSave, stats, language }: Readonly<{ config: SiteConfig; saving: boolean; onSave: (patch: Partial<SiteConfig>) => Promise<void>; stats: { byModule: Record<string, number> }; language: "vi" | "en" }>) {
  const [draft, setDraft] = useState(config.modules);
  const totalHidden = Object.values(draft).filter((m) => m?.hidden).length;
  const totalSoon = Object.values(draft).filter((m) => m?.comingSoon).length;
  const dirty = JSON.stringify(draft) !== JSON.stringify(config.modules);

  return (
    <Panel
      title={`${MODULE_TITLES.length - totalHidden}/${MODULE_TITLES.length} ${language === "vi" ? "hiển thị" : "visible"} · ${totalSoon} ${language === "vi" ? "sắp ra mắt" : "soon"}`}
      action={
        <PrimaryButton
          saving={saving}
          label={language === "vi" ? "Lưu modules" : "Save modules"}
          onClick={() => onSave({ modules: draft })}
        />
      }
    >
      {dirty ? (
        <div className="mb-3 rounded-md border border-[#d6a548]/40 bg-[#211606]/60 px-3 py-2 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-[#fff2d3]">
          {language === "vi" ? "Có thay đổi chưa lưu" : "Unsaved changes"}
        </div>
      ) : null}
      <div className="space-y-2">
        {MODULE_TITLES.map((title) => {
          const cur = draft[title] ?? {};
          const visits = stats.byModule[title] ?? 0;
          const hidden = Boolean(cur.hidden);
          const soon = Boolean(cur.comingSoon);
          return (
            <div key={title} className={cn(
              "rounded-lg border bg-[#1a1209]/60 p-3 transition",
              hidden ? "border-[#5a3408] opacity-60" : "border-[#3b2a0d] hover:border-[#d6a548]/30",
            )}>
              <div className="flex items-center gap-3">
                <GripVertical className="size-3.5 shrink-0 text-[#5e574e]" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[0.95rem] font-bold text-[#f4eadc]">{title}</span>
                    {visits > 0 ? (
                      <span className="rounded border border-[#7dd391]/35 bg-[#7dd391]/10 px-1.5 py-0.5 font-mono text-[0.5rem] uppercase tracking-[0.16em] text-[#7dd391]">
                        {visits.toLocaleString(language === "vi" ? "vi-VN" : "en-US")} {language === "vi" ? "lượt" : "visits"}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                    <Input
                      value={cur.detailVi ?? ""}
                      onChange={(v) => setDraft({ ...draft, [title]: { ...cur, detailVi: v } })}
                      placeholder={language === "vi" ? "Detail VI (trống = mặc định)" : "Detail VI (blank = default)"}
                    />
                    <Input
                      value={cur.detailEn ?? ""}
                      onChange={(v) => setDraft({ ...draft, [title]: { ...cur, detailEn: v } })}
                      placeholder={language === "vi" ? "Detail EN (trống = mặc định)" : "Detail EN (blank = default)"}
                    />
                  </div>
                </div>
                <div className="flex shrink-0 flex-col gap-1.5">
                  <button
                    type="button"
                    onClick={() => setDraft({ ...draft, [title]: { ...cur, comingSoon: !soon } })}
                    className={cn(
                      "rounded-md border px-2.5 py-1 font-mono text-[0.55rem] uppercase tracking-[0.16em] transition",
                      soon ? "border-[#d6a548]/65 bg-[#d6a548]/14 text-[#fff2d3]" : "border-white/10 bg-white/[0.025] text-[#a79d91] hover:border-[#d6a548]/30",
                    )}
                  >
                    {language === "vi" ? "Soon" : "Soon"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDraft({ ...draft, [title]: { ...cur, hidden: !hidden } })}
                    className={cn(
                      "flex items-center gap-1.5 rounded-md border px-2.5 py-1 font-mono text-[0.55rem] uppercase tracking-[0.16em] transition",
                      hidden
                        ? "border-[#ef4444]/55 bg-[#ef4444]/12 text-[#ffd7d3]"
                        : "border-[#7dd391]/45 bg-[#7dd391]/10 text-[#7dd391]",
                    )}
                  >
                    {hidden ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
                    {hidden ? (language === "vi" ? "Ẩn" : "Hidden") : (language === "vi" ? "Hiện" : "Visible")}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

// ============================================================
// Themes
// ============================================================

function ThemesPanel({ config, saving, onSave, language }: Readonly<{ config: SiteConfig; saving: boolean; onSave: (patch: Partial<SiteConfig>) => Promise<void>; language: "vi" | "en" }>) {
  const [draft, setDraft] = useState(config.themes);
  const swatches: Record<string, string> = {
    auto: "bg-[#d6a548]",
    crimson: "bg-[#ef4444]",
    signal: "bg-[#45a85d]",
    gold: "bg-[#d6a548]",
    frost: "bg-[#47c9d9]",
    eclipse: "bg-[#a78bfa]",
    plasma: "bg-[#ec4899]",
  };

  return (
    <Panel
      title={`${THEME_VALUES.length - Object.values(draft).filter((t) => t?.hidden).length}/${THEME_VALUES.length} ${language === "vi" ? "đang bật" : "enabled"}`}
      action={<PrimaryButton saving={saving} label={language === "vi" ? "Lưu themes" : "Save themes"} onClick={() => onSave({ themes: draft })} />}
    >
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {THEME_VALUES.map((t) => {
          const hidden = Boolean(draft[t]?.hidden);
          return (
            <button
              key={t}
              type="button"
              onClick={() => setDraft({ ...draft, [t]: { hidden: !hidden } })}
              className={cn(
                "flex items-center gap-3 rounded-xl border px-3 py-3 text-left transition",
                hidden
                  ? "border-[#ef4444]/45 bg-[#1a0606]/60 text-[#ffb4ad]"
                  : "border-[#3b2a0d] bg-[#1a1209]/60 text-[#fff2d3] hover:border-[#d6a548]/45",
              )}
            >
              <span className={cn("size-8 shrink-0 rounded-md", swatches[t] || "bg-white/10", hidden && "opacity-40")} />
              <span className="min-w-0 flex-1">
                <span className="block font-mono text-[0.7rem] uppercase tracking-[0.18em]">{t}</span>
                <span className="block font-mono text-[0.5rem] uppercase tracking-[0.16em] text-[#5e574e]">
                  {hidden ? (language === "vi" ? "Tắt" : "Disabled") : (language === "vi" ? "Bật" : "Enabled")}
                </span>
              </span>
              {hidden ? <EyeOff className="size-3.5 shrink-0" /> : <Eye className="size-3.5 shrink-0" />}
            </button>
          );
        })}
      </div>
    </Panel>
  );
}

// ============================================================
// Stats
// ============================================================

function StatsPanel({ stats, language }: Readonly<{ stats: { byModule: Record<string, number>; total: number }; language: "vi" | "en" }>) {
  const sorted = Object.entries(stats.byModule).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...sorted.map((s) => s[1]));

  return (
    <Panel title={`${stats.total.toLocaleString(language === "vi" ? "vi-VN" : "en-US")} ${language === "vi" ? "lượt mở module" : "total module opens"}`}>
      {sorted.length === 0 ? (
        <div className="rounded-md border border-dashed border-[#3b2a0d] bg-[#1a1209]/30 px-4 py-8 text-center">
          <p className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-[#a79d91]">
            {language === "vi" ? "Chưa có dữ liệu" : "No data yet"}
          </p>
          <p className="mt-2 text-[0.78rem] text-[#dfd5c7]">
            {language === "vi" ? "Mở module bất kỳ trên home, /api/track sẽ ghi log realtime." : "Open any module on home, /api/track records realtime."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map(([name, count]) => (
            <div key={name} className="flex items-center gap-3 rounded-md border border-[#3b2a0d] bg-[#1a1209]/60 px-3 py-2">
              <span className="w-32 shrink-0 truncate text-[0.85rem] font-bold text-[#f4eadc]">{name}</span>
              <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-[#0e0c08]">
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#d6a548] to-[#f0c86d]"
                  style={{ width: `${(count / max) * 100}%` }}
                />
              </div>
              <span className="w-20 shrink-0 text-right font-mono text-[0.85rem] font-bold tabular-nums text-[#fff2d3]">
                {count.toLocaleString(language === "vi" ? "vi-VN" : "en-US")}
              </span>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

// ============================================================
// Store CRUD
// ============================================================

function StorePanel({ products, setProducts, language }: Readonly<{ products: StoreItem[]; setProducts: (items: StoreItem[]) => void; language: "vi" | "en" }>) {
  const [editing, setEditing] = useState<StoreItem | null>(null);
  const [filter, setFilter] = useState<StoreItemKind | "all">("all");

  const visible = useMemo(() => {
    if (filter === "all") return products;
    return products.filter((p) => p.kind === filter);
  }, [products, filter]);

  async function deleteItem(id: string) {
    if (!confirm(language === "vi" ? "Xoá sản phẩm này?" : "Delete this product?")) return;
    await fetch(`/api/admin/products?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    setProducts(products.filter((p) => p.id !== id));
  }

  async function saveItem(item: StoreItem) {
    await fetch("/api/admin/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item),
    });
    const exists = products.some((p) => p.id === item.id);
    setProducts(exists ? products.map((p) => (p.id === item.id ? item : p)) : [...products, item]);
    setEditing(null);
  }

  const filters: ReadonlyArray<{ id: StoreItemKind | "all"; vi: string; en: string }> = [
    { id: "all", vi: "Tất cả", en: "All" },
    { id: "chatbot", vi: "Chatbot", en: "Chatbot" },
    { id: "api", vi: "API", en: "API" },
    { id: "code", vi: "Code", en: "Code" },
    { id: "image", vi: "Ảnh", en: "Image" },
    { id: "video", vi: "Video", en: "Video" },
    { id: "audio", vi: "Audio", en: "Audio" },
  ];

  return (
    <div className="space-y-3">
      <Panel
        title={`${visible.length}/${products.length} ${language === "vi" ? "sản phẩm" : "products"}`}
        action={
          <PrimaryButton
            label={language === "vi" ? "Thêm" : "Add"}
            icon={Plus}
            onClick={() => setEditing({
              id: `new-${Date.now()}`,
              brand: "",
              product: "",
              detail: "",
              kind: "chatbot",
              duration: "1 tháng",
              priceVnd: 0,
              stock: "in",
              warranty: "Bảo hành 1-1",
            })}
          />
        }
      >
        <div className="flex flex-wrap gap-1.5">
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={cn(
                "rounded-md border px-2.5 py-1 font-mono text-[0.55rem] uppercase tracking-[0.16em] transition",
                filter === f.id
                  ? "border-[#d6a548]/65 bg-[#d6a548]/14 text-[#fff2d3]"
                  : "border-white/10 bg-white/[0.025] text-[#a79d91] hover:border-[#d6a548]/30 hover:text-[#f4eadc]",
              )}
            >
              {language === "vi" ? f.vi : f.en}
            </button>
          ))}
        </div>
      </Panel>

      {editing ? <ProductEditor item={editing} onCancel={() => setEditing(null)} onSave={saveItem} language={language} /> : null}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {visible.map((p) => {
          const stockBadge = p.stock === "in"
            ? { label: language === "vi" ? "Sẵn" : "Stock", tone: "border-[#45a85d]/40 bg-[#45a85d]/12 text-[#7dd391]" }
            : p.stock === "low"
            ? { label: language === "vi" ? "Sắp hết" : "Low", tone: "border-[#d6a548]/45 bg-[#d6a548]/14 text-[#fff2d3]" }
            : { label: language === "vi" ? "Đặt trước" : "Preorder", tone: "border-[#a78bfa]/45 bg-[#a78bfa]/14 text-[#c4b3ff]" };
          const discount = p.originalVnd && p.originalVnd > p.priceVnd ? Math.round((1 - p.priceVnd / p.originalVnd) * 100) : 0;
          return (
            <article
              key={p.id}
              className="group flex h-full flex-col gap-2 rounded-xl border border-[#3b2a0d] bg-[#100b04]/72 p-3 transition hover:border-[#d6a548]/45 hover:bg-[#1a1209]/82"
            >
              <header className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-[0.9rem] font-bold text-[#f4eadc]">{p.product}</span>
                    {p.badge ? (
                      <span className="rounded border border-[#ef4444]/45 bg-[#ef4444]/14 px-1 py-0.5 font-mono text-[0.46rem] font-bold uppercase tracking-[0.16em] text-[#ffb4ad]">
                        {p.badge}
                      </span>
                    ) : null}
                  </div>
                  <p className="font-mono text-[0.5rem] uppercase tracking-[0.16em] text-[#5e574e]">{p.brand} · {p.kind}</p>
                </div>
                <span className={cn("shrink-0 rounded-md border px-1.5 py-0.5 font-mono text-[0.5rem] uppercase tracking-[0.16em]", stockBadge.tone)}>
                  {stockBadge.label}
                </span>
              </header>

              <p className="line-clamp-2 text-[0.7rem] text-[#a79d91]">{p.detail || "—"}</p>

              <div className="flex items-end justify-between gap-2">
                <div>
                  <div className="font-mono text-[1rem] font-bold tabular-nums text-[#fff2d3]">{fmtVnd.format(p.priceVnd)}</div>
                  {p.originalVnd ? (
                    <div className="mt-0.5 flex items-center gap-1.5 font-mono text-[0.6rem] tabular-nums">
                      <span className="text-[#5e574e] line-through">{fmtVnd.format(p.originalVnd)}</span>
                      {discount > 0 ? <span className="text-[#7dd391]">−{discount}%</span> : null}
                    </div>
                  ) : null}
                </div>
                <span className="font-mono text-[0.5rem] uppercase tracking-[0.14em] text-[#5e574e]">{p.duration}</span>
              </div>

              <div className="mt-auto flex items-center gap-1.5 border-t border-[#3b2a0d] pt-2">
                <GhostButton onClick={() => setEditing(p)} label={language === "vi" ? "Sửa" : "Edit"} />
                <GhostButton onClick={() => deleteItem(p.id)} tone="danger" icon={Trash2} label={language === "vi" ? "Xoá" : "Delete"} />
                <ArrowRight className="ml-auto size-3 text-[#5e574e] transition group-hover:translate-x-0.5 group-hover:text-[#d6a548]" />
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function ProductEditor({ item, onCancel, onSave, language }: Readonly<{ item: StoreItem; onCancel: () => void; onSave: (item: StoreItem) => Promise<void>; language: "vi" | "en" }>) {
  const [draft, setDraft] = useState(item);
  const [busy, setBusy] = useState(false);

  const kinds: StoreItemKind[] = ["chatbot", "api", "image", "video", "audio", "code"];

  return (
    <Panel
      title={item.id.startsWith("new-")
        ? (language === "vi" ? "Thêm sản phẩm mới" : "New product")
        : (language === "vi" ? "Chỉnh sửa: " + item.product : "Edit: " + item.product)}
      action={
        <div className="flex items-center gap-1.5">
          <GhostButton onClick={onCancel} label={language === "vi" ? "Huỷ" : "Cancel"} />
          <PrimaryButton
            saving={busy}
            label={language === "vi" ? "Lưu" : "Save"}
            onClick={async () => {
              if (!draft.id || !draft.product || !draft.brand) return;
              setBusy(true);
              try { await onSave(draft); } finally { setBusy(false); }
            }}
          />
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="ID (slug)">
          <Input value={draft.id} onChange={(v) => setDraft({ ...draft, id: v })} placeholder="chatgpt-plus-1m" />
        </Field>
        <Field label="Brand">
          <Input value={draft.brand} onChange={(v) => setDraft({ ...draft, brand: v })} placeholder="OpenAI" />
        </Field>
        <Field label="Product">
          <Input value={draft.product} onChange={(v) => setDraft({ ...draft, product: v })} placeholder="ChatGPT Plus" />
        </Field>
        <div className="sm:col-span-2 lg:col-span-3">
          <Field label="Detail">
            <Input value={draft.detail} onChange={(v) => setDraft({ ...draft, detail: v })} placeholder="GPT-5, Sora 2, Advanced Voice" />
          </Field>
        </div>
        <Field label={language === "vi" ? "Loại" : "Kind"}>
          <select
            value={draft.kind}
            onChange={(e) => setDraft({ ...draft, kind: e.target.value as StoreItemKind })}
            className="w-full rounded-md border border-[#3b2a0d] bg-[#1a1209] px-3 py-2 font-mono text-[0.85rem] text-[#f4eadc] outline-none focus:border-[#d6a548]/55"
          >
            {kinds.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
        </Field>
        <Field label="Stock">
          <select
            value={draft.stock}
            onChange={(e) => setDraft({ ...draft, stock: e.target.value as StoreItem["stock"] })}
            className="w-full rounded-md border border-[#3b2a0d] bg-[#1a1209] px-3 py-2 font-mono text-[0.85rem] text-[#f4eadc] outline-none focus:border-[#d6a548]/55"
          >
            <option value="in">{language === "vi" ? "Sẵn hàng" : "In stock"}</option>
            <option value="low">{language === "vi" ? "Sắp hết" : "Low"}</option>
            <option value="preorder">{language === "vi" ? "Đặt trước" : "Preorder"}</option>
          </select>
        </Field>
        <Field label={language === "vi" ? "Thời hạn" : "Duration"}>
          <Input value={draft.duration} onChange={(v) => setDraft({ ...draft, duration: v })} placeholder="1 tháng" />
        </Field>
        <Field label={language === "vi" ? "Giá VND" : "Price VND"}>
          <Input type="number" value={draft.priceVnd} onChange={(v) => setDraft({ ...draft, priceVnd: Number(v) })} placeholder="380000" />
        </Field>
        <Field label={language === "vi" ? "Giá gốc VND" : "Original VND"}>
          <Input type="number" value={draft.originalVnd ?? ""} onChange={(v) => setDraft({ ...draft, originalVnd: v ? Number(v) : undefined })} placeholder="520000" />
        </Field>
        <Field label="Badge">
          <Input value={draft.badge ?? ""} onChange={(v) => setDraft({ ...draft, badge: v || undefined })} placeholder="HOT / NEW / BEST" />
        </Field>
        <Field label={language === "vi" ? "Bảo hành" : "Warranty"}>
          <Input value={draft.warranty} onChange={(v) => setDraft({ ...draft, warranty: v })} placeholder="Bảo hành 1-1" />
        </Field>
        <div className="sm:col-span-2 lg:col-span-3">
          <Field label={language === "vi" ? "Ghi chú" : "Notes"}>
            <Input value={draft.notes ?? ""} onChange={(v) => setDraft({ ...draft, notes: v || undefined })} placeholder={language === "vi" ? "Ghi chú thêm cho khách" : "Extra notes for customer"} />
          </Field>
        </div>
      </div>
    </Panel>
  );
}

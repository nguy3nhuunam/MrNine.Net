"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  BarChart3,
  Boxes,
  Check,
  ChevronRight,
  Eye,
  EyeOff,
  Gauge,
  LayoutGrid,
  Loader2,
  Lock,
  PackagePlus,
  Palette,
  Save,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Trash2,
  Type,
  Wand2,
} from "lucide-react";
import { languageOptions, useLanguage, type WebLanguage } from "@/components/LanguageProvider";
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

const currency = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 });

const copy = {
  en: {
    back: "Back to home",
    admin: "Admin",
    kicker: "MrNine control surface",
    title: "command, tune, publish",
    subtitle: "One protected operations deck for homepage copy, modules, AI Store products, theme availability, and live usage signals.",
    online: "Online",
    saved: "Saved",
    adminLock: "Admin access",
    search: "Search config, modules, products...",
    openLive: "Open live",
    modules: "Modules",
    products: "Products",
    visits: "Visits",
    cache: "Cache 30s",
    loading: "Loading admin config...",
    overview: "Overview",
    hero: "Hero",
    moduleDeck: "Modules",
    store: "AI Store",
    themes: "Themes",
    stats: "Stats",
    heroHint: "Typing headlines",
    modulesHint: "Homepage tiles",
    storeHint: "Catalog",
    themesHint: "Skins",
    statsHint: "Traffic",
    allSystems: "All systems",
    context: "Context",
    quickOps: "Quick ops",
    queue: "Queue clear",
    queueBody: "Config saves to the admin API and reaches the public site after cache refresh.",
    recent: "Recent focus",
    hidden: "Hidden",
    visible: "Visible",
    comingSoon: "Soon",
    enabled: "Enabled",
    disabled: "Disabled",
    save: "Save",
    saveHero: "Save hero",
    saveModules: "Save modules",
    saveThemes: "Save themes",
    addProduct: "Add product",
    edit: "Edit",
    delete: "Delete",
    cancel: "Cancel",
    newProduct: "New product",
    editProduct: "Edit product",
    noData: "No data yet",
    noDataBody: "Open modules from the homepage to populate traffic stats.",
    commandNotes: "Admin changes are deliberately dense and direct. No marketing layer, just controls.",
  },
  vi: {
    back: "Quay lại trang chủ",
    admin: "Admin",
    kicker: "Bề mặt điều khiển MrNine",
    title: "điều khiển, tinh chỉnh, xuất bản",
    subtitle: "Một bảng vận hành được bảo vệ cho nội dung trang chủ, module, sản phẩm AI Store, giao diện và tín hiệu sử dụng thực tế.",
    online: "Trực tuyến",
    saved: "Đã lưu",
    adminLock: "Quyền admin",
    search: "Tìm config, module, sản phẩm...",
    openLive: "Mở web live",
    modules: "Module",
    products: "Sản phẩm",
    visits: "Lượt mở",
    cache: "Cache 30s",
    loading: "Đang tải config admin...",
    overview: "Tổng quan",
    hero: "Hero",
    moduleDeck: "Modules",
    store: "AI Store",
    themes: "Giao diện",
    stats: "Thống kê",
    heroHint: "Câu chạy chữ",
    modulesHint: "Thẻ trang chủ",
    storeHint: "Catalog",
    themesHint: "Skin",
    statsHint: "Lưu lượng",
    allSystems: "Hệ thống ổn định",
    context: "Ngữ cảnh",
    quickOps: "Thao tác nhanh",
    queue: "Hàng đợi trống",
    queueBody: "Config lưu qua admin API và lên trang công khai sau khi cache refresh.",
    recent: "Đang tập trung",
    hidden: "Ẩn",
    visible: "Hiện",
    comingSoon: "Soon",
    enabled: "Bật",
    disabled: "Tắt",
    save: "Lưu",
    saveHero: "Lưu hero",
    saveModules: "Lưu module",
    saveThemes: "Lưu theme",
    addProduct: "Thêm sản phẩm",
    edit: "Sửa",
    delete: "Xóa",
    cancel: "Hủy",
    newProduct: "Sản phẩm mới",
    editProduct: "Sửa sản phẩm",
    noData: "Chưa có dữ liệu",
    noDataBody: "Mở module từ trang chủ để ghi thống kê lưu lượng.",
    commandNotes: "Admin được thiết kế dày, trực tiếp và thực dụng. Không có lớp marketing, chỉ có điều khiển.",
  },
} satisfies Record<WebLanguage, Record<string, string>>;

const sections: ReadonlyArray<{
  id: Section;
  icon: typeof LayoutGrid;
  label: keyof typeof copy.en;
  hint: keyof typeof copy.en;
}> = [
  { id: "overview", icon: LayoutGrid, label: "overview", hint: "allSystems" },
  { id: "hero", icon: Type, label: "hero", hint: "heroHint" },
  { id: "modules", icon: Boxes, label: "moduleDeck", hint: "modulesHint" },
  { id: "store", icon: ShoppingBag, label: "store", hint: "storeHint" },
  { id: "themes", icon: Palette, label: "themes", hint: "themesHint" },
  { id: "stats", icon: BarChart3, label: "stats", hint: "statsHint" },
];

const railItems = [
  { label: "Secure", icon: Lock },
  { label: "Hero", icon: Type },
  { label: "Modules", icon: Boxes },
  { label: "Store", icon: ShoppingBag },
  { label: "Themes", icon: Palette },
  { label: "Stats", icon: BarChart3 },
  { label: "Deploy", icon: Gauge },
];

export function AdminShell({ adminEmail }: Readonly<{ adminEmail: string }>) {
  const { language, setLanguage } = useLanguage();
  const t = copy[language];
  const [section, setSection] = useState<Section>("overview");
  const [config, setConfig] = useState<SiteConfig | null>(null);
  const [products, setProducts] = useState<StoreItem[]>([]);
  const [stats, setStats] = useState<{ byModule: Record<string, number>; total: number }>({ byModule: {}, total: 0 });
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    void Promise.all([
      fetch("/api/admin/config", { cache: "no-store" })
        .then((response) => response.json())
        .then(setConfig)
        .catch(() => null),
      fetch("/api/admin/products", { cache: "no-store" })
        .then((response) => response.json())
        .then((data) => setProducts(data.items ?? []))
        .catch(() => null),
      fetch("/api/admin/stats", { cache: "no-store" })
        .then((response) => response.json())
        .then(setStats)
        .catch(() => null),
    ]);
  }, []);

  async function saveConfig(patch: Partial<SiteConfig>) {
    setSaving(true);
    try {
      const response = await fetch("/api/admin/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = (await response.json()) as SiteConfig;
      setConfig(data);
      setSavedAt(Date.now());
    } finally {
      setSaving(false);
    }
  }

  const hiddenModules = config ? Object.values(config.modules).filter((item) => item?.hidden).length : 0;
  const activeThemes = config ? THEME_VALUES.length - Object.values(config.themes).filter((item) => item?.hidden).length : 0;
  const topModule = Object.entries(stats.byModule).sort((a, b) => b[1] - a[1])[0];

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#070409] text-[#efe6dc]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_10%,rgba(91,60,160,0.34),transparent_32rem),radial-gradient(circle_at_78%_12%,rgba(239,68,68,0.16),transparent_30rem),linear-gradient(180deg,#100817_0%,#070409_100%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(167,139,250,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(167,139,250,0.045)_1px,transparent_1px)] bg-[size:24px_24px] opacity-70" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_65%_14%,rgba(244,234,220,0.07),transparent_10rem)]" />

      <header className="relative z-30 flex h-14 items-center border-b border-[#2a1937] bg-[#09050f]/92 px-3 backdrop-blur md:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/"
            aria-label={t.back}
            className="flex size-9 items-center justify-center rounded-md border border-white/10 text-[#9f968b] transition hover:border-[#ef4444]/45 hover:text-[#f4eadc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ef4444]/70"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <Link href="/" className="font-display text-xl font-black tracking-[-0.08em] text-[#f4eadc] sm:text-2xl">
            Mr<span className="text-[#ef4444]">Nine</span>
          </Link>
          <div className="hidden font-mono text-[0.52rem] uppercase leading-3 tracking-[0.28em] text-[#756d84] sm:block">
            <div>Future Domain</div>
            <div>Admin / 009</div>
          </div>
        </div>

        <div className="hidden flex-1 justify-center lg:flex">
          <div className="flex h-9 items-center gap-2 rounded-full border border-[#45a85d]/38 bg-[#071109]/80 px-4 shadow-[0_0_28px_rgba(69,168,93,0.14)]">
            <ShieldCheck className="size-4 text-[#45a85d]" />
            <div className="font-mono text-[0.58rem] uppercase leading-3 tracking-[0.16em]">
              <div className="text-[#dff8e4]">{t.online}</div>
              <div className="text-[#7b7369]">admin api</div>
            </div>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.025] p-1">
          <div className="hidden rounded-full border border-white/10 bg-white/[0.03] p-0.5 font-mono text-[0.58rem] uppercase tracking-[0.16em] md:flex">
            {languageOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                title={option.title}
                aria-pressed={language === option.value}
                onClick={() => setLanguage(option.value)}
                className={cn(
                  "rounded-full px-2.5 py-1 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ef4444]/70",
                  language === option.value ? "bg-[#ef4444] text-[#090807]" : "text-[#9f968b] hover:text-[#f4eadc]",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
          {savedAt ? (
            <span className="hidden h-8 items-center gap-2 rounded-full border border-[#45a85d]/32 bg-[#071109]/72 px-3 font-mono text-[0.55rem] uppercase tracking-[0.16em] text-[#7dd391] xl:flex">
              <span className="size-1.5 rounded-full bg-[#45a85d]" />
              {t.saved} {new Date(savedAt).toLocaleTimeString(language === "vi" ? "vi-VN" : "en-US")}
            </span>
          ) : null}
          <span className="flex h-8 items-center gap-2 rounded-full border border-[#a78bfa]/28 bg-[#180d29] px-3 font-mono text-[0.55rem] uppercase tracking-[0.16em] text-[#c4b3ff]">
            <Lock className="size-3" />
            <span className="hidden max-w-40 truncate xl:block">{adminEmail || t.admin}</span>
            <span className="xl:hidden">NH</span>
          </span>
        </div>
      </header>

      <div className="relative z-10 grid min-h-[calc(100vh-3.5rem)] grid-cols-1 lg:grid-cols-[68px_minmax(0,1fr)_18rem]">
        <aside className="hidden border-r border-[#2a1937] bg-[#08050d]/78 lg:flex lg:flex-col">
          <div className="flex flex-1 flex-col items-center gap-2 pt-4">
            {railItems.map(({ label, icon: Icon }, index) => (
              <button
                key={label}
                type="button"
                aria-label={label}
                className={cn(
                  "group relative flex size-11 items-center justify-center rounded-lg text-[#817a8a] transition hover:bg-white/[0.04] hover:text-[#f4eadc]",
                  index === 0 && "rail-active-signal border border-[#f4eadc]/54 bg-white/[0.10] text-[#f4eadc]",
                )}
              >
                <Icon className="size-4" />
                <span className="absolute -bottom-2 font-mono text-[0.45rem] tracking-[0.18em] text-[#6e6574]">
                  {String(index).padStart(2, "0")}
                </span>
              </button>
            ))}
          </div>
        </aside>

        <section className="min-w-0 px-4 py-5 sm:px-6 lg:px-7">
          <div className="relative overflow-hidden border-b border-[#2a1937] pb-5">
            <div className="pointer-events-none absolute right-0 top-0 hidden font-numeral text-[13rem] font-bold leading-none text-[#ef4444]/[0.045] xl:block">
              009
            </div>
            <p className="font-mono text-[0.62rem] uppercase tracking-[0.28em] text-[#8f8579]">{t.kicker}</p>
            <h1 className="mt-5 max-w-6xl font-display text-[clamp(2.8rem,5.3vw,5.8rem)] font-black leading-[0.88] tracking-[-0.075em] text-[#f4eadc]">
              {t.title}
            </h1>
            <p className="mt-5 max-w-3xl text-sm leading-7 text-[#bdb2c5] sm:text-base">{t.subtitle}</p>

            <div className="mt-7 max-w-3xl rounded-lg border border-[#3b2848] bg-[#0d0813]/88 p-2 shadow-[0_0_0_1px_rgba(255,255,255,0.025)_inset,0_18px_70px_rgba(0,0,0,0.22)]">
              <div className="flex items-center gap-2">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-md border border-[#ef4444]/28 bg-[#ef4444]/10 text-[#ef4444]">
                  <Search className="size-4" />
                </span>
                <input
                  placeholder={t.search}
                  className="min-w-0 flex-1 bg-transparent px-1 text-sm text-[#f4eadc] outline-none placeholder:text-[#756d84]"
                />
                <Link
                  href="/"
                  className="flex h-9 items-center gap-2 rounded-md bg-[#ef4444] px-4 font-mono text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#090807] transition hover:bg-[#ff5b55]"
                >
                  {t.openLive}
                  <ChevronRight className="size-3.5" />
                </Link>
              </div>
            </div>
          </div>

          <div className="mt-4 flex h-8 items-center overflow-hidden border-b border-[#2a1937] font-mono text-[0.6rem] uppercase tracking-[0.18em] text-[#d6a548]">
            <div className="flex min-w-max animate-[marquee_32s_linear_infinite] gap-8">
              {[
                `${MODULE_TITLES.length - hiddenModules}/${MODULE_TITLES.length} ${t.modules}`,
                `${products.length} ${t.products}`,
                `${stats.total.toLocaleString(language === "vi" ? "vi-VN" : "en-US")} ${t.visits}`,
                `${activeThemes}/${THEME_VALUES.length} ${t.themes}`,
                t.cache,
              ].concat([
                `${MODULE_TITLES.length - hiddenModules}/${MODULE_TITLES.length} ${t.modules}`,
                `${products.length} ${t.products}`,
                `${stats.total.toLocaleString(language === "vi" ? "vi-VN" : "en-US")} ${t.visits}`,
                `${activeThemes}/${THEME_VALUES.length} ${t.themes}`,
                t.cache,
              ]).map((item, index) => (
                <span key={`${item}-${index}`} className="flex items-center gap-2">
                  <span className={cn("size-1.5 rounded-full", index % 3 === 0 ? "bg-[#d6a548]" : index % 3 === 1 ? "bg-[#45a85d]" : "bg-[#ef4444]")} />
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
            {sections.map((item) => (
              <SectionButton key={item.id} active={section === item.id} onClick={() => setSection(item.id)} icon={item.icon} label={t[item.label]} hint={t[item.hint]} />
            ))}
          </div>

          <div className="mt-5">
            {!config ? (
              <div className="flex h-72 items-center justify-center rounded-lg border border-dashed border-[#3b2848] bg-[#0d0813]/58">
                <Loader2 className="mr-2 size-4 animate-spin text-[#a78bfa]" />
                <span className="font-mono text-[0.68rem] uppercase tracking-[0.18em] text-[#9f968b]">{t.loading}</span>
              </div>
            ) : (
              <>
                {section === "overview" ? <Overview config={config} products={products} stats={stats} topModule={topModule} language={language} /> : null}
                {section === "hero" ? <HeroPanel config={config} saving={saving} onSave={saveConfig} language={language} /> : null}
                {section === "modules" ? <ModulesPanel config={config} saving={saving} onSave={saveConfig} stats={stats} language={language} /> : null}
                {section === "store" ? <StorePanel products={products} setProducts={setProducts} language={language} /> : null}
                {section === "themes" ? <ThemesPanel config={config} saving={saving} onSave={saveConfig} language={language} /> : null}
                {section === "stats" ? <StatsPanel stats={stats} language={language} /> : null}
              </>
            )}
          </div>
        </section>

        <aside className="hidden border-l border-[#2a1937] bg-[#08050d]/58 px-4 py-5 xl:block">
          <p className="font-mono text-[0.58rem] uppercase tracking-[0.24em] text-[#756d84]">{t.context}</p>
          <h2 className="mt-1 text-lg font-black tracking-[-0.04em] text-[#f4eadc]">{t.recent}</h2>

          <div className="mt-4 space-y-2">
            <ContextCard label={t.modules} value={`${MODULE_TITLES.length - hiddenModules}/${MODULE_TITLES.length}`} tone="red" />
            <ContextCard label={t.products} value={String(products.length)} tone="gold" />
            <ContextCard label={t.visits} value={stats.total.toLocaleString(language === "vi" ? "vi-VN" : "en-US")} tone="green" />
            <ContextCard label={t.themes} value={`${activeThemes}/${THEME_VALUES.length}`} tone="violet" />
          </div>

          <div className="mt-6 rounded-lg border border-[#45a85d]/18 bg-[#071109]/70 p-3">
            <div className="flex items-center gap-2 font-mono text-[0.54rem] uppercase tracking-[0.18em] text-[#45a85d]">
              <span className="size-1.5 rounded-full bg-[#45a85d]" />
              {t.queue}
            </div>
            <p className="mt-2 text-xs leading-5 text-[#9f968b]">{t.queueBody}</p>
          </div>

          <div className="mt-4 rounded-lg border border-[#a78bfa]/16 bg-[#12091f]/70 p-3">
            <div className="font-mono text-[0.54rem] uppercase tracking-[0.18em] text-[#c4b3ff]">{t.quickOps}</div>
            <p className="mt-2 text-xs leading-5 text-[#9f968b]">{copy[language].commandNotes}</p>
          </div>
        </aside>
      </div>
    </main>
  );
}

function SectionButton({
  active,
  onClick,
  icon: Icon,
  label,
  hint,
}: Readonly<{ active: boolean; onClick: () => void; icon: typeof LayoutGrid; label: string; hint: string }>) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex min-h-24 flex-col items-start justify-between rounded-lg border p-3 text-left transition",
        active
          ? "border-[#a78bfa]/60 bg-[#1a1029]/86 shadow-[0_0_34px_rgba(167,139,250,0.12)]"
          : "border-[#2d2037] bg-[#0e0915]/76 hover:border-[#ef4444]/32 hover:bg-[#140c1d]",
      )}
    >
      <span className={cn("flex size-8 items-center justify-center rounded-md border", active ? "border-[#a78bfa]/55 bg-[#a78bfa]/14 text-[#c4b3ff]" : "border-[#ef4444]/24 bg-[#ef4444]/8 text-[#ef4444]")}>
        <Icon className="size-4" />
      </span>
      <span>
        <span className="block text-sm font-bold text-[#f4eadc]">{label}</span>
        <span className="mt-1 block font-mono text-[0.5rem] uppercase tracking-[0.16em] text-[#756d84]">{hint}</span>
      </span>
    </button>
  );
}

function ContextCard({ label, value, tone }: Readonly<{ label: string; value: string; tone: "red" | "gold" | "green" | "violet" }>) {
  const tones = {
    red: "text-[#ef4444]",
    gold: "text-[#d6a548]",
    green: "text-[#45a85d]",
    violet: "text-[#a78bfa]",
  };
  return (
    <div className="rounded-lg border border-[#2d2037] bg-[#0e0915]/72 px-3 py-3">
      <div className="font-mono text-[0.5rem] uppercase tracking-[0.18em] text-[#756d84]">{label}</div>
      <div className={cn("mt-1 text-sm font-bold", tones[tone])}>{value}</div>
    </div>
  );
}

function Panel({ title, action, children }: Readonly<{ title: string; action?: ReactNode; children: ReactNode }>) {
  return (
    <section className="rounded-lg border border-[#2d2037] bg-[#0d0813]/78 p-4 shadow-[0_24px_90px_rgba(0,0,0,0.22)]">
      <div className="flex items-center justify-between gap-3 border-b border-white/7 pb-3">
        <div className="flex items-center gap-2 font-mono text-[0.58rem] uppercase tracking-[0.2em] text-[#d6a548]">
          <span className="size-1.5 rounded-full bg-[#d6a548]" />
          {title}
        </div>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function AdminButton({
  label,
  onClick,
  icon: Icon = Save,
  disabled,
  tone = "primary",
}: Readonly<{ label: string; onClick: () => void; icon?: typeof Save; disabled?: boolean; tone?: "primary" | "ghost" | "danger" }>) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex h-9 items-center gap-2 rounded-md border px-3 font-mono text-[0.6rem] font-bold uppercase tracking-[0.16em] transition disabled:cursor-not-allowed disabled:opacity-55",
        tone === "primary" && "border-[#ef4444]/48 bg-[#ef4444]/16 text-[#ffd7d3] hover:border-[#ef4444]/70 hover:bg-[#ef4444]/22",
        tone === "ghost" && "border-white/10 bg-white/[0.025] text-[#bdb2c5] hover:border-white/25 hover:text-[#f4eadc]",
        tone === "danger" && "border-[#ef4444]/36 bg-[#ef4444]/8 text-[#ffb4ad] hover:border-[#ef4444]/60",
      )}
    >
      {disabled ? <Loader2 className="size-3.5 animate-spin" /> : <Icon className="size-3.5" />}
      {label}
    </button>
  );
}

function Field({ label, children }: Readonly<{ label: string; children: ReactNode }>) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-mono text-[0.54rem] uppercase tracking-[0.18em] text-[#a78bfa]">{label}</span>
      {children}
    </label>
  );
}

function TextInput({ value, onChange, placeholder, type = "text" }: Readonly<{ value: string | number; onChange: (value: string) => void; placeholder?: string; type?: string }>) {
  return (
    <input
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="h-10 w-full rounded-md border border-[#2d2037] bg-[#0b0710] px-3 text-sm text-[#f4eadc] outline-none placeholder:text-[#5f5668] focus:border-[#a78bfa]/55"
    />
  );
}

function Overview({
  config,
  products,
  stats,
  topModule,
  language,
}: Readonly<{ config: SiteConfig; products: StoreItem[]; stats: { byModule: Record<string, number>; total: number }; topModule?: [string, number]; language: WebLanguage }>) {
  const t = copy[language];
  const hiddenModules = Object.values(config.modules).filter((item) => item?.hidden).length;
  const disabledThemes = Object.values(config.themes).filter((item) => item?.hidden).length;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Metric label={t.modules} value={`${MODULE_TITLES.length - hiddenModules}/${MODULE_TITLES.length}`} icon={Boxes} />
        <Metric label={t.products} value={String(products.length)} icon={ShoppingBag} />
        <Metric label={t.visits} value={stats.total.toLocaleString(language === "vi" ? "vi-VN" : "en-US")} icon={BarChart3} />
        <Metric label={language === "vi" ? "Top module" : "Top module"} value={topModule?.[0] ?? "—"} sub={topModule ? String(topModule[1]) : undefined} icon={Sparkles} />
      </div>
      <Panel title={language === "vi" ? "Operations brief" : "Operations brief"}>
        <div className="grid gap-3 lg:grid-cols-3">
          {[
            `${config.hero.vi.length} VI / ${config.hero.en.length} EN hero lines`,
            `${hiddenModules} hidden modules, ${MODULE_TITLES.length - hiddenModules} visible`,
            `${disabledThemes} disabled themes, ${THEME_VALUES.length - disabledThemes} active`,
          ].map((item) => (
            <div key={item} className="rounded-md border border-[#2d2037] bg-[#0b0710]/72 p-3 text-sm leading-6 text-[#d8cfc4]">
              {item}
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function Metric({ label, value, sub, icon: Icon }: Readonly<{ label: string; value: string; sub?: string; icon: typeof Boxes }>) {
  return (
    <div className="rounded-lg border border-[#2d2037] bg-[#0d0813]/78 p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[#756d84]">{label}</span>
        <span className="flex size-8 items-center justify-center rounded-md border border-[#a78bfa]/24 bg-[#a78bfa]/10 text-[#a78bfa]">
          <Icon className="size-4" />
        </span>
      </div>
      <div className="mt-3 truncate font-display text-3xl font-black tracking-[-0.06em] text-[#f4eadc]">{value}</div>
      {sub ? <div className="font-mono text-[0.52rem] uppercase tracking-[0.16em] text-[#756d84]">{sub}</div> : null}
    </div>
  );
}

function HeroPanel({ config, saving, onSave, language }: Readonly<{ config: SiteConfig; saving: boolean; onSave: (patch: Partial<SiteConfig>) => Promise<void>; language: WebLanguage }>) {
  const t = copy[language];
  const [vi, setVi] = useState(config.hero.vi.join("\n"));
  const [en, setEn] = useState(config.hero.en.join("\n"));
  return (
    <Panel
      title={language === "vi" ? "Hero headlines" : "Hero headlines"}
      action={<AdminButton label={t.saveHero} disabled={saving} onClick={() => onSave({ hero: { vi: toLines(vi), en: toLines(en) } })} />}
    >
      <div className="grid gap-3 lg:grid-cols-2">
        <Field label="VI">
          <textarea value={vi} onChange={(event) => setVi(event.target.value)} rows={12} className="w-full resize-y rounded-md border border-[#2d2037] bg-[#0b0710] p-3 text-sm leading-6 text-[#f4eadc] outline-none focus:border-[#a78bfa]/55" />
        </Field>
        <Field label="EN">
          <textarea value={en} onChange={(event) => setEn(event.target.value)} rows={12} className="w-full resize-y rounded-md border border-[#2d2037] bg-[#0b0710] p-3 text-sm leading-6 text-[#f4eadc] outline-none focus:border-[#a78bfa]/55" />
        </Field>
      </div>
    </Panel>
  );
}

function ModulesPanel({
  config,
  saving,
  onSave,
  stats,
  language,
}: Readonly<{ config: SiteConfig; saving: boolean; onSave: (patch: Partial<SiteConfig>) => Promise<void>; stats: { byModule: Record<string, number> }; language: WebLanguage }>) {
  const t = copy[language];
  const [draft, setDraft] = useState(config.modules);
  return (
    <Panel title={t.modules} action={<AdminButton label={t.saveModules} disabled={saving} onClick={() => onSave({ modules: draft })} />}>
      <div className="grid gap-2 xl:grid-cols-2">
        {MODULE_TITLES.map((title, index) => {
          const item = draft[title] ?? {};
          return (
            <article key={title} className={cn("rounded-lg border p-3", item.hidden ? "border-[#ef4444]/22 bg-[#17080c]/62 opacity-70" : "border-[#2d2037] bg-[#0b0710]/72")}>
              <div className="flex items-start gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-[#ef4444]/24 bg-[#ef4444]/10 font-mono text-[0.58rem] text-[#ef4444]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-[#f4eadc]">{title}</h3>
                    <span className="rounded border border-[#45a85d]/28 bg-[#45a85d]/8 px-1.5 py-0.5 font-mono text-[0.48rem] uppercase tracking-[0.16em] text-[#7dd391]">
                      {(stats.byModule[title] ?? 0).toLocaleString(language === "vi" ? "vi-VN" : "en-US")} {t.visits}
                    </span>
                  </div>
                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                    <TextInput value={item.detailVi ?? ""} onChange={(value) => setDraft({ ...draft, [title]: { ...item, detailVi: value } })} placeholder="Detail VI" />
                    <TextInput value={item.detailEn ?? ""} onChange={(value) => setDraft({ ...draft, [title]: { ...item, detailEn: value } })} placeholder="Detail EN" />
                  </div>
                </div>
                <div className="flex shrink-0 flex-col gap-1.5">
                  <Toggle active={Boolean(item.comingSoon)} onClick={() => setDraft({ ...draft, [title]: { ...item, comingSoon: !item.comingSoon } })} label={t.comingSoon} />
                  <Toggle active={!item.hidden} onClick={() => setDraft({ ...draft, [title]: { ...item, hidden: !item.hidden } })} label={item.hidden ? t.hidden : t.visible} icon={item.hidden ? EyeOff : Eye} />
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </Panel>
  );
}

function Toggle({ active, onClick, label, icon: Icon = Check }: Readonly<{ active: boolean; onClick: () => void; label: string; icon?: typeof Check }>) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 font-mono text-[0.55rem] uppercase tracking-[0.14em]",
        active ? "border-[#45a85d]/38 bg-[#45a85d]/10 text-[#7dd391]" : "border-white/10 bg-white/[0.025] text-[#9f968b]",
      )}
    >
      <Icon className="size-3" />
      {label}
    </button>
  );
}

function ThemesPanel({ config, saving, onSave, language }: Readonly<{ config: SiteConfig; saving: boolean; onSave: (patch: Partial<SiteConfig>) => Promise<void>; language: WebLanguage }>) {
  const t = copy[language];
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
    <Panel title={t.themes} action={<AdminButton label={t.saveThemes} disabled={saving} onClick={() => onSave({ themes: draft })} />}>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {THEME_VALUES.map((theme) => {
          const hidden = Boolean(draft[theme]?.hidden);
          return (
            <button
              key={theme}
              type="button"
              onClick={() => setDraft({ ...draft, [theme]: { hidden: !hidden } })}
              className={cn("flex items-center gap-3 rounded-lg border p-3 text-left transition", hidden ? "border-[#ef4444]/28 bg-[#17080c]/62" : "border-[#2d2037] bg-[#0b0710]/72 hover:border-[#a78bfa]/38")}
            >
              <span className={cn("size-8 shrink-0 rounded-md", swatches[theme], hidden && "opacity-35")} />
              <span>
                <span className="block font-mono text-[0.72rem] uppercase tracking-[0.18em] text-[#f4eadc]">{theme}</span>
                <span className="font-mono text-[0.5rem] uppercase tracking-[0.16em] text-[#756d84]">{hidden ? t.disabled : t.enabled}</span>
              </span>
            </button>
          );
        })}
      </div>
    </Panel>
  );
}

function StatsPanel({ stats, language }: Readonly<{ stats: { byModule: Record<string, number>; total: number }; language: WebLanguage }>) {
  const t = copy[language];
  const rows = Object.entries(stats.byModule).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...rows.map(([, count]) => count));
  return (
    <Panel title={`${stats.total.toLocaleString(language === "vi" ? "vi-VN" : "en-US")} ${t.visits}`}>
      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[#2d2037] bg-[#0b0710]/56 py-12 text-center">
          <p className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-[#9f968b]">{t.noData}</p>
          <p className="mt-2 text-sm text-[#756d84]">{t.noDataBody}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map(([name, count]) => (
            <div key={name} className="grid grid-cols-[9rem_minmax(0,1fr)_5rem] items-center gap-3 rounded-md border border-[#2d2037] bg-[#0b0710]/72 px-3 py-2">
              <span className="truncate text-sm font-bold text-[#f4eadc]">{name}</span>
              <span className="relative h-2 overflow-hidden rounded-full bg-[#17101f]">
                <span className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#ef4444] via-[#a78bfa] to-[#45a85d]" style={{ width: `${(count / max) * 100}%` }} />
              </span>
              <span className="text-right font-mono text-sm font-bold tabular-nums text-[#f4eadc]">{count}</span>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

function StorePanel({ products, setProducts, language }: Readonly<{ products: StoreItem[]; setProducts: (items: StoreItem[]) => void; language: WebLanguage }>) {
  const t = copy[language];
  const [editing, setEditing] = useState<StoreItem | null>(null);
  const [filter, setFilter] = useState<StoreItemKind | "all">("all");
  const filtered = useMemo(() => (filter === "all" ? products : products.filter((item) => item.kind === filter)), [filter, products]);

  async function deleteItem(id: string) {
    if (!confirm(language === "vi" ? "Xóa sản phẩm này?" : "Delete this product?")) return;
    await fetch(`/api/admin/products?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    setProducts(products.filter((item) => item.id !== id));
  }

  async function saveItem(item: StoreItem) {
    await fetch("/api/admin/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item),
    });
    setProducts(products.some((product) => product.id === item.id) ? products.map((product) => (product.id === item.id ? item : product)) : [...products, item]);
    setEditing(null);
  }

  return (
    <div className="space-y-3">
      <Panel
        title={`${filtered.length}/${products.length} ${t.products}`}
        action={
          <AdminButton
            label={t.addProduct}
            icon={PackagePlus}
            onClick={() =>
              setEditing({
                id: `new-${Date.now()}`,
                brand: "",
                product: "",
                detail: "",
                kind: "chatbot",
                duration: "1 month",
                priceVnd: 0,
                stock: "in",
                warranty: "1-1 warranty",
              })
            }
          />
        }
      >
        <div className="flex flex-wrap gap-1.5">
          {(["all", "chatbot", "api", "image", "video", "audio", "code"] as const).map((kind) => (
            <button
              key={kind}
              type="button"
              onClick={() => setFilter(kind)}
              className={cn("rounded-md border px-2.5 py-1 font-mono text-[0.55rem] uppercase tracking-[0.16em]", filter === kind ? "border-[#a78bfa]/55 bg-[#a78bfa]/14 text-[#e3d8ff]" : "border-white/10 bg-white/[0.025] text-[#9f968b]")}
            >
              {kind}
            </button>
          ))}
        </div>
      </Panel>

      {editing ? <ProductEditor item={editing} onCancel={() => setEditing(null)} onSave={saveItem} language={language} /> : null}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((item) => (
          <article key={item.id} className="group rounded-lg border border-[#2d2037] bg-[#0d0813]/78 p-3 transition hover:border-[#ef4444]/32">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="truncate text-sm font-bold text-[#f4eadc]">{item.product}</h3>
                <p className="font-mono text-[0.5rem] uppercase tracking-[0.16em] text-[#756d84]">{item.brand} / {item.kind}</p>
              </div>
              <span className="rounded border border-[#d6a548]/32 bg-[#d6a548]/10 px-1.5 py-0.5 font-mono text-[0.48rem] uppercase tracking-[0.16em] text-[#d6a548]">
                {item.stock}
              </span>
            </div>
            <p className="mt-2 line-clamp-2 text-xs leading-5 text-[#bdb2c5]">{item.detail}</p>
            <div className="mt-3 flex items-end justify-between gap-2">
              <span className="font-mono text-base font-bold tabular-nums text-[#f4eadc]">{currency.format(item.priceVnd)}</span>
              <span className="font-mono text-[0.5rem] uppercase tracking-[0.14em] text-[#756d84]">{item.duration}</span>
            </div>
            <div className="mt-3 flex gap-1.5 border-t border-white/7 pt-2">
              <AdminButton tone="ghost" label={t.edit} icon={Wand2} onClick={() => setEditing(item)} />
              <AdminButton tone="danger" label={t.delete} icon={Trash2} onClick={() => deleteItem(item.id)} />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function ProductEditor({ item, onCancel, onSave, language }: Readonly<{ item: StoreItem; onCancel: () => void; onSave: (item: StoreItem) => Promise<void>; language: WebLanguage }>) {
  const t = copy[language];
  const [draft, setDraft] = useState(item);
  const [busy, setBusy] = useState(false);
  return (
    <Panel
      title={item.id.startsWith("new-") ? t.newProduct : `${t.editProduct}: ${item.product}`}
      action={
        <div className="flex gap-1.5">
          <AdminButton tone="ghost" label={t.cancel} onClick={onCancel} />
          <AdminButton
            label={t.save}
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onSave(draft);
              } finally {
                setBusy(false);
              }
            }}
          />
        </div>
      }
    >
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <Field label="ID"><TextInput value={draft.id} onChange={(value) => setDraft({ ...draft, id: value })} /></Field>
        <Field label="Brand"><TextInput value={draft.brand} onChange={(value) => setDraft({ ...draft, brand: value })} /></Field>
        <Field label="Product"><TextInput value={draft.product} onChange={(value) => setDraft({ ...draft, product: value })} /></Field>
        <Field label="Detail"><TextInput value={draft.detail} onChange={(value) => setDraft({ ...draft, detail: value })} /></Field>
        <Field label="Kind">
          <select value={draft.kind} onChange={(event) => setDraft({ ...draft, kind: event.target.value as StoreItemKind })} className="h-10 w-full rounded-md border border-[#2d2037] bg-[#0b0710] px-3 text-sm text-[#f4eadc] outline-none focus:border-[#a78bfa]/55">
            {(["chatbot", "api", "image", "video", "audio", "code"] as const).map((kind) => <option key={kind} value={kind}>{kind}</option>)}
          </select>
        </Field>
        <Field label="Stock">
          <select value={draft.stock} onChange={(event) => setDraft({ ...draft, stock: event.target.value as StoreItem["stock"] })} className="h-10 w-full rounded-md border border-[#2d2037] bg-[#0b0710] px-3 text-sm text-[#f4eadc] outline-none focus:border-[#a78bfa]/55">
            <option value="in">in</option>
            <option value="low">low</option>
            <option value="preorder">preorder</option>
          </select>
        </Field>
        <Field label="Duration"><TextInput value={draft.duration} onChange={(value) => setDraft({ ...draft, duration: value })} /></Field>
        <Field label="Price VND"><TextInput type="number" value={draft.priceVnd} onChange={(value) => setDraft({ ...draft, priceVnd: Number(value) })} /></Field>
        <Field label="Original VND"><TextInput type="number" value={draft.originalVnd ?? ""} onChange={(value) => setDraft({ ...draft, originalVnd: value ? Number(value) : undefined })} /></Field>
        <Field label="Badge"><TextInput value={draft.badge ?? ""} onChange={(value) => setDraft({ ...draft, badge: value || undefined })} /></Field>
        <Field label="Warranty"><TextInput value={draft.warranty} onChange={(value) => setDraft({ ...draft, warranty: value })} /></Field>
        <Field label="Notes"><TextInput value={draft.notes ?? ""} onChange={(value) => setDraft({ ...draft, notes: value || undefined })} /></Field>
      </div>
    </Panel>
  );
}

function toLines(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

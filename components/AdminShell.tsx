"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ActivitySquare,
  ArrowLeft,
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

  const sections: ReadonlyArray<{ id: Section; label: string; icon: typeof Sparkles; hint: string }> = [
    { id: "overview", label: "Overview", icon: LayoutGrid, hint: "Tổng quan" },
    { id: "hero", label: "Hero", icon: Type, hint: "Tiêu đề chạy" },
    { id: "modules", label: "Modules", icon: CircleDot, hint: "12 thẻ" },
    { id: "store", label: "AI Store", icon: ShoppingBag, hint: "Sản phẩm" },
    { id: "themes", label: "Themes", icon: Sparkles, hint: "Giao diện" },
    { id: "stats", label: "Stats", icon: BarChart3, hint: "Lưu lượng" },
  ];

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#0a0907] text-[#e8dfd4]">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(circle at 12% 12%, rgba(214,165,72,0.16), transparent 32%), radial-gradient(circle at 86% 18%, rgba(239,68,68,0.08), transparent 28%), linear-gradient(180deg, #0e0c08 0%, #050402 100%)",
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

      <header className="relative z-20 flex h-14 shrink-0 items-center gap-3 border-b border-[#3b2a0d] bg-[#0e0c08]/92 px-3 backdrop-blur md:px-5">
        <Link href="/" aria-label="Quay lại trang chủ" className="flex size-9 items-center justify-center rounded-md border border-white/10 text-[#a79d91] transition hover:border-[#d6a548]/40 hover:text-[#f4eadc]">
          <ArrowLeft className="size-4" />
        </Link>
        <Link href="/" className="font-display text-xl font-black tracking-[-0.08em] text-[#f4eadc] sm:text-2xl">
          Mr<span className="text-[#d6a548]">Nine</span>
        </Link>
        <span aria-hidden="true" className="hidden h-6 w-px bg-white/10 sm:block" />
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-md border border-[#d6a548]/30 bg-[#d6a548]/10 text-[#d6a548]">
            <ShieldCheck className="size-4" />
          </div>
          <div className="hidden min-w-0 sm:block">
            <p className="font-mono text-[0.58rem] uppercase tracking-[0.22em] text-[#f0c86d]">Control Room</p>
            <h1 className="truncate text-base font-black tracking-[-0.04em] text-[#f4eadc]">Admin</h1>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-3">
          {savedAt ? (
            <span className="hidden font-mono text-[0.58rem] uppercase tracking-[0.16em] text-[#7dd391] md:inline">
              ✓ Đã lưu {new Date(savedAt).toLocaleTimeString("vi-VN")}
            </span>
          ) : null}
          <span className="hidden font-mono text-[0.58rem] uppercase tracking-[0.16em] text-[#a79d91] md:inline">
            <Lock className="mr-1 inline size-3" /> {adminEmail}
          </span>
        </div>
      </header>

      <div className="relative z-10 grid min-h-[calc(100vh-3.5rem)] grid-cols-1 lg:grid-cols-[14rem_minmax(0,1fr)]">
        <aside className="border-r border-[#3b2a0d] bg-[#0c0a08]/72 p-3 lg:py-5">
          <nav className="flex flex-row gap-1.5 overflow-x-auto lg:flex-col">
            {sections.map((s) => {
              const Icon = s.icon;
              const isActive = section === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSection(s.id)}
                  className={cn(
                    "flex shrink-0 items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left transition",
                    isActive
                      ? "border-[#d6a548]/65 bg-[#d6a548]/14 text-[#fff2d3]"
                      : "border-white/8 bg-white/[0.03] text-[#a79d91] hover:border-[#d6a548]/30 hover:text-[#f4eadc]",
                  )}
                >
                  <Icon className={cn("size-4 shrink-0", isActive ? "text-[#f0c86d]" : "text-[#a79d91]")} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[0.85rem] font-bold">{s.label}</span>
                    <span className="block font-mono text-[0.5rem] uppercase tracking-[0.14em] text-[#5e574e]">{s.hint}</span>
                  </span>
                </button>
              );
            })}
          </nav>
        </aside>

        <section className="px-4 py-5 sm:px-6 lg:px-8 xl:px-10">
          {!config ? (
            <div className="flex h-64 items-center justify-center text-[#a79d91]">
              <Loader2 className="mr-2 size-4 animate-spin" /> Đang tải config...
            </div>
          ) : (
            <>
              {section === "overview" ? <OverviewPanel config={config} products={products} stats={stats} /> : null}
              {section === "hero" ? <HeroPanel config={config} saving={saving} onSave={saveConfig} /> : null}
              {section === "modules" ? <ModulesPanel config={config} saving={saving} onSave={saveConfig} stats={stats} /> : null}
              {section === "store" ? <StorePanel products={products} setProducts={setProducts} /> : null}
              {section === "themes" ? <ThemesPanel config={config} saving={saving} onSave={saveConfig} /> : null}
              {section === "stats" ? <StatsPanel stats={stats} /> : null}
            </>
          )}
        </section>
      </div>
    </main>
  );
}

function Card({ title, action, children }: Readonly<{ title: string; action?: React.ReactNode; children: React.ReactNode }>) {
  return (
    <div className="rounded-xl border border-[#3b2a0d] bg-[#100b04]/72 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3 border-b border-[#3b2a0d] pb-3">
        <div className="flex items-center gap-2 font-mono text-[0.6rem] uppercase tracking-[0.18em] text-[#f0c86d]">
          <span className="size-1.5 rounded-full bg-[#d6a548]" />
          {title}
        </div>
        {action ?? null}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function OverviewPanel({ config, products, stats }: Readonly<{ config: SiteConfig; products: StoreItem[]; stats: { byModule: Record<string, number>; total: number } }>) {
  const totalHidden = Object.values(config.modules).filter((m) => m?.hidden).length;
  const topModule = Object.entries(stats.byModule).sort((a, b) => b[1] - a[1])[0];
  return (
    <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-4">
      <Stat label="Module hiển thị" value={`${MODULE_TITLES.length - totalHidden}/${MODULE_TITLES.length}`} icon={CircleDot} />
      <Stat label="Sản phẩm AI Store" value={products.length.toString()} icon={ShoppingBag} />
      <Stat label="Lượt mở module" value={stats.total.toLocaleString("vi-VN")} icon={ActivitySquare} />
      <Stat label="Module hot nhất" value={topModule ? `${topModule[0]} · ${topModule[1]}` : "—"} icon={BarChart3} />
      <div className="lg:col-span-2 xl:col-span-4">
        <Card title="Hướng dẫn nhanh">
          <ul className="space-y-2 text-[0.85rem] leading-6 text-[#dfd5c7]">
            <li>• <span className="text-[#f0c86d]">Hero</span>: thêm/xoá câu chạy ở banner trang chủ.</li>
            <li>• <span className="text-[#f0c86d]">Modules</span>: ẩn thẻ khỏi grid + rail, đánh dấu &quot;Coming soon&quot;, sửa chú thích VI/EN.</li>
            <li>• <span className="text-[#f0c86d]">AI Store</span>: thêm/sửa/xoá tài khoản AI bán trên cửa hàng.</li>
            <li>• <span className="text-[#f0c86d]">Themes</span>: tắt theme không muốn cho user chọn.</li>
            <li>• <span className="text-[#f0c86d]">Stats</span>: theo dõi lượt mở module thực tế từ user.</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value, icon: Icon }: Readonly<{ label: string; value: string; icon: typeof Sparkles }>) {
  return (
    <div className="rounded-xl border border-[#3b2a0d] bg-[#100b04]/72 p-4">
      <div className="flex items-center gap-2 font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[#f0c86d]">
        <Icon className="size-3.5" /> {label}
      </div>
      <div className="mt-2 font-display text-2xl font-black tracking-tight text-[#fff2d3]">{value}</div>
    </div>
  );
}

function HeroPanel({ config, saving, onSave }: Readonly<{ config: SiteConfig; saving: boolean; onSave: (patch: Partial<SiteConfig>) => Promise<void> }>) {
  const [vi, setVi] = useState(config.hero.vi.join("\n"));
  const [en, setEn] = useState(config.hero.en.join("\n"));
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Card title="Tiếng Việt">
        <textarea
          value={vi}
          onChange={(e) => setVi(e.target.value)}
          rows={14}
          placeholder="Mỗi dòng là 1 câu hero..."
          className="w-full resize-y rounded-md border border-[#3b2a0d] bg-[#1a1209] px-3 py-2 font-mono text-[0.85rem] text-[#f4eadc] outline-none focus:border-[#d6a548]/55"
        />
        <p className="mt-2 font-mono text-[0.5rem] uppercase tracking-[0.16em] text-[#5e574e]">{vi.split("\n").filter(Boolean).length} câu</p>
      </Card>
      <Card title="English">
        <textarea
          value={en}
          onChange={(e) => setEn(e.target.value)}
          rows={14}
          placeholder="One headline per line..."
          className="w-full resize-y rounded-md border border-[#3b2a0d] bg-[#1a1209] px-3 py-2 font-mono text-[0.85rem] text-[#f4eadc] outline-none focus:border-[#d6a548]/55"
        />
        <p className="mt-2 font-mono text-[0.5rem] uppercase tracking-[0.16em] text-[#5e574e]">{en.split("\n").filter(Boolean).length} lines</p>
      </Card>
      <div className="lg:col-span-2 flex justify-end gap-2">
        <button
          type="button"
          disabled={saving}
          onClick={() => onSave({ hero: { vi: vi.split("\n").map((s) => s.trim()).filter(Boolean), en: en.split("\n").map((s) => s.trim()).filter(Boolean) } })}
          className="flex h-10 items-center gap-2 rounded-md bg-[#d6a548] px-4 font-mono text-[0.66rem] font-bold uppercase tracking-[0.16em] text-[#1a1209] transition hover:bg-[#e8b85a] disabled:opacity-55"
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Lưu hero
        </button>
      </div>
    </div>
  );
}

function ModulesPanel({ config, saving, onSave, stats }: Readonly<{ config: SiteConfig; saving: boolean; onSave: (patch: Partial<SiteConfig>) => Promise<void>; stats: { byModule: Record<string, number> } }>) {
  const [draft, setDraft] = useState(config.modules);
  return (
    <div className="space-y-3">
      <Card title={`12 module (${Object.values(draft).filter((m) => m?.hidden).length} ẩn)`} action={
        <button
          type="button"
          disabled={saving}
          onClick={() => onSave({ modules: draft })}
          className="flex h-9 items-center gap-2 rounded-md bg-[#d6a548] px-3 font-mono text-[0.6rem] font-bold uppercase tracking-[0.16em] text-[#1a1209] transition hover:bg-[#e8b85a] disabled:opacity-55"
        >
          {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
          Lưu modules
        </button>
      }>
        <div className="space-y-2">
          {MODULE_TITLES.map((title) => {
            const cur = draft[title] ?? {};
            const visits = stats.byModule[title] ?? 0;
            const hidden = Boolean(cur.hidden);
            const soon = Boolean(cur.comingSoon);
            return (
              <div key={title} className={cn("rounded-lg border bg-[#1a1209]/60 p-3 transition", hidden ? "border-[#5a3408] opacity-60" : "border-[#3b2a0d]")}>
                <div className="flex items-center gap-3">
                  <GripVertical className="size-3.5 shrink-0 text-[#5e574e]" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[0.95rem] font-bold text-[#f4eadc]">{title}</span>
                      {visits > 0 ? <span className="rounded border border-[#7dd391]/35 bg-[#7dd391]/10 px-1.5 py-0.5 font-mono text-[0.5rem] uppercase tracking-[0.16em] text-[#7dd391]">{visits} visits</span> : null}
                    </div>
                    <div className="mt-1 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                      <input
                        value={cur.detailVi ?? ""}
                        onChange={(e) => setDraft({ ...draft, [title]: { ...cur, detailVi: e.target.value } })}
                        placeholder="Detail VI (để trống = mặc định)"
                        className="rounded-md border border-[#3b2a0d] bg-[#0e0c08] px-2.5 py-1.5 text-[0.78rem] text-[#dfd5c7] outline-none focus:border-[#d6a548]/55"
                      />
                      <input
                        value={cur.detailEn ?? ""}
                        onChange={(e) => setDraft({ ...draft, [title]: { ...cur, detailEn: e.target.value } })}
                        placeholder="Detail EN (blank = default)"
                        className="rounded-md border border-[#3b2a0d] bg-[#0e0c08] px-2.5 py-1.5 text-[0.78rem] text-[#dfd5c7] outline-none focus:border-[#d6a548]/55"
                      />
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setDraft({ ...draft, [title]: { ...cur, comingSoon: !soon } })}
                      className={cn(
                        "rounded-md border px-2.5 py-1.5 font-mono text-[0.55rem] uppercase tracking-[0.16em] transition",
                        soon ? "border-[#d6a548]/65 bg-[#d6a548]/14 text-[#fff2d3]" : "border-white/10 text-[#a79d91] hover:border-[#d6a548]/30",
                      )}
                    >
                      Soon
                    </button>
                    <button
                      type="button"
                      onClick={() => setDraft({ ...draft, [title]: { ...cur, hidden: !hidden } })}
                      className={cn(
                        "flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 font-mono text-[0.55rem] uppercase tracking-[0.16em] transition",
                        hidden ? "border-[#ef4444]/65 bg-[#ef4444]/14 text-[#ffd7d3]" : "border-[#7dd391]/45 bg-[#7dd391]/10 text-[#7dd391]",
                      )}
                    >
                      {hidden ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
                      {hidden ? "Hidden" : "Visible"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function ThemesPanel({ config, saving, onSave }: Readonly<{ config: SiteConfig; saving: boolean; onSave: (patch: Partial<SiteConfig>) => Promise<void> }>) {
  const [draft, setDraft] = useState(config.themes);
  return (
    <Card title="Theme overrides" action={
      <button
        type="button"
        disabled={saving}
        onClick={() => onSave({ themes: draft })}
        className="flex h-9 items-center gap-2 rounded-md bg-[#d6a548] px-3 font-mono text-[0.6rem] font-bold uppercase tracking-[0.16em] text-[#1a1209] transition hover:bg-[#e8b85a] disabled:opacity-55"
      >
        {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
        Lưu themes
      </button>
    }>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {THEME_VALUES.map((t) => {
          const hidden = Boolean(draft[t]?.hidden);
          return (
            <button
              key={t}
              type="button"
              onClick={() => setDraft({ ...draft, [t]: { hidden: !hidden } })}
              className={cn(
                "flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left transition",
                hidden ? "border-[#ef4444]/55 bg-[#ef4444]/10 text-[#ffd7d3]" : "border-[#7dd391]/45 bg-[#7dd391]/10 text-[#7dd391]",
              )}
            >
              <span className="font-mono text-[0.68rem] uppercase tracking-[0.16em]">{t}</span>
              {hidden ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
            </button>
          );
        })}
      </div>
    </Card>
  );
}

function StatsPanel({ stats }: Readonly<{ stats: { byModule: Record<string, number>; total: number } }>) {
  const sorted = Object.entries(stats.byModule).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...sorted.map((s) => s[1]));
  return (
    <Card title={`Tổng ${stats.total.toLocaleString("vi-VN")} lượt mở module`}>
      {sorted.length === 0 ? (
        <p className="text-[0.85rem] text-[#a79d91]">Chưa có dữ liệu. Mở module bất kỳ → /api/track sẽ ghi log.</p>
      ) : (
        <div className="space-y-2">
          {sorted.map(([name, count]) => (
            <div key={name} className="flex items-center gap-3">
              <span className="w-32 shrink-0 truncate text-[0.85rem] font-bold text-[#f4eadc]">{name}</span>
              <div className="relative h-2 flex-1 overflow-hidden rounded bg-[#1a1209]">
                <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#d6a548] to-[#f0c86d]" style={{ width: `${(count / max) * 100}%` }} />
              </div>
              <span className="w-16 shrink-0 text-right font-mono text-[0.78rem] tabular-nums text-[#fff2d3]">{count.toLocaleString("vi-VN")}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function StorePanel({ products, setProducts }: Readonly<{ products: StoreItem[]; setProducts: (items: StoreItem[]) => void }>) {
  const [editing, setEditing] = useState<StoreItem | null>(null);

  async function deleteItem(id: string) {
    if (!confirm("Xoá sản phẩm này?")) return;
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

  return (
    <Card title={`${products.length} sản phẩm`} action={
      <button
        type="button"
        onClick={() => setEditing({ id: `new-${Date.now()}`, brand: "", product: "", detail: "", kind: "chatbot", duration: "1 tháng", priceVnd: 0, stock: "in", warranty: "Bảo hành 1-1" })}
        className="flex h-9 items-center gap-2 rounded-md bg-[#d6a548] px-3 font-mono text-[0.6rem] font-bold uppercase tracking-[0.16em] text-[#1a1209] transition hover:bg-[#e8b85a]"
      >
        <Plus className="size-3.5" /> Thêm
      </button>
    }>
      {editing ? <ProductEditor item={editing} onCancel={() => setEditing(null)} onSave={saveItem} /> : null}
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((p) => (
          <div key={p.id} className="flex flex-col gap-2 rounded-lg border border-[#3b2a0d] bg-[#1a1209]/60 p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-[0.9rem] font-bold text-[#f4eadc]">{p.product}</span>
                  {p.badge ? <span className="rounded border border-[#ef4444]/45 bg-[#ef4444]/10 px-1 py-0.5 font-mono text-[0.46rem] font-bold uppercase tracking-[0.16em] text-[#ffb4ad]">{p.badge}</span> : null}
                </div>
                <p className="font-mono text-[0.5rem] uppercase tracking-[0.14em] text-[#5e574e]">{p.brand} · {p.kind}</p>
                <p className="mt-1 line-clamp-2 text-[0.7rem] text-[#a79d91]">{p.detail}</p>
              </div>
              <div className="flex shrink-0 flex-col gap-1">
                <button type="button" onClick={() => setEditing(p)} className="rounded-md border border-white/10 px-2 py-1 font-mono text-[0.5rem] uppercase tracking-[0.16em] text-[#dfd5c7] transition hover:border-[#d6a548]/45">Edit</button>
                <button type="button" onClick={() => deleteItem(p.id)} className="rounded-md border border-[#ef4444]/35 px-2 py-1 font-mono text-[0.5rem] uppercase tracking-[0.16em] text-[#ffb4ad] transition hover:bg-[#ef4444]/10">
                  <Trash2 className="size-3" />
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between font-mono text-[0.78rem]">
              <span className="font-bold text-[#fff2d3]">{fmtVnd.format(p.priceVnd)}</span>
              <span className="text-[#7dd391]">{p.stock === "in" ? "Sẵn" : p.stock === "low" ? "Sắp hết" : "Đặt trước"}</span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function ProductEditor({ item, onCancel, onSave }: Readonly<{ item: StoreItem; onCancel: () => void; onSave: (item: StoreItem) => Promise<void> }>) {
  const [draft, setDraft] = useState(item);
  const [busy, setBusy] = useState(false);
  const fields: Array<{ key: keyof StoreItem; label: string; type?: string }> = [
    { key: "id", label: "ID (slug)" },
    { key: "brand", label: "Brand" },
    { key: "product", label: "Product" },
    { key: "detail", label: "Detail" },
    { key: "duration", label: "Duration" },
    { key: "priceVnd", label: "Price VND", type: "number" },
    { key: "originalVnd", label: "Original VND (giảm giá)", type: "number" },
    { key: "warranty", label: "Warranty" },
    { key: "badge", label: "Badge (HOT/NEW/...)" },
    { key: "notes", label: "Notes" },
  ];
  const kinds: StoreItemKind[] = ["chatbot", "api", "image", "video", "audio", "code"];

  return (
    <div className="rounded-lg border border-[#d6a548]/45 bg-[#211606]/80 p-4">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {fields.map((f) => (
          <label key={f.key} className="flex flex-col gap-1">
            <span className="font-mono text-[0.55rem] uppercase tracking-[0.16em] text-[#f0c86d]">{f.label}</span>
            <input
              type={f.type ?? "text"}
              value={(draft[f.key] as string | number | undefined) ?? ""}
              onChange={(e) => setDraft({ ...draft, [f.key]: f.type === "number" ? Number(e.target.value) : e.target.value })}
              className="rounded-md border border-[#3b2a0d] bg-[#0e0c08] px-2.5 py-1.5 text-[0.85rem] text-[#f4eadc] outline-none focus:border-[#d6a548]/55"
            />
          </label>
        ))}
        <label className="flex flex-col gap-1">
          <span className="font-mono text-[0.55rem] uppercase tracking-[0.16em] text-[#f0c86d]">Kind</span>
          <select value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value as StoreItemKind })} className="rounded-md border border-[#3b2a0d] bg-[#0e0c08] px-2.5 py-1.5 text-[0.85rem] text-[#f4eadc] outline-none focus:border-[#d6a548]/55">
            {kinds.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-mono text-[0.55rem] uppercase tracking-[0.16em] text-[#f0c86d]">Stock</span>
          <select value={draft.stock} onChange={(e) => setDraft({ ...draft, stock: e.target.value as StoreItem["stock"] })} className="rounded-md border border-[#3b2a0d] bg-[#0e0c08] px-2.5 py-1.5 text-[0.85rem] text-[#f4eadc] outline-none focus:border-[#d6a548]/55">
            <option value="in">in (sẵn hàng)</option>
            <option value="low">low (sắp hết)</option>
            <option value="preorder">preorder (đặt trước)</option>
          </select>
        </label>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-md border border-white/10 px-3 py-1.5 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-[#a79d91] transition hover:border-white/30">Huỷ</button>
        <button
          type="button"
          disabled={busy || !draft.id || !draft.product || !draft.brand}
          onClick={async () => { setBusy(true); try { await onSave(draft); } finally { setBusy(false); } }}
          className="flex items-center gap-2 rounded-md bg-[#d6a548] px-3 py-1.5 font-mono text-[0.6rem] font-bold uppercase tracking-[0.16em] text-[#1a1209] transition hover:bg-[#e8b85a] disabled:opacity-55"
        >
          {busy ? <Loader2 className="size-3 animate-spin" /> : <Save className="size-3" />} Lưu
        </button>
      </div>
    </div>
  );
}

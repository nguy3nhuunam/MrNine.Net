"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpenText,
  Hash,
  History,
  Layers,
  LoaderCircle,
  Moon,
  RefreshCw,
  Sparkles,
  Star,
  WandSparkles,
} from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { cn } from "@/lib/utils";
import { safeParseJson } from "@/lib/fetch-json";
import { computeNumerology, NUMEROLOGY_MEANINGS_VI, type NumerologyReading } from "@/lib/numerology";
import { drawTarot, tarotPositions, type DrawnCard } from "@/lib/tarot";

type DeckTab = "ziwei" | "numerology" | "tarot" | "naming";

type MysticHistoryEntry = {
  id: string;
  kind: "ziwei" | "tarot" | "numerology";
  summary: string;
  at: number;
};

const MYSTIC_HISTORY_KEY = "mrnine-mystic-history";
const MYSTIC_HISTORY_EVENT = "mrnine-mystic-history-update";

function loadMysticHistory(): MysticHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(MYSTIC_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as MysticHistoryEntry[]).slice(0, 12) : [];
  } catch {
    return [];
  }
}

function addMysticHistory(entry: Omit<MysticHistoryEntry, "id" | "at">) {
  if (typeof window === "undefined") return;
  const next: MysticHistoryEntry = {
    ...entry,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    at: Date.now(),
  };
  const current = loadMysticHistory();
  const updated = [next, ...current].slice(0, 12);
  try {
    window.localStorage.setItem(MYSTIC_HISTORY_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent(MYSTIC_HISTORY_EVENT));
  } catch {
    // ignore
  }
}

type Star = {
  name: string;
  type?: string;
  scope?: string;
  brightness?: string;
  mutagen?: string;
};

type Palace = {
  index: number;
  name: string;
  isBodyPalace: boolean;
  isOriginalPalace: boolean;
  heavenlyStem: string;
  earthlyBranch: string;
  majorStars: Star[];
  minorStars: Star[];
  adjectiveStars: Star[];
  changsheng12?: string;
  decadal?: { range: number[] };
  ages?: number[];
};

type Astrolabe = {
  gender: string;
  solarDate: string;
  lunarDate: string;
  chineseDate: string;
  time: string;
  timeRange: string;
  sign: string;
  zodiac: string;
  soul: string;
  body: string;
  fiveElementsClass: string;
  earthlyBranchOfSoulPalace: string;
  earthlyBranchOfBodyPalace: string;
  palaces: Palace[];
};

const HOURS: ReadonlyArray<{ value: number; label: string }> = [
  { value: 0, label: "Tý (23:00 - 00:59)" },
  { value: 1, label: "Sửu (01:00 - 02:59)" },
  { value: 2, label: "Dần (03:00 - 04:59)" },
  { value: 3, label: "Mão (05:00 - 06:59)" },
  { value: 4, label: "Thìn (07:00 - 08:59)" },
  { value: 5, label: "Tỵ (09:00 - 10:59)" },
  { value: 6, label: "Ngọ (11:00 - 12:59)" },
  { value: 7, label: "Mùi (13:00 - 14:59)" },
  { value: 8, label: "Thân (15:00 - 16:59)" },
  { value: 9, label: "Dậu (17:00 - 18:59)" },
  { value: 10, label: "Tuất (19:00 - 20:59)" },
  { value: 11, label: "Hợi (21:00 - 22:59)" },
];

const TABS: ReadonlyArray<{ id: DeckTab; vi: string; en: string; icon: typeof Star }> = [
  { id: "ziwei", vi: "Tử vi", en: "Zi Wei", icon: Star },
  { id: "numerology", vi: "Thần số học", en: "Numerology", icon: Hash },
  { id: "tarot", vi: "Tarot", en: "Tarot", icon: Layers },
  { id: "naming", vi: "Đặt tên ngũ hành", en: "Naming", icon: Sparkles },
];

export function MysticDeckShell() {
  const { language } = useLanguage();
  const [tab, setTab] = useState<DeckTab>("ziwei");

  const heading = language === "vi" ? "Mystic Deck" : "Mystic Deck";
  const subhead =
    language === "vi"
      ? "Tử vi · thần số · tarot · đặt tên"
      : "Astrology · numerology · tarot · naming";

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#0e0b06] text-[#eee2cc]">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(circle at 18% 12%, rgba(214,165,72,0.22), transparent 28%), radial-gradient(circle at 76% 14%, rgba(239,68,68,0.08), transparent 22%), linear-gradient(180deg, #130d05 0%, #070501 100%)",
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
            <Moon className="size-4" />
          </div>
          <div className="hidden min-w-0 sm:block">
            <p className="font-mono text-[0.58rem] uppercase tracking-[0.22em] text-[#d6a548]">MrNine Studio</p>
            <h1 className="truncate text-base font-black tracking-[-0.04em] text-[#f4eadc]">{heading}</h1>
          </div>
        </div>
      </header>

      <section className="relative z-10 mx-auto flex w-full max-w-[120rem] flex-col gap-5 px-4 pb-10 pt-6 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-mono text-[0.6rem] uppercase tracking-[0.28em] text-[#d6a548]">
              {language === "vi" ? "Bộ bài huyền học" : "Mystic toolkit"}
            </p>
            <h2 className="mt-2 font-display text-3xl font-black tracking-[-0.06em] text-[#f4eadc] sm:text-4xl">
              {subhead}
            </h2>
          </div>
          <p className="max-w-md text-[0.78rem] leading-6 text-[#b5ab9f]">
            {language === "vi"
              ? "Tử Vi Đẩu Số 12 cung, Numerology Pythagore và Tarot 78 lá. Mọi tính toán chạy cục bộ; AI luận giải dùng MrNine GPT."
              : "12-palace Zi Wei chart, Pythagorean numerology, 78-card tarot. Local compute; AI interpretation by MrNine GPT."}
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="min-w-0">
            <div className="flex gap-2 overflow-x-auto pb-3 lg:hidden">
              {TABS.map((entry) => {
                const Icon = entry.icon;
                const active = tab === entry.id;
                return (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => setTab(entry.id)}
                    className={cn(
                      "flex shrink-0 items-center gap-2 rounded-md border px-3 py-2 font-mono text-[0.6rem] uppercase tracking-[0.16em] transition",
                      active
                        ? "border-[#d6a548]/55 bg-[#d6a548]/14 text-[#fff2d3]"
                        : "border-white/10 bg-white/[0.025] text-[#9a9087]",
                    )}
                  >
                    <Icon className="size-3.5" />
                    {language === "vi" ? entry.vi : entry.en}
                  </button>
                );
              })}
            </div>
            {tab === "ziwei" ? <ZiweiPanel language={language} /> : null}
            {tab === "numerology" ? <NumerologyPanel language={language} /> : null}
            {tab === "tarot" ? <TarotPanel language={language} /> : null}
            {tab === "naming" ? <NamingComingSoon language={language} /> : null}
          </div>
          <MysticSidePanel language={language} activeTab={tab} onSwitchTab={setTab} />
        </div>
      </section>
    </main>
  );
}

function ZiweiPanel({ language }: Readonly<{ language: "vi" | "en" }>) {
  const [date, setDate] = useState("");
  const [hourIndex, setHourIndex] = useState(0);
  const [gender, setGender] = useState<"male" | "female">("female");
  const [chart, setChart] = useState<Astrolabe | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reading, setReading] = useState("");
  const [readingLoading, setReadingLoading] = useState(false);
  const [readingError, setReadingError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!date) return;
    setLoading(true);
    setError("");
    setReading("");
    setReadingError("");
    try {
      const response = await fetch("/api/mystic-deck/zi-wei", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, hourIndex, gender, language: "vi-VN", fixLeap: true }),
      });
      const data = await safeParseJson(response);
      if (!response.ok) throw new Error(data?.error || "Lỗi tạo lá số.");
      setChart(data as Astrolabe);
      addMysticHistory({
        kind: "ziwei",
        summary: `${(data as Astrolabe).soul} / ${(data as Astrolabe).body} · ${(data as Astrolabe).fiveElementsClass} · ${date}`,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi tạo lá số.");
      setChart(null);
    } finally {
      setLoading(false);
    }
  }

  async function interpret() {
    if (!chart || readingLoading) return;
    setReadingLoading(true);
    setReadingError("");
    setReading("");
    try {
      const text = await fetchInterpretation("ziwei", chart, language);
      setReading(text);
    } catch (err) {
      setReadingError(err instanceof Error ? err.message : "Lỗi luận giải.");
    } finally {
      setReadingLoading(false);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[20rem_minmax(0,1fr)]">
      <form
        onSubmit={submit}
        className="space-y-3 rounded-xl border border-[#3b2a0d] bg-[#100b04]/72 p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset,0_18px_60px_rgba(0,0,0,0.4)]"
      >
        <div>
          <label className="mb-1.5 block font-mono text-[0.58rem] uppercase tracking-[0.18em] text-[#d6a548]">
            {language === "vi" ? "Ngày sinh dương lịch" : "Solar birth date"}
          </label>
          <input
            type="date"
            value={date}
            required
            onChange={(event) => setDate(event.target.value)}
            className="w-full rounded-md border border-white/10 bg-[#1b1508]/85 px-3 py-2 text-sm text-[#f4eadc] outline-none focus:border-[#d6a548]/55"
          />
        </div>
        <div>
          <label className="mb-1.5 block font-mono text-[0.58rem] uppercase tracking-[0.18em] text-[#d6a548]">
            {language === "vi" ? "Giờ sinh" : "Birth hour"}
          </label>
          <select
            value={hourIndex}
            onChange={(event) => setHourIndex(Number(event.target.value))}
            className="w-full rounded-md border border-white/10 bg-[#1b1508]/85 px-3 py-2 text-sm text-[#f4eadc] outline-none focus:border-[#d6a548]/55"
          >
            {HOURS.map((hour) => (
              <option key={hour.value} value={hour.value}>
                {hour.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block font-mono text-[0.58rem] uppercase tracking-[0.18em] text-[#d6a548]">
            {language === "vi" ? "Giới tính" : "Gender"}
          </label>
          <div className="flex gap-2">
            {(["female", "male"] as const).map((value) => (
              <button
                type="button"
                key={value}
                onClick={() => setGender(value)}
                className={cn(
                  "flex-1 rounded-md border px-3 py-2 font-mono text-[0.6rem] uppercase tracking-[0.16em] transition",
                  gender === value
                    ? "border-[#d6a548]/55 bg-[#d6a548]/14 text-[#fff2d3]"
                    : "border-white/10 bg-white/[0.025] text-[#9a9087] hover:border-[#d6a548]/30 hover:text-[#f4eadc]",
                )}
              >
                {value === "female" ? (language === "vi" ? "Nữ" : "Female") : language === "vi" ? "Nam" : "Male"}
              </button>
            ))}
          </div>
        </div>
        <button
          type="submit"
          disabled={loading || !date}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[#d6a548] font-mono text-[0.66rem] font-bold uppercase tracking-[0.16em] text-[#0b0905] hover:bg-[#e6b758] disabled:cursor-not-allowed disabled:opacity-55"
        >
          {loading ? <LoaderCircle className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
          {language === "vi" ? "Lập lá số" : "Cast chart"}
        </button>
        {error ? (
          <div className="rounded-md border border-[#ef4444]/30 bg-[#ef4444]/10 px-3 py-2 text-[0.72rem] text-[#ffb4ad]">
            {error}
          </div>
        ) : null}
      </form>

      <div className="space-y-4">
        {chart ? (
          <>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { label: "Mệnh", value: chart.soul },
                { label: "Thân", value: chart.body },
                { label: "Cục", value: chart.fiveElementsClass },
                { label: "Cung Mệnh", value: chart.earthlyBranchOfSoulPalace },
              ].map((item) => (
                <div key={item.label} className="rounded-md border border-[#3b2a0d] bg-[#100b04]/72 p-3">
                  <div className="font-mono text-[0.5rem] uppercase tracking-[0.18em] text-[#9a9087]">{item.label}</div>
                  <div className="mt-1 truncate text-[0.85rem] font-bold text-[#f4eadc]">{item.value}</div>
                </div>
              ))}
            </div>
            <div className="rounded-md border border-[#3b2a0d] bg-[#100b04]/72 p-3 font-mono text-[0.6rem] uppercase tracking-[0.18em] text-[#b5ab9f]">
              <span className="text-[#d6a548]">Dương lịch:</span> {chart.solarDate} <span className="ml-2 text-[#d6a548]">Âm:</span>{" "}
              {chart.lunarDate} <span className="ml-2 text-[#d6a548]">Can chi:</span> {chart.chineseDate}{" "}
              <span className="ml-2 text-[#d6a548]">Giờ:</span> {chart.time}
            </div>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4">
              {chart.palaces.map((palace) => (
                <PalaceCard key={palace.index} palace={palace} />
              ))}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#d6a548]/24 bg-[#100b04]/72 p-4">
              <div>
                <div className="font-mono text-[0.58rem] uppercase tracking-[0.18em] text-[#d6a548]">
                  {language === "vi" ? "Đọc lá số" : "Read this chart"}
                </div>
                <div className="text-[0.78rem] text-[#b5ab9f]">
                  {language === "vi"
                    ? "AI tổng hợp 12 cung thành bản luận giải có cấu trúc."
                    : "AI summarizes the 12 palaces into a structured reading."}
                </div>
              </div>
              <button
                type="button"
                onClick={interpret}
                disabled={readingLoading}
                className="flex h-10 items-center gap-2 rounded-md bg-[#d6a548] px-4 font-mono text-[0.66rem] font-bold uppercase tracking-[0.16em] text-[#0b0905] hover:bg-[#e6b758] disabled:cursor-not-allowed disabled:opacity-55"
              >
                {readingLoading ? <LoaderCircle className="size-4 animate-spin" /> : <WandSparkles className="size-3.5" />}
                {language === "vi" ? "Luận giải" : "Interpret"}
              </button>
            </div>
            <ReadingCard reading={reading} loading={readingLoading} error={readingError} language={language} />
          </>
        ) : (
          <div className="flex h-full min-h-[16rem] items-center justify-center rounded-xl border border-dashed border-[#3b2a0d] bg-[#100b04]/40 p-6 text-center">
            <div>
              <Star className="mx-auto size-6 text-[#d6a548]" />
              <p className="mt-3 font-mono text-[0.6rem] uppercase tracking-[0.18em] text-[#9a9087]">
                {language === "vi" ? "Nhập thông tin để lập lá số" : "Enter birth info to cast"}
              </p>
              <p className="mt-2 max-w-md text-[0.78rem] text-[#b5ab9f]">
                {language === "vi"
                  ? "Lá số 12 cung Tử Vi Đẩu Số tính toán hoàn toàn cục bộ bằng iztro, không gọi API ngoài."
                  : "12-palace Zi Wei chart computed locally with iztro, no external API."}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PalaceCard({ palace }: Readonly<{ palace: Palace }>) {
  const accent = palace.isOriginalPalace ? "text-[#d6a548]" : palace.isBodyPalace ? "text-[#47c9d9]" : "text-[#b5ab9f]";
  return (
    <div className="rounded-md border border-[#3b2a0d] bg-[#100b04]/76 p-2.5">
      <div className="flex items-baseline justify-between gap-2">
        <div className={cn("text-[0.78rem] font-bold tracking-[-0.02em]", accent)}>{palace.name}</div>
        <div className="font-mono text-[0.5rem] uppercase tracking-[0.18em] text-[#9a9087]">
          {palace.heavenlyStem} {palace.earthlyBranch}
        </div>
      </div>
      {palace.majorStars.length ? (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {palace.majorStars.map((star) => (
            <span
              key={`${star.name}-${star.type ?? ""}`}
              className="rounded border border-[#d6a548]/40 bg-[#d6a548]/12 px-1.5 py-0.5 font-mono text-[0.5rem] uppercase tracking-[0.14em] text-[#fff2d3]"
            >
              {star.name}
              {star.brightness ? <span className="ml-0.5 text-[#d6a548]">·{star.brightness}</span> : null}
              {star.mutagen ? <span className="ml-0.5 text-[#ef4444]">·{star.mutagen}</span> : null}
            </span>
          ))}
        </div>
      ) : null}
      {palace.minorStars.length ? (
        <div className="mt-1 flex flex-wrap gap-1">
          {palace.minorStars.slice(0, 6).map((star) => (
            <span
              key={`${star.name}-${star.type ?? ""}`}
              className="rounded border border-white/8 bg-white/[0.025] px-1.5 py-0.5 font-mono text-[0.48rem] uppercase tracking-[0.14em] text-[#b5ab9f]"
            >
              {star.name}
            </span>
          ))}
        </div>
      ) : null}
      {palace.adjectiveStars.length ? (
        <div className="mt-1 truncate font-mono text-[0.46rem] uppercase tracking-[0.14em] text-[#756d64]">
          {palace.adjectiveStars.slice(0, 4).map((s) => s.name).join(" · ")}
        </div>
      ) : null}
      {palace.decadal?.range ? (
        <div className="mt-1.5 border-t border-white/8 pt-1.5 font-mono text-[0.5rem] uppercase tracking-[0.16em] text-[#9a9087]">
          Đại hạn {palace.decadal.range[0]}-{palace.decadal.range[1]}
        </div>
      ) : null}
    </div>
  );
}

function ReadingCard({
  reading,
  loading,
  error,
  language,
}: Readonly<{ reading: string; loading: boolean; error: string; language: "vi" | "en" }>) {
  if (!reading && !loading && !error) return null;
  return (
    <div className="rounded-xl border border-[#d6a548]/24 bg-[#1b1508]/72 p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset,0_18px_60px_rgba(214,165,72,0.08)]">
      <div className="mb-2 flex items-center gap-2 font-mono text-[0.58rem] uppercase tracking-[0.2em] text-[#d6a548]">
        <WandSparkles className="size-3.5" />
        {language === "vi" ? "Luận giải bằng AI" : "AI interpretation"}
      </div>
      {loading ? (
        <div className="flex items-center gap-2 text-[0.78rem] text-[#b5ab9f]">
          <LoaderCircle className="size-3.5 animate-spin text-[#d6a548]" />
          {language === "vi" ? "Đang luận giải..." : "Interpreting..."}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-md border border-[#ef4444]/30 bg-[#ef4444]/10 px-3 py-2 text-[0.74rem] text-[#ffb4ad]">{error}</div>
      ) : null}
      {reading ? <div className="mt-1 whitespace-pre-wrap text-[0.85rem] leading-7 text-[#efe6dc]">{reading}</div> : null}
    </div>
  );
}

async function fetchInterpretation(kind: "ziwei" | "tarot" | "numerology", payload: unknown, language: string): Promise<string> {
  const response = await fetch("/api/mystic-deck/interpret", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind, payload, language }),
  });
  const data = await safeParseJson(response);
  if (!response.ok) throw new Error(data?.error || "Lỗi luận giải.");
  return String(data?.reading ?? "");
}

function NumerologyPanel({ language }: Readonly<{ language: "vi" | "en" }>) {
  const [date, setDate] = useState("");
  const [name, setName] = useState("");
  const [reading, setReading] = useState<NumerologyReading | null>(null);
  const [aiReading, setAiReading] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!date) return;
    const next = computeNumerology(date, name);
    setReading(next);
    setAiReading("");
    setAiError("");
    addMysticHistory({
      kind: "numerology",
      summary: `${language === "vi" ? "Đường đời" : "Life Path"} ${next.lifePath} · ${name || (language === "vi" ? "Không có tên" : "No name")}`,
    });
  }

  async function interpret() {
    if (!reading || aiLoading) return;
    setAiLoading(true);
    setAiError("");
    setAiReading("");
    try {
      const text = await fetchInterpretation("numerology", { reading, name, date }, language);
      setAiReading(text);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Lỗi luận giải.");
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[20rem_minmax(0,1fr)]">
      <form
        onSubmit={submit}
        className="space-y-3 rounded-xl border border-[#3b2a0d] bg-[#100b04]/72 p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset,0_18px_60px_rgba(0,0,0,0.4)]"
      >
        <div>
          <label className="mb-1.5 block font-mono text-[0.58rem] uppercase tracking-[0.18em] text-[#d6a548]">
            {language === "vi" ? "Ngày sinh" : "Birth date"}
          </label>
          <input
            type="date"
            value={date}
            required
            onChange={(event) => setDate(event.target.value)}
            className="w-full rounded-md border border-white/10 bg-[#1b1508]/85 px-3 py-2 text-sm text-[#f4eadc] outline-none focus:border-[#d6a548]/55"
          />
        </div>
        <div>
          <label className="mb-1.5 block font-mono text-[0.58rem] uppercase tracking-[0.18em] text-[#d6a548]">
            {language === "vi" ? "Họ và tên" : "Full name"}
          </label>
          <input
            type="text"
            value={name}
            placeholder={language === "vi" ? "Ví dụ: Nguyễn Văn An" : "e.g. Jane Doe"}
            onChange={(event) => setName(event.target.value)}
            className="w-full rounded-md border border-white/10 bg-[#1b1508]/85 px-3 py-2 text-sm text-[#f4eadc] outline-none focus:border-[#d6a548]/55 placeholder:text-[#6f675e]"
          />
          <p className="mt-1 font-mono text-[0.48rem] uppercase tracking-[0.14em] text-[#756d64]">
            {language === "vi" ? "Tự loại bỏ dấu, dùng bảng Pythagore" : "Diacritics stripped automatically, Pythagorean"}
          </p>
        </div>
        <button
          type="submit"
          disabled={!date}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[#d6a548] font-mono text-[0.66rem] font-bold uppercase tracking-[0.16em] text-[#0b0905] hover:bg-[#e6b758] disabled:cursor-not-allowed disabled:opacity-55"
        >
          <ArrowRight className="size-4" />
          {language === "vi" ? "Tính số" : "Compute"}
        </button>
      </form>

      <div className="space-y-3">
        {reading ? (
          <>
            <div className="grid gap-2 sm:grid-cols-2">
            {[
              { key: "lifePath", label: "Đường đời (Life Path)", value: reading.lifePath },
              { key: "birthday", label: "Số sinh nhật (Birthday)", value: reading.birthday },
              { key: "expression", label: "Biểu hiện (Expression)", value: reading.expression },
              { key: "soulUrge", label: "Linh hồn (Soul Urge)", value: reading.soulUrge },
              { key: "personality", label: "Nhân cách (Personality)", value: reading.personality },
            ].map((entry) => (
              <div
                key={entry.key}
                className="rounded-xl border border-[#3b2a0d] bg-[#100b04]/72 p-3"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <div className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[#d6a548]">{entry.label}</div>
                  <div className="font-display text-3xl font-black tracking-[-0.06em] text-[#f4eadc]">
                    {entry.value ?? "—"}
                  </div>
                </div>
                {entry.value !== null && entry.value !== undefined ? (
                  <p className="mt-2 text-[0.78rem] leading-5 text-[#b5ab9f]">
                    {NUMEROLOGY_MEANINGS_VI[entry.value] ?? "—"}
                  </p>
                ) : (
                  <p className="mt-2 text-[0.72rem] text-[#756d64]">
                    {language === "vi" ? "Cần họ tên để tính số này." : "Requires a full name."}
                  </p>
                )}
              </div>
            ))}
          </div>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#d6a548]/24 bg-[#100b04]/72 p-4">
              <div>
                <div className="font-mono text-[0.58rem] uppercase tracking-[0.18em] text-[#d6a548]">
                  {language === "vi" ? "Đọc bộ chỉ số" : "Read these numbers"}
                </div>
                <div className="text-[0.78rem] text-[#b5ab9f]">
                  {language === "vi"
                    ? "AI gắn các số thành một bức tranh và đề xuất hành động."
                    : "AI weaves the numbers into a single picture and actions."}
                </div>
              </div>
              <button
                type="button"
                onClick={interpret}
                disabled={aiLoading}
                className="flex h-10 items-center gap-2 rounded-md bg-[#d6a548] px-4 font-mono text-[0.66rem] font-bold uppercase tracking-[0.16em] text-[#0b0905] hover:bg-[#e6b758] disabled:cursor-not-allowed disabled:opacity-55"
              >
                {aiLoading ? <LoaderCircle className="size-4 animate-spin" /> : <WandSparkles className="size-3.5" />}
                {language === "vi" ? "Luận giải" : "Interpret"}
              </button>
            </div>
            <ReadingCard reading={aiReading} loading={aiLoading} error={aiError} language={language} />
          </>
        ) : (
          <div className="flex h-full min-h-[14rem] items-center justify-center rounded-xl border border-dashed border-[#3b2a0d] bg-[#100b04]/40 p-6 text-center">
            <div>
              <Hash className="mx-auto size-6 text-[#d6a548]" />
              <p className="mt-3 font-mono text-[0.6rem] uppercase tracking-[0.18em] text-[#9a9087]">
                {language === "vi" ? "Nhập ngày sinh để bắt đầu" : "Enter birth date to begin"}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TarotPanel({ language }: Readonly<{ language: "vi" | "en" }>) {
  const [drawn, setDrawn] = useState<DrawnCard[] | null>(null);
  const positions = tarotPositions;
  const [reading, setReading] = useState("");
  const [readingLoading, setReadingLoading] = useState(false);
  const [readingError, setReadingError] = useState("");

  function handleDraw() {
    const next = drawTarot(3);
    setDrawn(next);
    setReading("");
    setReadingError("");
    addMysticHistory({
      kind: "tarot",
      summary: next
        .map((d, idx) => `${positions[idx]?.vi ?? `card${idx}`}: ${d.card.name}${d.reversed ? " (R)" : ""}`)
        .join(" · "),
    });
  }

  async function interpret() {
    if (!drawn || readingLoading) return;
    setReadingLoading(true);
    setReadingError("");
    setReading("");
    try {
      const payload = drawn.map((entry, index) => ({
        position: positions[index]?.id ?? `card-${index}`,
        positionVi: positions[index]?.vi ?? "",
        name: entry.card.name,
        arcana: entry.card.arcana,
        suit: entry.card.suit,
        reversed: entry.reversed,
        meaning: entry.reversed ? entry.card.reversed : entry.card.upright,
      }));
      const text = await fetchInterpretation("tarot", { spread: payload }, language);
      setReading(text);
    } catch (err) {
      setReadingError(err instanceof Error ? err.message : "Lỗi luận giải.");
    } finally {
      setReadingLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#3b2a0d] bg-[#100b04]/72 p-4">
        <div>
          <div className="font-mono text-[0.58rem] uppercase tracking-[0.18em] text-[#d6a548]">
            {language === "vi" ? "Trải bài 3 lá" : "3-card spread"}
          </div>
          <div className="text-[0.85rem] text-[#b5ab9f]">
            {language === "vi" ? "Quá khứ · Hiện tại · Tương lai" : "Past · Present · Future"}
          </div>
        </div>
        <button
          type="button"
          onClick={handleDraw}
          className="flex h-10 items-center gap-2 rounded-md bg-[#d6a548] px-4 font-mono text-[0.66rem] font-bold uppercase tracking-[0.16em] text-[#0b0905] hover:bg-[#e6b758]"
        >
          <RefreshCw className="size-3.5" />
          {language === "vi" ? "Rút bài" : "Draw"}
        </button>
      </div>

      {drawn ? (
        <>
        <div className="grid gap-3 md:grid-cols-3">
          {drawn.map((entry, index) => (
            <div
              key={`${entry.card.id}-${index}`}
              className="rounded-xl border border-[#3b2a0d] bg-[#100b04]/72 p-4"
            >
              <div className="font-mono text-[0.5rem] uppercase tracking-[0.18em] text-[#d6a548]">
                {language === "vi" ? positions[index].vi : positions[index].id}
              </div>
              <div className="mt-2 flex items-baseline justify-between gap-2">
                <div className="text-[0.95rem] font-bold text-[#f4eadc]">{entry.card.name}</div>
                <div
                  className={cn(
                    "rounded border px-1.5 py-0.5 font-mono text-[0.46rem] uppercase tracking-[0.18em]",
                    entry.reversed
                      ? "border-[#ef4444]/40 bg-[#ef4444]/10 text-[#ffb4ad]"
                      : "border-[#45a85d]/40 bg-[#45a85d]/10 text-[#bee5c4]",
                  )}
                >
                  {entry.reversed ? (language === "vi" ? "Ngược" : "Reversed") : language === "vi" ? "Xuôi" : "Upright"}
                </div>
              </div>
              <p className="mt-2 text-[0.78rem] leading-5 text-[#dfd5c7]">
                {entry.reversed ? entry.card.reversed : entry.card.upright}
              </p>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#d6a548]/24 bg-[#100b04]/72 p-4">
          <div>
            <div className="font-mono text-[0.58rem] uppercase tracking-[0.18em] text-[#d6a548]">
              {language === "vi" ? "Đọc bài" : "Read the spread"}
            </div>
            <div className="text-[0.78rem] text-[#b5ab9f]">
              {language === "vi"
                ? "AI ghép 3 lá thành câu chuyện và đề xuất hành động trong 30 ngày."
                : "AI weaves the 3 cards into a story with 30-day actions."}
            </div>
          </div>
          <button
            type="button"
            onClick={interpret}
            disabled={readingLoading}
            className="flex h-10 items-center gap-2 rounded-md bg-[#d6a548] px-4 font-mono text-[0.66rem] font-bold uppercase tracking-[0.16em] text-[#0b0905] hover:bg-[#e6b758] disabled:cursor-not-allowed disabled:opacity-55"
          >
            {readingLoading ? <LoaderCircle className="size-4 animate-spin" /> : <WandSparkles className="size-3.5" />}
            {language === "vi" ? "Luận giải" : "Interpret"}
          </button>
        </div>
        <ReadingCard reading={reading} loading={readingLoading} error={readingError} language={language} />
        </>
      ) : (
        <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-[#3b2a0d] bg-[#100b04]/40 p-6 text-center">
          <div>
            <Layers className="mx-auto size-6 text-[#d6a548]" />
            <p className="mt-3 font-mono text-[0.6rem] uppercase tracking-[0.18em] text-[#9a9087]">
              {language === "vi" ? "Bấm Rút bài để bắt đầu" : "Hit Draw to begin"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function NamingComingSoon({ language }: Readonly<{ language: "vi" | "en" }>) {
  return (
    <div className="rounded-xl border border-dashed border-[#3b2a0d] bg-[#100b04]/40 p-6 text-center">
      <Sparkles className="mx-auto size-6 text-[#d6a548]" />
      <h3 className="mt-3 font-display text-2xl font-black tracking-[-0.04em] text-[#f4eadc]">
        {language === "vi" ? "Đặt tên ngũ hành — sắp ra mắt" : "Five-element naming — coming soon"}
      </h3>
      <p className="mx-auto mt-2 max-w-xl text-[0.85rem] leading-6 text-[#b5ab9f]">
        {language === "vi"
          ? "Đặt tên (con, brand, sản phẩm) cân bằng theo ngũ hành Kim - Mộc - Thuỷ - Hoả - Thổ, có gợi ý tên Hán Việt và phân tích thiên can địa chi. Đang xây dataset."
          : "Five-element balanced naming with Han-Viet suggestions and stem-branch analysis. Dataset in progress."}
      </p>
    </div>
  );
}

const TAB_GUIDES = [
  {
    id: "ziwei" as DeckTab,
    icon: Star,
    titleVi: "Tử Vi Đẩu Số",
    titleEn: "Zi Wei Dou Shu",
    bodyVi: "Lá số 12 cung từ ngày dương + giờ Tý-Hợi + giới tính. Đỏ = Cung Mệnh, xanh = Cung Thân.",
    bodyEn: "12-palace chart from solar date + hour-branch + gender. Amber = Soul, cyan = Body.",
  },
  {
    id: "numerology" as DeckTab,
    icon: Hash,
    titleVi: "Thần số học",
    titleEn: "Numerology",
    bodyVi: "Pythagore: 5 chỉ số chính. Master 11/22/33 không bị rút gọn. Họ tên dùng để tính 3 số sau.",
    bodyEn: "Pythagorean: 5 core numbers. Master 11/22/33 stay intact. Full name powers the last three.",
  },
  {
    id: "tarot" as DeckTab,
    icon: Layers,
    titleVi: "Tarot 78 lá",
    titleEn: "Tarot 78",
    bodyVi: "Trải 3 lá Quá khứ / Hiện tại / Tương lai. Khoảng 40% có khả năng ra ngược.",
    bodyEn: "3-card spread Past/Present/Future. Roughly 40% chance any card lands reversed.",
  },
  {
    id: "naming" as DeckTab,
    icon: Sparkles,
    titleVi: "Đặt tên ngũ hành",
    titleEn: "Five-element naming",
    bodyVi: "Đang phát triển. Sẽ ghép can chi + ngũ hành + Hán Việt cho con, brand, sản phẩm.",
    bodyEn: "In development. Will combine stem-branch, five elements, Han-Viet for kid/brand naming.",
  },
];

function MysticSidePanel({
  language,
  activeTab,
  onSwitchTab,
}: Readonly<{ language: "vi" | "en"; activeTab: DeckTab; onSwitchTab: (tab: DeckTab) => void }>) {
  const [history, setHistory] = useState<MysticHistoryEntry[]>([]);

  useEffect(() => {
    setHistory(loadMysticHistory());
    function onUpdate() {
      setHistory(loadMysticHistory());
    }
    window.addEventListener(MYSTIC_HISTORY_EVENT, onUpdate);
    return () => window.removeEventListener(MYSTIC_HISTORY_EVENT, onUpdate);
  }, []);

  function clearHistory() {
    window.localStorage.removeItem(MYSTIC_HISTORY_KEY);
    setHistory([]);
    window.dispatchEvent(new CustomEvent(MYSTIC_HISTORY_EVENT));
  }

  return (
    <aside className="hidden flex-col gap-4 lg:flex">
      <div className="rounded-xl border border-[#3b2a0d] bg-[#100b04]/72 p-3">
        <div className="mb-2 flex items-center gap-2 px-1 font-mono text-[0.58rem] uppercase tracking-[0.18em] text-[#d6a548]">
          <Layers className="size-3.5" />
          {language === "vi" ? "Chọn bộ bài" : "Pick a deck"}
        </div>
        <div className="grid gap-2">
          {TAB_GUIDES.map((guide) => {
            const Icon = guide.icon;
            const active = guide.id === activeTab;
            return (
              <button
                key={guide.id}
                type="button"
                onClick={() => onSwitchTab(guide.id)}
                className={cn(
                  "group flex w-full items-start gap-3 rounded-lg border px-3 py-3 text-left transition",
                  active
                    ? "border-[#d6a548]/55 bg-[#d6a548]/14 text-[#fff2d3] shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset]"
                    : "border-white/10 bg-white/[0.025] hover:-translate-y-0.5 hover:border-[#d6a548]/35 hover:bg-white/[0.05]",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md border transition",
                    active
                      ? "border-[#d6a548]/55 bg-[#d6a548]/22 text-[#fff2d3]"
                      : "border-[#d6a548]/30 bg-[#d6a548]/10 text-[#d6a548]",
                  )}
                >
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="text-[0.85rem] font-bold text-[#f4eadc]">
                      {language === "vi" ? guide.titleVi : guide.titleEn}
                    </span>
                    {guide.id === "naming" ? (
                      <span className="rounded border border-[#d6a548]/40 px-1 py-0.5 text-[0.44rem] uppercase tracking-[0.18em] text-[#d6a548]">
                        SOON
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-1 block text-[0.7rem] leading-5 text-[#b5ab9f]">
                    {language === "vi" ? guide.bodyVi : guide.bodyEn}
                  </span>
                </span>
                <ArrowRight className={cn("size-3.5 shrink-0 transition", active ? "text-[#d6a548]" : "text-[#5e574e] group-hover:text-[#d6a548]")} />
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border border-[#3b2a0d] bg-[#100b04]/72 p-3">
        <div className="flex items-center justify-between gap-3 px-1">
          <div className="flex items-center gap-2 font-mono text-[0.58rem] uppercase tracking-[0.18em] text-[#d6a548]">
            <History className="size-3.5" />
            {language === "vi" ? "Lịch sử gần đây" : "Recent readings"}
          </div>
          {history.length > 0 ? (
            <button
              type="button"
              onClick={clearHistory}
              className="rounded border border-white/10 px-2 py-0.5 font-mono text-[0.5rem] uppercase tracking-[0.16em] text-[#9a9087] transition hover:border-[#ef4444]/40 hover:text-[#ffb4ad]"
            >
              {language === "vi" ? "Xoá" : "Clear"}
            </button>
          ) : null}
        </div>
        {history.length === 0 ? (
          <p className="mt-3 px-1 text-[0.78rem] text-[#b5ab9f]">
            {language === "vi"
              ? "Chưa có bản đọc nào. Mỗi lần lập lá số / rút bài / tính số sẽ tự lưu vào đây (chỉ trên máy này, tối đa 12 mục)."
              : "No readings yet. Each cast / draw / compute is saved here (this device only, up to 12 entries)."}
          </p>
        ) : (
          <ul className="mt-3 space-y-1.5">
            {history.map((entry) => (
              <li key={entry.id}>
                <div className="flex items-center justify-between gap-2 rounded-md border border-white/8 bg-white/[0.025] px-2.5 py-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 font-mono text-[0.5rem] uppercase tracking-[0.16em] text-[#d6a548]">
                      {entry.kind === "ziwei" ? <Star className="size-3" /> : entry.kind === "tarot" ? <Layers className="size-3" /> : <Hash className="size-3" />}
                      {entry.kind === "ziwei" ? (language === "vi" ? "Tử vi" : "Zi Wei") : entry.kind === "tarot" ? "Tarot" : language === "vi" ? "Số học" : "Numbers"}
                    </div>
                    <div className="mt-0.5 truncate text-[0.74rem] text-[#efe6dc]">{entry.summary}</div>
                    <div className="mt-0.5 font-mono text-[0.46rem] uppercase tracking-[0.14em] text-[#756d64]">
                      {new Date(entry.at).toLocaleString(language === "vi" ? "vi-VN" : "en-US")}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-xl border border-[#45a85d]/22 bg-[#071109]/72 p-3">
        <div className="flex items-center gap-2 px-1 font-mono text-[0.54rem] uppercase tracking-[0.18em] text-[#7dd391]">
          <span className="size-1.5 rounded-full bg-[#45a85d]" />
          {language === "vi" ? "Mẹo dùng nhanh" : "Quick tips"}
        </div>
        <ul className="mt-2 space-y-1.5 px-1 text-[0.74rem] leading-5 text-[#b5ab9f]">
          <li>• {language === "vi" ? "Lập lá số xong, bấm Luận giải để AI viết bản đọc có cấu trúc." : "After casting, hit Interpret for an AI-written structured reading."}</li>
          <li>• {language === "vi" ? "Reload trang sẽ giữ lịch sử (lưu trên máy), nhưng không giữ kết quả AI." : "Reload preserves history (local) but not the AI reading."}</li>
          <li>• {language === "vi" ? "Tarot ra ngược → đọc theo nghĩa ngược, không phải xui." : "Reversed tarot reads inverted, not unlucky."}</li>
        </ul>
      </div>
    </aside>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
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
import { formatLunarDateVi } from "@/lib/lunar-format";

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

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#0e0b06] text-[#eee2cc]">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(circle at 8% 18%, rgba(71,201,217,0.18), transparent 32%), radial-gradient(circle at 92% 12%, rgba(214,165,72,0.22), transparent 32%), radial-gradient(circle at 50% 90%, rgba(239,68,68,0.08), transparent 36%), linear-gradient(180deg, #130d05 0%, #070501 100%)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 bg-[size:24px_24px] opacity-60"
        style={{
          backgroundImage:
            "linear-gradient(rgba(214,165,72,0.09) 1px, transparent 1px), linear-gradient(90deg, rgba(214,165,72,0.06) 1px, transparent 1px)",
        }}
      />
      <div className="blueprint-layer pointer-events-none fixed inset-0 -z-10" aria-hidden="true" />

      <header className="relative z-30 flex h-14 shrink-0 items-center gap-3 border-b border-[#3b2a0d] bg-[#100b04]/92 px-3 backdrop-blur md:px-5">
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

        <div className="ml-auto hidden items-center gap-2 font-mono text-[0.56rem] uppercase tracking-[0.2em] text-[#d6a548] md:flex">
          <span className="size-1 rounded-full bg-[#d6a548]" />
          {language === "vi" ? "Bộ bài huyền học" : "Mystic toolkit"}
          <span className="text-[#6f675e]">/</span>
          Exp 007
        </div>
      </header>

      <section className="relative z-10 mx-auto w-full px-4 pb-6 pt-5 sm:px-6 lg:px-10">
        <div className="border-b border-[#3b2a0d] pb-5 sm:pb-7">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="font-mono text-[0.62rem] uppercase tracking-[0.28em] text-[#8f8579]">
                {language === "vi" ? "Trang chủ" : "Home"}
                <span className="mx-2 text-[#5e574e]">/</span>
                {language === "vi" ? "Bộ bài huyền học" : "Mystic toolkit"}
              </p>
              <h2 className="mt-3 font-display text-[clamp(2.4rem,4.4vw,4.4rem)] font-black leading-[0.92] tracking-[-0.06em] text-[#f4eadc]">
                {language === "vi" ? "tử vi · thần số · tarot" : "astrology · numerology · tarot"}
              </h2>
              <p className="mt-3 max-w-2xl text-[0.85rem] leading-7 text-[#c4b9ad] sm:text-base">
                {language === "vi"
                  ? "Lá số 12 cung Tử Vi Đẩu Số, Pythagore numerology, và 78 lá tarot — tính toán cục bộ, AI luận giải có cấu trúc."
                  : "12-palace Zi Wei chart, Pythagorean numerology, and 78-card tarot — local compute, structured AI interpretation."}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="min-w-0 space-y-5">
            <div className="flex gap-2 overflow-x-auto lg:hidden">
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

function ReadingCard({
  reading,
  loading,
  error,
  language,
}: Readonly<{ reading: string; loading: boolean; error: string; language: "vi" | "en" }>) {
  if (!reading && !loading && !error) return null;
  return (
    <div className="rounded-xl border border-[#d6a548]/24 bg-[#1b1508]/72 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset,0_18px_60px_rgba(214,165,72,0.08)]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 font-mono text-[0.58rem] uppercase tracking-[0.2em] text-[#d6a548]">
          <WandSparkles className="size-3.5" />
          {language === "vi" ? "Luận giải bằng AI" : "AI interpretation"}
        </div>
        <span className="font-mono text-[0.5rem] uppercase tracking-[0.16em] text-[#756d64]">GPT-5.5</span>
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
      {reading ? <div className="mt-1 whitespace-pre-wrap text-[0.92rem] leading-7 text-[#efe6dc]">{reading}</div> : null}
    </div>
  );
}

async function fetchInterpretation(
  kind: "ziwei" | "tarot" | "numerology",
  payload: unknown,
  language: string,
): Promise<string> {
  const response = await fetch("/api/mystic-deck/interpret", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind, payload, language }),
  });
  const data = await safeParseJson(response);
  if (!response.ok) throw new Error(data?.error || "Lỗi luận giải.");
  return String(data?.reading ?? "");
}

function PanelHeader({
  index,
  title,
  subtitle,
  language,
  accent = "amber",
}: Readonly<{
  index: string;
  title: string;
  subtitle: string;
  language: "vi" | "en";
  accent?: "amber" | "cyan" | "lime";
}>) {
  void language;
  const colors = {
    amber: "text-[#d6a548]",
    cyan: "text-[#47c9d9]",
    lime: "text-[#7dd391]",
  };
  return (
    <div className="flex items-end justify-between gap-3 border-b border-[#3b2a0d] pb-3">
      <div className="flex items-baseline gap-3">
        <span className={cn("font-mono text-[0.62rem] uppercase tracking-[0.28em]", colors[accent])}>{index}</span>
        <h3 className="font-display text-xl font-black tracking-[-0.04em] text-[#f4eadc] sm:text-2xl">{title}</h3>
      </div>
      <p className="hidden max-w-md text-right text-[0.74rem] leading-5 text-[#9a9087] sm:block">{subtitle}</p>
    </div>
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
        summary: `${(data as Astrolabe).soul} / ${(data as Astrolabe).body} · ${date}`,
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
    <div className="space-y-5">
      <PanelHeader
        index="01"
        title={language === "vi" ? "Lá số Tử Vi Đẩu Số" : "Zi Wei chart"}
        subtitle={language === "vi" ? "Nhập ngày dương + giờ + giới tính. Render bằng iztro local." : "Solar date + hour + gender. Rendered locally with iztro."}
        language={language}
        accent="amber"
      />

      <form onSubmit={submit} className="rounded-xl border border-[#3b2a0d] bg-[#100b04]/72 p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset]">
        <div className="grid gap-3 md:grid-cols-[1fr_1.4fr_1fr_auto]">
          <div>
            <label className="mb-1.5 block font-mono text-[0.54rem] uppercase tracking-[0.18em] text-[#d6a548]">
              {language === "vi" ? "Ngày sinh dương lịch" : "Solar birth date"}
            </label>
            <input
              type="date"
              value={date}
              required
              onChange={(event) => setDate(event.target.value)}
              className="w-full rounded-md border border-white/10 bg-[#1b1508]/85 px-3 py-2.5 text-sm text-[#f4eadc] outline-none focus:border-[#d6a548]/55"
            />
          </div>
          <div>
            <label className="mb-1.5 block font-mono text-[0.54rem] uppercase tracking-[0.18em] text-[#d6a548]">
              {language === "vi" ? "Giờ sinh" : "Birth hour"}
            </label>
            <select
              value={hourIndex}
              onChange={(event) => setHourIndex(Number(event.target.value))}
              className="w-full rounded-md border border-white/10 bg-[#1b1508]/85 px-3 py-2.5 text-sm text-[#f4eadc] outline-none focus:border-[#d6a548]/55"
            >
              {HOURS.map((hour) => (
                <option key={hour.value} value={hour.value}>
                  {hour.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block font-mono text-[0.54rem] uppercase tracking-[0.18em] text-[#d6a548]">
              {language === "vi" ? "Giới tính" : "Gender"}
            </label>
            <div className="flex gap-2">
              {(["female", "male"] as const).map((value) => (
                <button
                  type="button"
                  key={value}
                  onClick={() => setGender(value)}
                  className={cn(
                    "flex-1 rounded-md border px-3 py-2.5 font-mono text-[0.6rem] uppercase tracking-[0.16em] transition",
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
          <div className="flex items-end">
            <button
              type="submit"
              disabled={loading || !date}
              className="flex h-[42px] w-full items-center justify-center gap-2 rounded-md bg-[#d6a548] px-5 font-mono text-[0.66rem] font-bold uppercase tracking-[0.16em] text-[#0b0905] transition hover:bg-[#e6b758] disabled:cursor-not-allowed disabled:opacity-55 md:w-auto"
            >
              {loading ? <LoaderCircle className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
              {language === "vi" ? "Lập lá số" : "Cast chart"}
            </button>
          </div>
        </div>
        {error ? (
          <div className="mt-3 rounded-md border border-[#ef4444]/30 bg-[#ef4444]/10 px-3 py-2 text-[0.74rem] text-[#ffb4ad]">
            {error}
          </div>
        ) : null}
      </form>

      {chart ? (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: language === "vi" ? "Mệnh chủ" : "Soul", value: chart.soul },
              { label: language === "vi" ? "Thân chủ" : "Body", value: chart.body },
              { label: language === "vi" ? "Cục" : "Element", value: chart.fiveElementsClass },
              { label: language === "vi" ? "Cung Mệnh" : "Soul Branch", value: chart.earthlyBranchOfSoulPalace },
            ].map((item) => (
              <div key={item.label} className="rounded-lg border border-[#3b2a0d] bg-[#100b04]/72 p-4">
                <div className="font-mono text-[0.5rem] uppercase tracking-[0.18em] text-[#9a9087]">{item.label}</div>
                <div className="mt-2 truncate font-display text-2xl font-black tracking-[-0.04em] text-[#fff2d3]">{item.value}</div>
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-[#3b2a0d] bg-[#100b04]/72 px-4 py-3 font-mono text-[0.62rem] uppercase tracking-[0.18em] text-[#b5ab9f]">
            <span className="text-[#d6a548]">{language === "vi" ? "Dương lịch" : "Solar"}:</span> {chart.solarDate}
            <span className="ml-3 text-[#d6a548]">{language === "vi" ? "Âm lịch" : "Lunar"}:</span>{" "}
            {formatLunarDateVi(chart.lunarDate, chart.chineseDate)}
            <span className="ml-3 text-[#d6a548]">{language === "vi" ? "Giờ" : "Hour"}:</span> {chart.time}
            {chart.zodiac ? (
              <>
                <span className="ml-3 text-[#d6a548]">{language === "vi" ? "Cung" : "Sign"}:</span> {chart.zodiac}
              </>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {chart.palaces.map((palace) => (
              <PalaceCard key={palace.index} palace={palace} language={language} />
            ))}
          </div>

          <InterpretBar
            language={language}
            loading={readingLoading}
            onClick={interpret}
            titleVi="Đọc lá số"
            titleEn="Read this chart"
            bodyVi="AI tổng hợp 12 cung thành bản luận giải có cấu trúc."
            bodyEn="AI weaves the 12 palaces into a structured reading."
          />
          <ReadingCard reading={reading} loading={readingLoading} error={readingError} language={language} />
        </>
      ) : (
        <EmptyState
          icon={Star}
          titleVi="Nhập thông tin để lập lá số"
          titleEn="Enter birth info to cast"
          bodyVi="Lá số 12 cung Tử Vi Đẩu Số tính toán hoàn toàn cục bộ bằng iztro, không gọi API ngoài. Bấm Luận giải sau khi có lá số để AI đọc."
          bodyEn="12-palace Zi Wei chart computed locally with iztro, no external API. Hit Interpret afterwards for an AI reading."
        />
      )}
    </div>
  );
}

function PalaceCard({ palace, language }: Readonly<{ palace: Palace; language: "vi" | "en" }>) {
  const accent = palace.isOriginalPalace
    ? "border-[#d6a548]/55 bg-[#d6a548]/8"
    : palace.isBodyPalace
      ? "border-[#47c9d9]/45 bg-[#47c9d9]/8"
      : "border-[#3b2a0d] bg-[#100b04]/72";
  const titleAccent = palace.isOriginalPalace ? "text-[#fff2d3]" : palace.isBodyPalace ? "text-[#cef0f6]" : "text-[#efe6dc]";
  return (
    <div className={cn("flex h-full flex-col rounded-lg border p-4", accent)}>
      <div className="flex items-baseline justify-between gap-2">
        <div className={cn("font-display text-lg font-black tracking-[-0.03em]", titleAccent)}>{palace.name}</div>
        <div className="font-mono text-[0.52rem] uppercase tracking-[0.18em] text-[#9a9087]">
          {palace.heavenlyStem} {palace.earthlyBranch}
        </div>
      </div>
      {(palace.isOriginalPalace || palace.isBodyPalace) ? (
        <div className="mt-1 font-mono text-[0.5rem] uppercase tracking-[0.18em] text-[#d6a548]">
          {palace.isOriginalPalace ? (language === "vi" ? "Mệnh" : "Soul") : language === "vi" ? "Thân" : "Body"}
        </div>
      ) : null}
      {palace.majorStars.length ? (
        <div className="mt-3 flex flex-wrap gap-1">
          {palace.majorStars.map((star) => (
            <span
              key={`${star.name}-${star.type ?? ""}`}
              className="rounded border border-[#d6a548]/40 bg-[#d6a548]/12 px-1.5 py-0.5 font-mono text-[0.54rem] uppercase tracking-[0.14em] text-[#fff2d3]"
            >
              {star.name}
              {star.brightness ? <span className="ml-1 text-[#d6a548]">·{star.brightness}</span> : null}
              {star.mutagen ? <span className="ml-1 text-[#ef4444]">·{star.mutagen}</span> : null}
            </span>
          ))}
        </div>
      ) : (
        <div className="mt-3 font-mono text-[0.5rem] uppercase tracking-[0.18em] text-[#6f675e]">
          {language === "vi" ? "Cung trống" : "Empty"}
        </div>
      )}
      {palace.minorStars.length ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {palace.minorStars.slice(0, 8).map((star) => (
            <span
              key={`${star.name}-${star.type ?? ""}`}
              className="rounded border border-white/10 bg-white/[0.025] px-1.5 py-0.5 font-mono text-[0.5rem] uppercase tracking-[0.14em] text-[#b5ab9f]"
            >
              {star.name}
            </span>
          ))}
        </div>
      ) : null}
      {palace.adjectiveStars.length ? (
        <div className="mt-2 truncate font-mono text-[0.48rem] uppercase tracking-[0.14em] text-[#756d64]">
          {palace.adjectiveStars.slice(0, 6).map((s) => s.name).join(" · ")}
        </div>
      ) : null}
      <div className="mt-auto flex items-center justify-between gap-2 border-t border-white/8 pt-3 font-mono text-[0.5rem] uppercase tracking-[0.16em] text-[#9a9087]">
        {palace.decadal?.range ? (
          <span>{language === "vi" ? "Đại hạn" : "Decadal"} {palace.decadal.range[0]}-{palace.decadal.range[1]}</span>
        ) : (
          <span>—</span>
        )}
        {palace.changsheng12 ? <span className="text-[#d6a548]">{palace.changsheng12}</span> : null}
      </div>
    </div>
  );
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
    <div className="mystic-anim-numerology relative space-y-5 rounded-xl">
      <PanelHeader
        index="02"
        title={language === "vi" ? "Bộ chỉ số thần số học" : "Numerology profile"}
        subtitle={language === "vi" ? "Pythagore: Life Path, Birthday, Expression, Soul Urge, Personality." : "Pythagorean: 5 core numbers including master 11/22/33."}
        language={language}
        accent="cyan"
      />

      <form onSubmit={submit} className="rounded-xl border border-[#3b2a0d] bg-[#100b04]/72 p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset]">
        <div className="grid gap-3 md:grid-cols-[1fr_2fr_auto]">
          <div>
            <label className="mb-1.5 block font-mono text-[0.54rem] uppercase tracking-[0.18em] text-[#47c9d9]">
              {language === "vi" ? "Ngày sinh" : "Birth date"}
            </label>
            <input
              type="date"
              value={date}
              required
              onChange={(event) => setDate(event.target.value)}
              className="w-full rounded-md border border-white/10 bg-[#06161a]/85 px-3 py-2.5 text-sm text-[#f4eadc] outline-none focus:border-[#47c9d9]/55"
            />
          </div>
          <div>
            <label className="mb-1.5 block font-mono text-[0.54rem] uppercase tracking-[0.18em] text-[#47c9d9]">
              {language === "vi" ? "Họ và tên" : "Full name"}
            </label>
            <input
              type="text"
              value={name}
              placeholder={language === "vi" ? "Nguyễn Văn An" : "Jane Doe"}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-md border border-white/10 bg-[#06161a]/85 px-3 py-2.5 text-sm text-[#f4eadc] outline-none focus:border-[#47c9d9]/55 placeholder:text-[#6f675e]"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={!date}
              className="flex h-[42px] w-full items-center justify-center gap-2 rounded-md bg-[#47c9d9] px-5 font-mono text-[0.66rem] font-bold uppercase tracking-[0.16em] text-[#062029] transition hover:bg-[#5cd9e8] disabled:cursor-not-allowed disabled:opacity-55 md:w-auto"
            >
              <ArrowRight className="size-4" />
              {language === "vi" ? "Tính số" : "Compute"}
            </button>
          </div>
        </div>
        <p className="mt-2 font-mono text-[0.48rem] uppercase tracking-[0.14em] text-[#756d64]">
          {language === "vi" ? "Tự loại bỏ dấu, dùng bảng Pythagore. Master 11/22/33 không bị rút gọn." : "Diacritics stripped automatically. Pythagorean table. Master 11/22/33 stay intact."}
        </p>
      </form>

      {reading ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { key: "lifePath", labelVi: "Đường đời", labelEn: "Life Path", value: reading.lifePath },
              { key: "birthday", labelVi: "Số sinh nhật", labelEn: "Birthday", value: reading.birthday },
              { key: "expression", labelVi: "Biểu hiện", labelEn: "Expression", value: reading.expression },
              { key: "soulUrge", labelVi: "Linh hồn", labelEn: "Soul Urge", value: reading.soulUrge },
              { key: "personality", labelVi: "Nhân cách", labelEn: "Personality", value: reading.personality },
            ].map((entry) => (
              <div key={entry.key} className="flex h-full flex-col rounded-xl border border-[#3b2a0d] bg-[#100b04]/72 p-5">
                <div className="font-mono text-[0.55rem] uppercase tracking-[0.2em] text-[#47c9d9]">
                  {language === "vi" ? entry.labelVi : entry.labelEn}
                </div>
                <div className="mt-3 font-display text-[5rem] font-black leading-none tracking-[-0.06em] text-[#f4eadc]">
                  {entry.value ?? "—"}
                </div>
                {entry.value !== null && entry.value !== undefined ? (
                  <p className="mt-3 text-[0.78rem] leading-5 text-[#b5ab9f]">{NUMEROLOGY_MEANINGS_VI[entry.value] ?? "—"}</p>
                ) : (
                  <p className="mt-3 text-[0.7rem] text-[#756d64]">
                    {language === "vi" ? "Cần họ tên để tính số này." : "Requires a full name."}
                  </p>
                )}
              </div>
            ))}
          </div>

          <InterpretBar
            language={language}
            loading={aiLoading}
            onClick={interpret}
            titleVi="Đọc bộ chỉ số"
            titleEn="Read these numbers"
            bodyVi="AI gắn các số thành một bức tranh và đề xuất hành động."
            bodyEn="AI weaves the numbers into a single picture and actions."
            accent="cyan"
          />
          <ReadingCard reading={aiReading} loading={aiLoading} error={aiError} language={language} />
        </>
      ) : (
        <EmptyState
          icon={Hash}
          titleVi="Nhập ngày sinh để bắt đầu"
          titleEn="Enter birth date to begin"
          bodyVi="Ngày sinh đủ để tính Đường đời và Số sinh nhật. Thêm họ tên để có thêm Biểu hiện, Linh hồn và Nhân cách."
          bodyEn="Date alone fills Life Path and Birthday. Add a name for Expression, Soul Urge, and Personality."
        />
      )}
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
    <div className="mystic-anim-tarot relative space-y-5 rounded-xl">
      <PanelHeader
        index="03"
        title={language === "vi" ? "Trải bài tarot 3 lá" : "3-card tarot spread"}
        subtitle={language === "vi" ? "Quá khứ · Hiện tại · Tương lai. Bộ 78 lá Major + Minor Arcana." : "Past · Present · Future from a 78-card deck."}
        language={language}
        accent="amber"
      />

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#3b2a0d] bg-[#100b04]/72 p-4">
        <div>
          <div className="font-mono text-[0.58rem] uppercase tracking-[0.18em] text-[#d6a548]">
            {language === "vi" ? "Trải bài 3 lá" : "3-card spread"}
          </div>
          <div className="text-[0.85rem] text-[#b5ab9f]">
            {language === "vi" ? "Quá khứ · Hiện tại · Tương lai. ~40% lá có thể ra ngược." : "Past · Present · Future. ~40% chance any card lands reversed."}
          </div>
        </div>
        <button
          type="button"
          onClick={handleDraw}
          className="flex h-11 items-center gap-2 rounded-md bg-[#d6a548] px-5 font-mono text-[0.66rem] font-bold uppercase tracking-[0.16em] text-[#0b0905] transition hover:bg-[#e6b758]"
        >
          <RefreshCw className="size-3.5" />
          {language === "vi" ? "Rút bài" : "Draw"}
        </button>
      </div>

      {drawn ? (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            {drawn.map((entry, index) => (
              <TarotCardView key={`${entry.card.id}-${index}`} entry={entry} positionLabel={language === "vi" ? positions[index].vi : positions[index].id} language={language} />
            ))}
          </div>

          <InterpretBar
            language={language}
            loading={readingLoading}
            onClick={interpret}
            titleVi="Đọc bài"
            titleEn="Read the spread"
            bodyVi="AI ghép 3 lá thành câu chuyện và đề xuất hành động trong 30 ngày."
            bodyEn="AI weaves the 3 cards into a story with 30-day actions."
          />
          <ReadingCard reading={reading} loading={readingLoading} error={readingError} language={language} />
        </>
      ) : (
        <EmptyState
          icon={Layers}
          titleVi="Bấm Rút bài để bắt đầu"
          titleEn="Hit Draw to begin"
          bodyVi="3 lá rút ngẫu nhiên không trùng. Mỗi lá có ~40% xác suất xuôi/ngược. Reading không lưu."
          bodyEn="3 unique cards drawn at random, ~40% reversed odds. The reading itself is not persisted."
        />
      )}
    </div>
  );
}

function TarotCardView({
  entry,
  positionLabel,
  language,
}: Readonly<{ entry: DrawnCard; positionLabel: string; language: "vi" | "en" }>) {
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-[#3b2a0d] bg-[#100b04]/72 p-5 transition hover:-translate-y-0.5 hover:border-[#d6a548]/55">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-30 transition group-hover:opacity-60"
        style={{
          background: entry.reversed
            ? "radial-gradient(circle at 50% 110%, rgba(239,68,68,0.32), transparent 65%)"
            : "radial-gradient(circle at 50% -10%, rgba(214,165,72,0.32), transparent 65%)",
        }}
      />
      <div className="relative z-[1] flex items-center justify-between">
        <span className="font-mono text-[0.5rem] uppercase tracking-[0.18em] text-[#d6a548]">{positionLabel}</span>
        <span
          className={cn(
            "rounded border px-1.5 py-0.5 font-mono text-[0.48rem] uppercase tracking-[0.18em]",
            entry.reversed
              ? "border-[#ef4444]/45 bg-[#ef4444]/10 text-[#ffb4ad]"
              : "border-[#45a85d]/45 bg-[#45a85d]/10 text-[#bee5c4]",
          )}
        >
          {entry.reversed ? (language === "vi" ? "Ngược" : "Reversed") : language === "vi" ? "Xuôi" : "Upright"}
        </span>
      </div>
      <div className="relative z-[1] mt-4 flex aspect-[3/4] flex-col items-center justify-center rounded-md border border-[#3b2a0d] bg-[#1b1508]/60">
        <Layers className={cn("size-10 transition", entry.reversed ? "rotate-180 text-[#ef4444]" : "text-[#d6a548]")} aria-hidden="true" />
        <div className="mt-3 px-3 text-center font-display text-lg font-black tracking-[-0.04em] text-[#fff2d3]">
          {entry.card.name}
        </div>
        <div className="mt-1 font-mono text-[0.5rem] uppercase tracking-[0.18em] text-[#9a9087]">
          {entry.card.arcana === "major" ? "Major Arcana" : entry.card.suit?.toUpperCase()}
        </div>
      </div>
      <p className="relative z-[1] mt-4 text-[0.85rem] leading-6 text-[#dfd5c7]">
        {entry.reversed ? entry.card.reversed : entry.card.upright}
      </p>
    </article>
  );
}

function InterpretBar({
  language,
  loading,
  onClick,
  titleVi,
  titleEn,
  bodyVi,
  bodyEn,
  accent = "amber",
}: Readonly<{
  language: "vi" | "en";
  loading: boolean;
  onClick: () => void;
  titleVi: string;
  titleEn: string;
  bodyVi: string;
  bodyEn: string;
  accent?: "amber" | "cyan";
}>) {
  const colors = {
    amber: { btn: "bg-[#d6a548] text-[#0b0905] hover:bg-[#e6b758]", border: "border-[#d6a548]/24", label: "text-[#d6a548]" },
    cyan: { btn: "bg-[#47c9d9] text-[#062029] hover:bg-[#5cd9e8]", border: "border-[#47c9d9]/24", label: "text-[#47c9d9]" },
  };
  const c = colors[accent];
  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-[#100b04]/72 p-4", c.border)}>
      <div>
        <div className={cn("font-mono text-[0.58rem] uppercase tracking-[0.18em]", c.label)}>
          {language === "vi" ? titleVi : titleEn}
        </div>
        <div className="text-[0.78rem] text-[#b5ab9f]">{language === "vi" ? bodyVi : bodyEn}</div>
      </div>
      <button
        type="button"
        onClick={onClick}
        disabled={loading}
        className={cn(
          "flex h-10 items-center gap-2 rounded-md px-4 font-mono text-[0.66rem] font-bold uppercase tracking-[0.16em] transition disabled:cursor-not-allowed disabled:opacity-55",
          c.btn,
        )}
      >
        {loading ? <LoaderCircle className="size-4 animate-spin" /> : <WandSparkles className="size-3.5" />}
        {language === "vi" ? "Luận giải" : "Interpret"}
      </button>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  titleVi,
  titleEn,
  bodyVi,
  bodyEn,
}: Readonly<{ icon: typeof Star; titleVi: string; titleEn: string; bodyVi: string; bodyEn: string }>) {
  const { language } = useLanguage();
  return (
    <div className="flex min-h-[20rem] items-center justify-center rounded-xl border border-dashed border-[#3b2a0d] bg-[#100b04]/40 p-8 text-center">
      <div>
        <Icon className="mx-auto size-8 text-[#d6a548]" />
        <p className="mt-4 font-mono text-[0.6rem] uppercase tracking-[0.18em] text-[#9a9087]">
          {language === "vi" ? titleVi : titleEn}
        </p>
        <p className="mx-auto mt-3 max-w-xl text-[0.85rem] leading-6 text-[#b5ab9f]">
          {language === "vi" ? bodyVi : bodyEn}
        </p>
      </div>
    </div>
  );
}

function NamingComingSoon({ language }: Readonly<{ language: "vi" | "en" }>) {
  return (
    <div className="mystic-anim-naming relative space-y-5 rounded-xl">
      <PanelHeader
        index="04"
        title={language === "vi" ? "Đặt tên ngũ hành" : "Five-element naming"}
        subtitle={language === "vi" ? "Sắp ra mắt." : "Coming soon."}
        language={language}
        accent="lime"
      />
      <div className="rounded-xl border border-dashed border-[#3b2a0d] bg-[#100b04]/40 p-8 text-center">
        <Sparkles className="mx-auto size-8 text-[#d6a548]" />
        <h3 className="mt-4 font-display text-2xl font-black tracking-[-0.04em] text-[#f4eadc]">
          {language === "vi" ? "Đặt tên ngũ hành — sắp ra mắt" : "Five-element naming — coming soon"}
        </h3>
        <p className="mx-auto mt-3 max-w-xl text-[0.85rem] leading-6 text-[#b5ab9f]">
          {language === "vi"
            ? "Đặt tên (con, brand, sản phẩm) cân bằng theo ngũ hành Kim · Mộc · Thuỷ · Hoả · Thổ, có gợi ý tên Hán Việt và phân tích thiên can địa chi. Đang xây dataset."
            : "Five-element balanced naming with Han-Viet suggestions and stem-branch analysis. Dataset in progress."}
        </p>
      </div>
    </div>
  );
}

const TAB_GUIDES = [
  {
    id: "ziwei" as DeckTab,
    icon: Star,
    titleVi: "Tử Vi Đẩu Số",
    titleEn: "Zi Wei Dou Shu",
    bodyVi: "12 cung từ ngày dương + giờ + giới tính.",
    bodyEn: "12 palaces from solar date, hour, gender.",
  },
  {
    id: "numerology" as DeckTab,
    icon: Hash,
    titleVi: "Thần số học",
    titleEn: "Numerology",
    bodyVi: "Pythagore — 5 chỉ số chính, master 11/22/33.",
    bodyEn: "Pythagorean — 5 core numbers, master 11/22/33.",
  },
  {
    id: "tarot" as DeckTab,
    icon: Layers,
    titleVi: "Tarot 78 lá",
    titleEn: "Tarot 78",
    bodyVi: "Trải 3 lá Past / Present / Future.",
    bodyEn: "3-card Past / Present / Future spread.",
  },
  {
    id: "naming" as DeckTab,
    icon: Sparkles,
    titleVi: "Đặt tên ngũ hành",
    titleEn: "Five-element naming",
    bodyVi: "Đang phát triển.",
    bodyEn: "In development.",
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
        <div className="mb-2 flex items-center justify-between gap-3 border-b border-white/8 px-1 pb-2 font-mono text-[0.58rem] uppercase tracking-[0.18em] text-[#d6a548]">
          <span className="flex items-center gap-2">
            <BookOpenText className="size-3.5" />
            {language === "vi" ? "Chọn bộ bài" : "Pick a deck"}
          </span>
          <span className="text-[#5e574e]">/ 04</span>
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
        <div className="flex items-center justify-between gap-3 border-b border-white/8 px-1 pb-2">
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
          ) : (
            <span className="font-mono text-[0.5rem] uppercase tracking-[0.16em] text-[#5e574e]">/ 0</span>
          )}
        </div>
        {history.length === 0 ? (
          <p className="mt-3 px-1 text-[0.78rem] leading-5 text-[#b5ab9f]">
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
        <div className="flex items-center gap-2 border-b border-white/8 px-1 pb-2 font-mono text-[0.54rem] uppercase tracking-[0.18em] text-[#7dd391]">
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

"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent, type ReactNode } from "react";
import {
  ArrowRight,
  AudioLines,
  Bot,
  BookOpenText,
  Calculator,
  ChevronDown,
  Check,
  Clapperboard,
  FileSearch,
  Image as ImageLucide,
  ImageDown,
  Languages,
  LineChart,
  LoaderCircle,
  Lock,
  Menu,
  MessageCircle,
  Moon,
  PenLine,
  Search,
  Send,
  ShoppingBag,
  Sparkles,
  Sun,
  Sunrise,
  Sunset,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { languageOptions as appLanguageOptions, useLanguage, type WebLanguage } from "@/components/LanguageProvider";
import { cn } from "@/lib/utils";
import { safeParseJson } from "@/lib/fetch-json";
import { DiscordActivity } from "@/components/DiscordActivity";
import { TabAudioVisualizer } from "@/components/TabAudioVisualizer";
import { allModels as falAllModels, type FalCapability } from "@/lib/fal-models";
import { aiStoreCatalog } from "@/lib/ai-store-catalog";

const storeFmtVnd = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 });

type InterfaceTheme = "auto" | "crimson" | "signal" | "gold" | "frost" | "eclipse" | "plasma";
type AskAction =
  | { type: "navigate"; label: string; href: string; reason?: string }
  | { type: "compose"; label: string; steps: Array<{ label: string; href: string }>; reason?: string };

type AskMessage = {
  role: "user" | "assistant";
  content: string;
  action?: AskAction | null;
};

const legacyLanguageOptions: ReadonlyArray<{ value: WebLanguage; label: string; title: string }> = [
  { value: "en", label: "EN", title: "English" },
  { value: "vi", label: "VI", title: "Tiếng Việt" },
];

void legacyLanguageOptions;

const interfaceThemes: ReadonlyArray<{
  value: InterfaceTheme;
  label: string;
  title: string;
  swatch: string;
  main: string;
  ambient: string;
  grid: string;
  header: string;
  selector: string;
  selected: string;
}> = [
  {
    value: "auto",
    label: "Auto",
    title: "Balanced control surface",
    swatch: "bg-[#d6a548]",
    main: "bg-[#0b0a08] text-[#e8dfd4]",
    ambient: "bg-[radial-gradient(circle_at_16%_10%,rgba(69,168,93,0.16),transparent_28%),radial-gradient(circle_at_78%_12%,rgba(239,68,68,0.1),transparent_24%),linear-gradient(180deg,#0d0c0a_0%,#070604_100%)]",
    grid: "bg-[linear-gradient(rgba(94,86,75,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(94,86,75,0.055)_1px,transparent_1px)]",
    header: "border-[#25211b] bg-[#0a0907]/92",
    selector: "border-[#d6a548]/22 bg-[#1b1508] text-[#d6a548]",
    selected: "border-[#d6a548]/60 bg-[#d6a548]/14 text-[#f4eadc]",
  },
  {
    value: "crimson",
    label: "Crimson",
    title: "Red terminal interface",
    swatch: "bg-[#ef4444]",
    main: "bg-[#0b0707] text-[#f4e8df]",
    ambient: "bg-[radial-gradient(circle_at_18%_12%,rgba(239,68,68,0.22),transparent_28%),radial-gradient(circle_at_72%_18%,rgba(214,165,72,0.08),transparent_22%),linear-gradient(180deg,#120808_0%,#060303_100%)]",
    grid: "bg-[linear-gradient(rgba(239,68,68,0.075)_1px,transparent_1px),linear-gradient(90deg,rgba(244,234,220,0.035)_1px,transparent_1px)]",
    header: "border-[#3a1815] bg-[#100606]/92",
    selector: "border-[#ef4444]/34 bg-[#2a0b08] text-[#ff7b72]",
    selected: "border-[#ef4444]/70 bg-[#ef4444]/16 text-[#ffe9e5]",
  },
  {
    value: "signal",
    label: "Signal",
    title: "Green operations interface",
    swatch: "bg-[#45a85d]",
    main: "bg-[#070d09] text-[#e4f0e5]",
    ambient: "bg-[radial-gradient(circle_at_16%_10%,rgba(69,168,93,0.26),transparent_30%),radial-gradient(circle_at_78%_16%,rgba(71,201,217,0.09),transparent_24%),linear-gradient(180deg,#071109_0%,#030604_100%)]",
    grid: "bg-[linear-gradient(rgba(69,168,93,0.075)_1px,transparent_1px),linear-gradient(90deg,rgba(69,168,93,0.052)_1px,transparent_1px)]",
    header: "border-[#15351e] bg-[#050c07]/92",
    selector: "border-[#45a85d]/34 bg-[#071d0d] text-[#78d38e]",
    selected: "border-[#45a85d]/70 bg-[#45a85d]/16 text-[#edfff0]",
  },
  {
    value: "gold",
    label: "Gold",
    title: "Amber market interface",
    swatch: "bg-[#d6a548]",
    main: "bg-[#0e0b06] text-[#eee2cc]",
    ambient: "bg-[radial-gradient(circle_at_18%_12%,rgba(214,165,72,0.22),transparent_28%),radial-gradient(circle_at_76%_14%,rgba(239,68,68,0.08),transparent_22%),linear-gradient(180deg,#130d05_0%,#070501_100%)]",
    grid: "bg-[linear-gradient(rgba(214,165,72,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(214,165,72,0.045)_1px,transparent_1px)]",
    header: "border-[#3b2a0d] bg-[#100b04]/92",
    selector: "border-[#d6a548]/42 bg-[#211606] text-[#f0c86d]",
    selected: "border-[#d6a548]/70 bg-[#d6a548]/16 text-[#fff2d3]",
  },
  {
    value: "frost",
    label: "Frost",
    title: "Cold visual engine interface",
    swatch: "bg-[#47c9d9]",
    main: "bg-[#060b0d] text-[#dff3f6]",
    ambient: "bg-[radial-gradient(circle_at_15%_10%,rgba(71,201,217,0.2),transparent_28%),radial-gradient(circle_at_72%_18%,rgba(69,168,93,0.08),transparent_22%),linear-gradient(180deg,#061014_0%,#030607_100%)]",
    grid: "bg-[linear-gradient(rgba(71,201,217,0.065)_1px,transparent_1px),linear-gradient(90deg,rgba(71,201,217,0.045)_1px,transparent_1px)]",
    header: "border-[#12323a] bg-[#050d10]/92",
    selector: "border-[#47c9d9]/36 bg-[#061b20] text-[#79ddeb]",
    selected: "border-[#47c9d9]/70 bg-[#47c9d9]/16 text-[#e9fcff]",
  },
  {
    value: "eclipse",
    label: "Eclipse",
    title: "Deep violet mystic interface",
    swatch: "bg-[#a78bfa]",
    main: "bg-[#0b0814] text-[#ece6ff]",
    ambient: "bg-[radial-gradient(circle_at_18%_10%,rgba(167,139,250,0.22),transparent_30%),radial-gradient(circle_at_82%_18%,rgba(214,165,72,0.06),transparent_22%),linear-gradient(180deg,#10081f_0%,#030107_100%)]",
    grid: "bg-[linear-gradient(rgba(167,139,250,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(167,139,250,0.05)_1px,transparent_1px)]",
    header: "border-[#2a1d4a] bg-[#0b0716]/92",
    selector: "border-[#a78bfa]/36 bg-[#1a1133] text-[#c4b3ff]",
    selected: "border-[#a78bfa]/70 bg-[#a78bfa]/16 text-[#f1ebff]",
  },
  {
    value: "plasma",
    label: "Plasma",
    title: "Neon magenta cyberpunk interface",
    swatch: "bg-[#ec4899]",
    main: "bg-[#0d0610] text-[#ffd9ec]",
    ambient: "bg-[radial-gradient(circle_at_18%_10%,rgba(236,72,153,0.22),transparent_30%),radial-gradient(circle_at_80%_22%,rgba(71,201,217,0.12),transparent_24%),linear-gradient(180deg,#160820_0%,#04020a_100%)]",
    grid: "bg-[linear-gradient(rgba(236,72,153,0.075)_1px,transparent_1px),linear-gradient(90deg,rgba(236,72,153,0.05)_1px,transparent_1px)]",
    header: "border-[#3b1334] bg-[#10071a]/92",
    selector: "border-[#ec4899]/36 bg-[#26102a] text-[#ff8fc4]",
    selected: "border-[#ec4899]/70 bg-[#ec4899]/16 text-[#ffe0f0]",
  },
];

const themeVisuals: Record<
  InterfaceTheme,
  {
    main: CSSProperties;
    ambient: CSSProperties;
    grid: CSSProperties;
    header: CSSProperties;
    selector: CSSProperties;
    selected: CSSProperties;
  }
> = {
  auto: {
    main: { backgroundColor: "#0b0a08", color: "#e8dfd4" },
    ambient: {
      background:
        "radial-gradient(circle at 16% 10%, rgba(69,168,93,0.16), transparent 28%), radial-gradient(circle at 78% 12%, rgba(239,68,68,0.1), transparent 24%), linear-gradient(180deg, #0d0c0a 0%, #070604 100%)",
    },
    grid: {
      backgroundImage:
        "linear-gradient(rgba(94,86,75,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(94,86,75,0.055) 1px, transparent 1px)",
    },
    header: { backgroundColor: "rgba(10,9,7,0.92)", borderColor: "#25211b" },
    selector: { backgroundColor: "#1b1508", borderColor: "rgba(214,165,72,0.22)", color: "#d6a548" },
    selected: { backgroundColor: "rgba(214,165,72,0.14)", borderColor: "rgba(214,165,72,0.6)", color: "#f4eadc" },
  },
  crimson: {
    main: { backgroundColor: "#0b0707", color: "#f4e8df" },
    ambient: {
      background:
        "radial-gradient(circle at 18% 12%, rgba(239,68,68,0.22), transparent 28%), radial-gradient(circle at 72% 18%, rgba(214,165,72,0.08), transparent 22%), linear-gradient(180deg, #120808 0%, #060303 100%)",
    },
    grid: {
      backgroundImage:
        "linear-gradient(rgba(239,68,68,0.075) 1px, transparent 1px), linear-gradient(90deg, rgba(244,234,220,0.035) 1px, transparent 1px)",
    },
    header: { backgroundColor: "rgba(16,6,6,0.92)", borderColor: "#3a1815" },
    selector: { backgroundColor: "#2a0b08", borderColor: "rgba(239,68,68,0.34)", color: "#ff7b72" },
    selected: { backgroundColor: "rgba(239,68,68,0.16)", borderColor: "rgba(239,68,68,0.7)", color: "#ffe9e5" },
  },
  signal: {
    main: { backgroundColor: "#070d09", color: "#e4f0e5" },
    ambient: {
      background:
        "radial-gradient(circle at 16% 10%, rgba(69,168,93,0.26), transparent 30%), radial-gradient(circle at 78% 16%, rgba(71,201,217,0.09), transparent 24%), linear-gradient(180deg, #071109 0%, #030604 100%)",
    },
    grid: {
      backgroundImage:
        "linear-gradient(rgba(69,168,93,0.075) 1px, transparent 1px), linear-gradient(90deg, rgba(69,168,93,0.052) 1px, transparent 1px)",
    },
    header: { backgroundColor: "rgba(5,12,7,0.92)", borderColor: "#15351e" },
    selector: { backgroundColor: "#071d0d", borderColor: "rgba(69,168,93,0.34)", color: "#78d38e" },
    selected: { backgroundColor: "rgba(69,168,93,0.16)", borderColor: "rgba(69,168,93,0.7)", color: "#edfff0" },
  },
  gold: {
    main: { backgroundColor: "#0e0b06", color: "#eee2cc" },
    ambient: {
      background:
        "radial-gradient(circle at 18% 12%, rgba(214,165,72,0.22), transparent 28%), radial-gradient(circle at 76% 14%, rgba(239,68,68,0.08), transparent 22%), linear-gradient(180deg, #130d05 0%, #070501 100%)",
    },
    grid: {
      backgroundImage:
        "linear-gradient(rgba(214,165,72,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(214,165,72,0.045) 1px, transparent 1px)",
    },
    header: { backgroundColor: "rgba(16,11,4,0.92)", borderColor: "#3b2a0d" },
    selector: { backgroundColor: "#211606", borderColor: "rgba(214,165,72,0.42)", color: "#f0c86d" },
    selected: { backgroundColor: "rgba(214,165,72,0.16)", borderColor: "rgba(214,165,72,0.7)", color: "#fff2d3" },
  },
  frost: {
    main: { backgroundColor: "#060b0d", color: "#dff3f6" },
    ambient: {
      background:
        "radial-gradient(circle at 15% 10%, rgba(71,201,217,0.2), transparent 28%), radial-gradient(circle at 72% 18%, rgba(69,168,93,0.08), transparent 22%), linear-gradient(180deg, #061014 0%, #030607 100%)",
    },
    grid: {
      backgroundImage:
        "linear-gradient(rgba(71,201,217,0.065) 1px, transparent 1px), linear-gradient(90deg, rgba(71,201,217,0.045) 1px, transparent 1px)",
    },
    header: { backgroundColor: "rgba(5,13,16,0.92)", borderColor: "#12323a" },
    selector: { backgroundColor: "#061b20", borderColor: "rgba(71,201,217,0.36)", color: "#79ddeb" },
    selected: { backgroundColor: "rgba(71,201,217,0.16)", borderColor: "rgba(71,201,217,0.7)", color: "#e9fcff" },
  },
  eclipse: {
    main: { backgroundColor: "#0b0814", color: "#ece6ff" },
    ambient: {
      background:
        "radial-gradient(circle at 18% 10%, rgba(167,139,250,0.22), transparent 30%), radial-gradient(circle at 82% 18%, rgba(214,165,72,0.06), transparent 22%), linear-gradient(180deg, #10081f 0%, #030107 100%)",
    },
    grid: {
      backgroundImage:
        "linear-gradient(rgba(167,139,250,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(167,139,250,0.05) 1px, transparent 1px)",
    },
    header: { backgroundColor: "rgba(11,7,22,0.92)", borderColor: "#2a1d4a" },
    selector: { backgroundColor: "#1a1133", borderColor: "rgba(167,139,250,0.36)", color: "#c4b3ff" },
    selected: { backgroundColor: "rgba(167,139,250,0.16)", borderColor: "rgba(167,139,250,0.7)", color: "#f1ebff" },
  },
  plasma: {
    main: { backgroundColor: "#0d0610", color: "#ffd9ec" },
    ambient: {
      background:
        "radial-gradient(circle at 18% 10%, rgba(236,72,153,0.22), transparent 30%), radial-gradient(circle at 80% 22%, rgba(71,201,217,0.12), transparent 24%), linear-gradient(180deg, #160820 0%, #04020a 100%)",
    },
    grid: {
      backgroundImage:
        "linear-gradient(rgba(236,72,153,0.075) 1px, transparent 1px), linear-gradient(90deg, rgba(236,72,153,0.05) 1px, transparent 1px)",
    },
    header: { backgroundColor: "rgba(16,7,26,0.92)", borderColor: "#3b1334" },
    selector: { backgroundColor: "#26102a", borderColor: "rgba(236,72,153,0.36)", color: "#ff8fc4" },
    selected: { backgroundColor: "rgba(236,72,153,0.16)", borderColor: "rgba(236,72,153,0.7)", color: "#ffe0f0" },
  },
};

const modules = [
  {
    number: "01",
    title: "AI Playground",
    detail: "Image · video · motion",
    summary: "Tạo ảnh và video bằng các model AI mới nhất, có Motion Control và lịch sử render.",
    signal: "Render queue",
    action: "Open playground",
    icon: Sparkles,
    accent: "red",
    shortcut: "1",
    lastUsed: "ready",
  },
  {
    number: "02",
    title: "Photo Fix",
    detail: "Tách nền · làm nét · đổi nền",
    summary: "Tách nền, làm nét ảnh, restore ảnh cũ, đổi backdrop và sửa khuôn mặt cho ảnh có sẵn.",
    signal: "Photo desk",
    action: "Open photo fix",
    icon: ImageDown,
    accent: "amber",
    shortcut: "2",
    lastUsed: "ready",
  },
  {
    number: "03",
    title: "Smart Recap",
    detail: "YouTube · video · PDF · web",
    summary: "Paste link YouTube, upload video, PDF dài hay URL bài web — nhận tóm tắt 1 phút.",
    signal: "Recap engine",
    action: "Open recap",
    icon: FileSearch,
    accent: "lime",
    shortcut: "3",
    lastUsed: "ready",
  },
  {
    number: "04",
    title: "DocSense",
    detail: "OCR · dịch giữ định dạng",
    summary: "OCR ảnh / PDF rồi dịch chuyên nghiệp, giữ nguyên bố cục, bảng và hình ảnh.",
    signal: "Doc pipe",
    action: "Open docsense",
    icon: Languages,
    accent: "cyan",
    shortcut: "4",
    lastUsed: "ready",
  },
  {
    number: "05",
    title: "Story Writer",
    detail: "Plot · chương · nhân vật",
    summary: "Viết truyện dài có dàn ý, hệ thống nhân vật, chương và bộ nhớ dự án.",
    signal: "Narrative engine",
    action: "Open Story Writer",
    icon: PenLine,
    accent: "red",
    shortcut: "5",
    lastUsed: "ready",
  },
  {
    number: "06",
    title: "Language Tutor",
    detail: "Đối thoại · chấm · flashcard",
    summary: "Học ngoại ngữ qua đối thoại có sửa lỗi, chấm essay, flashcard và từ vựng theo chủ đề.",
    signal: "Tutor lane",
    action: "Coming soon",
    icon: BookOpenText,
    accent: "lime",
    shortcut: "6",
    lastUsed: "—",
  },
  {
    number: "07",
    title: "Mystic Deck",
    detail: "Tử vi · thần số · tarot",
    summary: "Tử vi 2026, thần số học, tarot và đặt tên (con, brand) theo ngũ hành.",
    signal: "Mystic deck",
    action: "Open Mystic Deck",
    icon: Moon,
    accent: "amber",
    shortcut: "7",
    lastUsed: "ready",
  },
  {
    number: "08",
    title: "Voice Lab",
    detail: "TTS · clone · transcribe",
    summary: "TTS đa giọng, voice cloning, dubbing và transcribe audio sang text/subtitle.",
    signal: "Voice queue",
    action: "Coming soon",
    icon: AudioLines,
    accent: "cyan",
    shortcut: "8",
    lastUsed: "—",
  },
  {
    number: "09",
    title: "Markets",
    detail: "Vàng · crypto · forex realtime",
    summary: "Giá realtime vàng (PAXG), bạc, top 10 crypto và 4 cặp ngoại tệ vs VND. Cập nhật mỗi 60s.",
    signal: "Market feed",
    action: "Open markets",
    icon: LineChart,
    accent: "lime",
    shortcut: "9",
    lastUsed: "ready",
  },
  {
    number: "10",
    title: "AI Store",
    detail: "ChatGPT · Codex · Dreamina key",
    summary: "Mua tài khoản AI premium giá tốt: ChatGPT Plus, Claude Pro, Codex API key, Dreamina, Midjourney, Suno và nhiều dịch vụ khác.",
    signal: "AI marketplace",
    action: "Open store",
    icon: ShoppingBag,
    accent: "amber",
    shortcut: "0",
    lastUsed: "ready",
  },
  {
    number: "11",
    title: "Tools",
    detail: "Đếm chữ · QR · ngày · mật khẩu",
    summary: "12 công cụ thực dụng: đếm chữ, slug, đổi case, markdown, so sánh, số → chữ, mật khẩu, QR code, màu, contrast, tính ngày, timestamp.",
    signal: "Hộp tiện ích",
    action: "Open tools",
    icon: Wrench,
    accent: "cyan",
    shortcut: "-",
    lastUsed: "ready",
  },
  {
    number: "12",
    title: "Calculators",
    detail: "Thuế TNCN · vay · BMI · đơn vị",
    summary: "Máy tính thuế TNCN 2026, EMI vay nhà/xe, BMI, tip, đổi đơn vị, đổi tiền dùng tỉ giá realtime từ Markets.",
    signal: "Calc engine",
    action: "Open calculators",
    icon: Calculator,
    accent: "red",
    shortcut: "=",
    lastUsed: "ready",
  },
];

type ModuleCard = (typeof modules)[number];

type RailItem = {
  label: string;
  icon: LucideIcon;
  href?: string;
  shortcut?: string;
};

const railItems: ReadonlyArray<RailItem> = [
  { label: "Home", icon: Lock, href: "/" },
  { label: "AI Playground", icon: Sparkles, href: "/ai-playground", shortcut: "1" },
  { label: "Photo Fix", icon: ImageDown, href: "/photo-fix", shortcut: "2" },
  { label: "Smart Recap", icon: FileSearch, href: "/smart-recap", shortcut: "3" },
  { label: "DocSense", icon: Languages, href: "/docsense", shortcut: "4" },
  { label: "Story Writer", icon: PenLine, href: "/story-writer", shortcut: "5" },
  { label: "Language Tutor", icon: BookOpenText, shortcut: "6" },
  { label: "Mystic Deck", icon: Moon, href: "/mystic-deck", shortcut: "7" },
  { label: "Voice Lab", icon: AudioLines, shortcut: "8" },
  { label: "Markets", icon: LineChart, href: "/markets", shortcut: "9" },
  { label: "AI Store", icon: ShoppingBag, href: "/ai-store", shortcut: "0" },
  { label: "Tools", icon: Wrench, href: "/tools", shortcut: "-" },
  { label: "Calculators", icon: Calculator, href: "/calculators", shortcut: "=" },
  { label: "Profile", icon: Bot, href: "/profile" },
];

const ticker = [
  "LLM ROUTER + ONLINE",
  "VOICE ENGINE + READY",
  "IMAGE PIPE + IDLE",
  "VIDEO RENDER + READY",
  "PDF CORE + ONLINE",
  "STORAGE + SYNCED",
  "TASK QUEUE + CLEAR",
  "MEMORY VAULT + ACTIVE",
];

type MarketTick = {
  id: string;
  symbol: string;
  name: string;
  kind: "crypto" | "metal" | "forex";
  usd: number;
  vnd: number;
  change24h: number | null;
};

function formatTickerPrice(row: MarketTick): string {
  if (row.kind === "forex") {
    const v = row.vnd;
    const formatted = v >= 1000 ? Math.round(v).toLocaleString("vi-VN") : v.toFixed(0);
    return `${row.symbol} + ${formatted} VND`;
  }
  const usd = row.usd;
  const priceStr = usd >= 1 ? `$${usd.toLocaleString("en-US", { maximumFractionDigits: 2 })}` : `$${usd.toFixed(4)}`;
  if (row.change24h === null) return `${row.symbol} + ${priceStr}`;
  const sign = row.change24h >= 0 ? "+" : "";
  return `${row.symbol} + ${priceStr} ${sign}${row.change24h.toFixed(2)}%`;
}

function shuffle<T>(arr: ReadonlyArray<T>): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const moduleGroups = [
  { label: "Create", modules: modules.slice(1, 4) },
  { label: "Tools", modules: [modules[0], ...modules.slice(4)] },
];

const systemPanelItems = [
  { label: "Current project", value: "Personal OS", tone: "text-[#f4eadc]" },
  { label: "LLM router", value: "Online", tone: "text-[#45a85d]" },
  { label: "Voice runtime", value: "Ready", tone: "text-[#d6a548]" },
  { label: "Video pipe", value: "Ready", tone: "text-[#47c9d9]" },
];

const recentOutputs = [
  { title: "Story outline", meta: "Story Writer / saved" },
  { title: "Voice draft", meta: "Voice Studio / queued" },
  { title: "Prompt map", meta: "Command / 2 min ago" },
];

const systemPanelCopy = {
  en: Object.fromEntries(systemPanelItems.map((item) => [item.label, item])),
  vi: {
    "Current project": { label: "Dự án hiện tại", value: "Personal OS" },
    "LLM router": { label: "Bộ định tuyến LLM", value: "Trực tuyến" },
    "Voice runtime": { label: "Runtime giọng nói", value: "Sẵn sàng" },
    "Video pipe": { label: "Pipeline video", value: "Sẵn sàng" },
  },
} satisfies Record<WebLanguage, Record<string, Partial<(typeof systemPanelItems)[number]>>>;

const recentOutputCopy = {
  en: Object.fromEntries(recentOutputs.map((output) => [output.title, output])),
  vi: {
    "Story outline": { title: "Dàn ý truyện", meta: "Story Writer / đã lưu" },
    "Voice draft": { title: "Bản nháp giọng", meta: "Voice Studio / trong hàng đợi" },
    "Prompt map": { title: "Bản đồ prompt", meta: "Command / 2 phút trước" },
  },
} satisfies Record<WebLanguage, Record<string, Partial<(typeof recentOutputs)[number]>>>;

const quickCommands = [
  { command: "/story", label: "Story", hint: "plot + chapter", module: "Story Writer" },
  { command: "/voice", label: "Voice", hint: "narration", module: "Voice Studio" },
  { command: "/image", label: "Image", hint: "visual prompt", module: "Vision Foundry" },
  { command: "/pdf", label: "PDF", hint: "document core", module: "Document Core" },
  { command: "/code", label: "Code", hint: "debug lane", module: "Code Lab" },
];

const homeCopy = {
  en: {
    futureDomain: "Future Domain",
    desktop: "2026 / Desktop",
    home: "Home",
    online: "Online",
    heroDescription: "A personal AI control surface: writing, voice, image, video, documents, coding, and tools woven into one command center.",
    commandPlaceholder: "Search modules, models, tools...",
    mobileCommandPlaceholder: "Search MrNine...",
    run: "Open",
    searchEmpty: "No matches. Try another keyword.",
    searchHint: "Use ↑↓ to browse, Enter to open",
    modules: "Modules",
    todo: "To-do",
    missionDeck: "Mission deck / 08",
    launchConsole: "Launch console",
    allOnline: "All online",
    create: "Create",
    tools: "Tools",
    ok: "OK",
    outputDock: "Output dock",
    build: "Build / 2026.05.17",
    systemPanel: "System panel",
    modulePreview: "Module preview",
    context: "Context",
    recentOutput: "Recent output",
    queueClear: "Queue clear",
    queueBody: "Ready for command input, module launch, or project routing.",
    runtimeRequired: "Runtime required",
    readyToOpen: "Ready to open",
    openMenu: "Open menu",
    skip: "Skip to content",
    mobileRun: "Run mobile command",
    bangkok: "Bangkok",
    bangkokAria: "Current time in Bangkok",
  },
  vi: {
    futureDomain: "Tên miền tương lai",
    desktop: "2026 / Giao diện",
    home: "Trang chủ",
    online: "Trực tuyến",
    heroDescription: "Một trung tâm điều khiển AI cá nhân: viết, giọng nói, hình ảnh, video, tài liệu, code và công cụ trong cùng một giao diện lệnh.",
    commandPlaceholder: "Tìm module, model, công cụ...",
    mobileCommandPlaceholder: "Tìm MrNine...",
    run: "Mở",
    searchEmpty: "Không có kết quả. Thử từ khoá khác.",
    searchHint: "Dùng ↑↓ để chọn, Enter để mở",
    modules: "Module",
    todo: "Việc cần làm",
    missionDeck: "Bảng nhiệm vụ / 08",
    launchConsole: "Bảng điều khiển",
    allOnline: "Tất cả sẵn sàng",
    create: "Sáng tạo",
    tools: "Công cụ",
    ok: "OK",
    outputDock: "Kết quả gần đây",
    build: "Bản dựng / 2026.05.17",
    systemPanel: "Bảng hệ thống",
    modulePreview: "Xem trước module",
    context: "Ngữ cảnh",
    recentOutput: "Kết quả gần đây",
    queueClear: "Hàng đợi trống",
    queueBody: "Sẵn sàng nhận lệnh, mở module hoặc điều phối dự án.",
    runtimeRequired: "Cần runtime",
    readyToOpen: "Sẵn sàng mở",
    openMenu: "Mở menu",
    skip: "Bỏ qua tới nội dung",
    mobileRun: "Chạy lệnh mobile",
    bangkok: "Bangkok",
    bangkokAria: "Giờ hiện tại tại Bangkok",
  },
} satisfies Record<WebLanguage, Record<string, string>>;

const moduleCopy = {
  en: Object.fromEntries(modules.map((module) => [module.title, module])),
  vi: {
    "AI Playground": {
      title: "AI Playground",
      detail: "Ảnh · video · motion",
      summary: "Tạo ảnh và video bằng các model AI mới nhất, có Motion Control và lịch sử render.",
      signal: "Hàng đợi render",
      action: "Mở playground",
    },
    "Photo Fix": {
      title: "Photo Fix",
      detail: "Tách nền · làm nét · đổi nền",
      summary: "Tách nền, làm nét ảnh, restore ảnh cũ, đổi backdrop và sửa khuôn mặt cho ảnh có sẵn.",
      signal: "Bàn ảnh",
      action: "Mở Photo Fix",
    },
    "Smart Recap": {
      title: "Smart Recap",
      detail: "YouTube · video · PDF · web",
      summary: "Paste link YouTube, upload video, PDF dài hay URL bài web — nhận tóm tắt 1 phút.",
      signal: "Bộ tóm tắt",
      action: "Mở Smart Recap",
    },
    "DocSense": {
      title: "DocSense",
      detail: "OCR · dịch giữ định dạng",
      summary: "OCR ảnh / PDF rồi dịch chuyên nghiệp, giữ nguyên bố cục, bảng và hình ảnh.",
      signal: "Tài liệu",
      action: "Mở DocSense",
    },
    "Story Writer": {
      title: "Story Writer",
      detail: "Plot · chương · nhân vật",
      summary: "Viết truyện dài có dàn ý, hệ thống nhân vật, chương và bộ nhớ dự án.",
      signal: "Máy viết truyện",
      action: "Mở Story Writer",
    },
    "Language Tutor": {
      title: "Language Tutor",
      detail: "Đối thoại · chấm · flashcard",
      summary: "Học ngoại ngữ qua đối thoại có sửa lỗi, chấm essay, flashcard và từ vựng theo chủ đề.",
      signal: "Trợ giảng",
      action: "Sắp ra mắt",
    },
    "Mystic Deck": {
      title: "Mystic Deck",
      detail: "Tử vi · thần số · tarot",
      summary: "Tử vi 2026, thần số học, tarot và đặt tên (con, brand) theo ngũ hành.",
      signal: "Bộ bài huyền học",
      action: "Mở Mystic Deck",
    },
    "Voice Lab": {
      title: "Voice Lab",
      detail: "TTS · clone · transcribe",
      summary: "TTS đa giọng, voice cloning, dubbing và transcribe audio sang text/subtitle.",
      signal: "Hàng đợi giọng",
      action: "Sắp ra mắt",
    },
    "Markets": {
      title: "Markets",
      detail: "Vàng · crypto · forex realtime",
      summary: "Giá realtime vàng (PAXG), bạc, top 10 crypto và 4 cặp ngoại tệ vs VND. Cập nhật mỗi 60s.",
      signal: "Bảng giá realtime",
      action: "Mở Markets",
    },
    "AI Store": {
      title: "AI Store",
      detail: "ChatGPT · Codex · Dreamina key",
      summary: "Mua tài khoản AI premium giá tốt: ChatGPT Plus, Claude Pro, Codex API key, Dreamina, Midjourney, Suno và nhiều dịch vụ khác.",
      signal: "Chợ AI premium",
      action: "Mở AI Store",
    },
    "Tools": {
      title: "Tools",
      detail: "Đếm chữ · QR · ngày · mật khẩu",
      summary: "12 công cụ thực dụng: đếm chữ, slug, đổi case, markdown, so sánh, số → chữ, mật khẩu, QR code, màu, contrast, tính ngày, timestamp.",
      signal: "Hộp tiện ích",
      action: "Mở Tools",
    },
    "Calculators": {
      title: "Calculators",
      detail: "Thuế TNCN · vay · BMI · đơn vị",
      summary: "Máy tính thuế TNCN 2026, EMI vay nhà/xe, BMI, tip, đổi đơn vị, đổi tiền theo tỉ giá realtime.",
      signal: "Máy tính",
      action: "Mở Calculators",
    },
  },
} satisfies Record<WebLanguage, Record<string, Partial<ModuleCard>>>;

const quickCommandCopy = {
  en: Object.fromEntries(quickCommands.map((command) => [command.command, command])),
  vi: {
    "/story": { label: "Truyện", hint: "cốt truyện + chương", module: "Story Writer" },
    "/voice": { label: "Giọng", hint: "thuyết minh", module: "Voice Studio" },
    "/image": { label: "Ảnh", hint: "prompt hình ảnh", module: "Vision Foundry" },
    "/pdf": { label: "PDF", hint: "tài liệu", module: "Document Core" },
    "/code": { label: "Code", hint: "debug", module: "Code Lab" },
  },
} satisfies Record<WebLanguage, Record<string, Partial<(typeof quickCommands)[number]>>>;

const authCopy = {
  en: {
    account: "Account",
    accountMenu: "Account menu",
    mongoSession: "MongoDB session",
    signOut: "Sign out",
    signIn: "Sign In",
    checking: "Checking",
    signInOptions: "Sign in options",
    accountAccess: "Account access",
    continueWith: "Continue with",
    oauthProvider: "OAuth provider",
    viewProfile: "View profile",
  },
  vi: {
    account: "Tài khoản",
    accountMenu: "Menu tài khoản",
    mongoSession: "Phiên MongoDB",
    signOut: "Đăng xuất",
    signIn: "Đăng nhập",
    checking: "Đang kiểm tra",
    signInOptions: "Tuỳ chọn đăng nhập",
    accountAccess: "Truy cập tài khoản",
    continueWith: "Tiếp tục với",
    oauthProvider: "Nhà cung cấp OAuth",
    viewProfile: "Xem hồ sơ",
  },
} satisfies Record<WebLanguage, Record<string, string>>;

const chatCopy = {
  en: {
    greeting: "I am MrNine AI. What do you want to write, generate, convert, debug, or ask?",
    aria: "MrNine AI chat",
    subtitle: "Ask anything / gpt-5.5",
    close: "Close chat",
    thinking: "Thinking",
    emptyResponse: "I did not receive response content yet.",
    failed: "Chat request failed.",
    placeholder: "Ask MrNine anything...",
    send: "Send message",
    button: "Ask anything",
  },
  vi: {
    greeting: "Tôi là MrNine AI. Bạn muốn viết, tạo ảnh, dựng video, xử lý tài liệu, debug hay hỏi nhanh điều gì?",
    aria: "Khung chat MrNine AI",
    subtitle: "Hỏi bất cứ gì / gpt-5.5",
    close: "Đóng chat",
    thinking: "Đang suy nghĩ",
    emptyResponse: "Tôi chưa nhận được nội dung phản hồi.",
    failed: "Yêu cầu chat thất bại.",
    placeholder: "Hỏi MrNine bất cứ gì...",
    send: "Gửi tin nhắn",
    button: "Hỏi bất cứ gì",
  },
} satisfies Record<WebLanguage, Record<string, string>>;

const themeCopy = {
  en: {
    auto: { label: "Auto", title: "Balanced control surface" },
    crimson: { label: "Crimson", title: "Red terminal interface" },
    signal: { label: "Signal", title: "Green operations interface" },
    gold: { label: "Gold", title: "Amber market interface" },
    frost: { label: "Frost", title: "Cold visual engine interface" },
    eclipse: { label: "Eclipse", title: "Deep violet mystic interface" },
    plasma: { label: "Plasma", title: "Neon magenta cyberpunk interface" },
  },
  vi: {
    auto: { label: "Auto", title: "Bề mặt điều khiển cân bằng" },
    crimson: { label: "Đỏ", title: "Giao diện terminal đỏ" },
    signal: { label: "Tín hiệu", title: "Giao diện vận hành xanh" },
    gold: { label: "Vàng", title: "Giao diện thị trường amber" },
    frost: { label: "Băng", title: "Giao diện visual engine lạnh" },
    eclipse: { label: "Nguyệt thực", title: "Giao diện huyền học tím sâu" },
    plasma: { label: "Plasma", title: "Giao diện cyberpunk neon hồng" },
  },
} satisfies Record<WebLanguage, Record<InterfaceTheme, { label: string; title: string }>>;

const dailyHeadlines = [
  "ask AI, build everything",
  "prompt once, create faster",
  "write, speak, render, ship",
  "turn ideas into workflows",
  "one prompt, many engines",
  "create stories, voices, worlds",
  "summon text, image, video",
  "command your AI workspace",
  "draft, convert, generate",
  "think less, create more",
  "from document to deployment",
  "your daily AI control room",
  "write chapters in minutes",
  "turn scripts into scenes",
  "convert PDFs into answers",
  "generate voices on demand",
  "design images from prompts",
  "plan, code, launch faster",
  "translate files with context",
  "build slides from notes",
  "compose emails that convert",
  "sync every AI tool here",
  "track gold, btc, forex live",
  "buy chatgpt plus, codex key, dreamina",
  "calc tax, loan, currency in seconds",
  "format json, slug VN, build QR",
  "read VND amount in words",
  "your AI control room, 12 modules",
];

const dailyHeadlinesVi = [
  "hỏi AI, xây mọi thứ",
  "một prompt, tạo nhanh hơn",
  "viết, nói, dựng, triển khai",
  "biến ý tưởng thành quy trình",
  "một lệnh, nhiều engine",
  "tạo truyện, giọng nói, thế giới",
  "gọi văn bản, ảnh, video",
  "điều khiển không gian AI",
  "nháp, chuyển đổi, tạo nội dung",
  "nghĩ ít hơn, tạo nhiều hơn",
  "từ tài liệu tới triển khai",
  "phòng điều khiển AI mỗi ngày",
  "viết chương trong vài phút",
  "biến kịch bản thành cảnh phim",
  "chuyển PDF thành câu trả lời",
  "tạo giọng nói theo yêu cầu",
  "thiết kế ảnh từ prompt",
  "lên kế hoạch, code, ra mắt",
  "dịch file có ngữ cảnh",
  "tạo slide từ ghi chú",
  "viết email chuyển đổi tốt hơn",
  "gom mọi công cụ AI tại đây",
  "xem giá vàng, bitcoin, forex realtime",
  "mua chatgpt plus, codex key, dreamina",
  "tính thuế tncn, vay, đổi tiền 1 giây",
  "format json, slug bỏ dấu, sinh QR",
  "đọc số tiền VND ra chữ tức thì",
  "phòng điều khiển AI, 12 module",
];

const dailyHeadlinesByLanguage = {
  en: dailyHeadlines,
  vi: dailyHeadlinesVi,
} satisfies Record<WebLanguage, string[]>;

type RecentVisit = { title: string; href: string; ts: number };
const RECENT_VISITS_KEY = "mrnine-recent-visits";

function loadRecentVisits(): RecentVisit[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_VISITS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((v) => v && typeof v.title === "string" && typeof v.href === "string" && typeof v.ts === "number")
      .slice(0, 6);
  } catch {
    return [];
  }
}

function pushRecentVisit(visit: { title: string; href: string }) {
  if (typeof window === "undefined") return;
  try {
    const existing = loadRecentVisits().filter((v) => v.title !== visit.title);
    const next: RecentVisit[] = [{ title: visit.title, href: visit.href, ts: Date.now() }, ...existing].slice(0, 6);
    window.localStorage.setItem(RECENT_VISITS_KEY, JSON.stringify(next));
  } catch {
    // ignore quota errors
  }
}

function formatRelative(ts: number, lang: WebLanguage): string {
  const diff = Math.max(0, Date.now() - ts) / 1000;
  if (diff < 60) return lang === "vi" ? "vừa xong" : "just now";
  if (diff < 3600) {
    const mins = Math.floor(diff / 60);
    return lang === "vi" ? `${mins} phút trước` : `${mins} min ago`;
  }
  if (diff < 86400) {
    const hrs = Math.floor(diff / 3600);
    return lang === "vi" ? `${hrs} giờ trước` : `${hrs}h ago`;
  }
  const days = Math.floor(diff / 86400);
  return lang === "vi" ? `${days} ngày trước` : `${days}d ago`;
}

const socialLinks = [
  { label: "Facebook", icon: <FacebookIcon />, href: "https://www.facebook.com/nguyenhuunam.fb/" },
  { label: "GitHub", icon: <GithubIcon />, href: "https://github.com/nguy3nhuunam" },
  { label: "Email", icon: <MailIcon />, href: "mailto:mrnine.net@gmail.com" },
  { label: "Telegram", icon: <TelegramIcon />, href: "https://t.me/mrninenet" },
];

const accentMap = {
  red: {
    text: "text-[#ef4444]",
    border: "border-[#ef4444]/28",
    bg: "bg-[#ef4444]/10",
    dot: "bg-[#ef4444]",
  },
  lime: {
    text: "text-[#45a85d]",
    border: "border-[#45a85d]/28",
    bg: "bg-[#45a85d]/10",
    dot: "bg-[#45a85d]",
  },
  amber: {
    text: "text-[#d6a548]",
    border: "border-[#d6a548]/30",
    bg: "bg-[#d6a548]/10",
    dot: "bg-[#d6a548]",
  },
  cyan: {
    text: "text-[#47c9d9]",
    border: "border-[#47c9d9]/28",
    bg: "bg-[#47c9d9]/10",
    dot: "bg-[#47c9d9]",
  },
};

type SearchCategory = "module" | "image-model" | "video-model" | "motion-model" | "feature";

type SearchAccent = "red" | "lime" | "amber" | "cyan";

type SearchResult = {
  id: string;
  title: string;
  subtitle: string;
  badge?: string;
  vendor?: string;
  category: SearchCategory;
  icon: LucideIcon;
  accent: SearchAccent;
  href: string;
};

const searchCategoryCopy = {
  en: {
    module: "Modules",
    "image-model": "Image models",
    "video-model": "Video models",
    "motion-model": "Motion control",
    feature: "Tools",
  },
  vi: {
    module: "Module",
    "image-model": "Model ảnh",
    "video-model": "Model video",
    "motion-model": "Motion control",
    feature: "Công cụ",
  },
} satisfies Record<WebLanguage, Record<SearchCategory, string>>;

const moduleNavMap: Record<string, string> = {
  "AI Playground": "/ai-playground",
  "Photo Fix": "/photo-fix",
  "Smart Recap": "/smart-recap",
  "DocSense": "/docsense",
  "Story Writer": "/story-writer",
  "Mystic Deck": "/mystic-deck",
  "Markets": "/markets",
  "AI Store": "/ai-store",
  "Tools": "/tools",
  "Calculators": "/calculators",
};

const extraFeatureEntries: ReadonlyArray<{
  id: string;
  title: string;
  subtitleVi: string;
  subtitleEn: string;
  href: string;
  icon: LucideIcon;
  accent: SearchAccent;
}> = [
  {
    id: "voice-studio",
    title: "Voice Studio",
    subtitleVi: "TTS · thuyết minh · clone giọng",
    subtitleEn: "TTS · narration · voice clone",
    href: "/voice-studio",
    icon: AudioLines,
    accent: "cyan",
  },
  {
    id: "video-studio",
    title: "Video Studio",
    subtitleVi: "Edit video · timeline · motion",
    subtitleEn: "Video edit · timeline · motion",
    href: "/video-studio",
    icon: Clapperboard,
    accent: "amber",
  },
];

function falCapabilityToCategory(capability: FalCapability): SearchCategory {
  if (capability === "text-to-image" || capability === "image-to-image") return "image-model";
  if (capability === "text-to-video" || capability === "image-to-video") return "video-model";
  return "motion-model";
}

function falCapabilityAccent(capability: FalCapability): SearchAccent {
  if (capability === "text-to-image") return "red";
  if (capability === "image-to-image") return "amber";
  if (capability === "text-to-video") return "cyan";
  if (capability === "image-to-video") return "lime";
  return "amber";
}

function falCapabilityIcon(capability: FalCapability): LucideIcon {
  if (capability === "text-to-image" || capability === "image-to-image") return ImageLucide;
  return Clapperboard;
}

function moduleAnimationClass(title: string): string {
  switch (title) {
    case "AI Playground":
      return "module-anim-playground";
    case "Photo Fix":
      return "module-anim-photo";
    case "Smart Recap":
      return "module-anim-recap";
    case "DocSense":
      return "module-anim-doc";
    case "Story Writer":
      return "module-anim-story";
    case "Language Tutor":
      return "module-anim-tutor";
    case "Mystic Deck":
      return "module-anim-mystic";
    case "Voice Lab":
      return "module-anim-voice";
    case "Markets":
      return "module-anim-markets";
    case "AI Store":
      return "module-anim-store";
    case "Tools":
      return "module-anim-tools";
    case "Calculators":
      return "module-anim-calc";
    default:
      return "";
  }
}

function buildSearchResults(language: WebLanguage): ReadonlyArray<SearchResult> {
  const results: SearchResult[] = [];

  for (const item of modules) {
    const href = moduleNavMap[item.title];
    if (!href) continue;
    const localized = moduleCopy[language][item.title as keyof typeof moduleCopy.vi] ?? item;
    results.push({
      id: `module-${item.title}`,
      title: localized.title ?? item.title,
      subtitle: localized.detail ?? item.detail,
      badge: item.shortcut ? `⇧${item.shortcut}` : undefined,
      category: "module",
      icon: item.icon,
      accent: item.accent as SearchAccent,
      href,
    });
  }

  for (const feature of extraFeatureEntries) {
    results.push({
      id: `feature-${feature.id}`,
      title: feature.title,
      subtitle: language === "vi" ? feature.subtitleVi : feature.subtitleEn,
      category: "feature",
      icon: feature.icon,
      accent: feature.accent,
      href: feature.href,
    });
  }

  for (const fal of falAllModels) {
    results.push({
      id: `fal-${fal.id}`,
      title: fal.label,
      subtitle: fal.tagline,
      vendor: fal.vendor,
      badge: fal.badge,
      category: falCapabilityToCategory(fal.capability),
      icon: falCapabilityIcon(fal.capability),
      accent: falCapabilityAccent(fal.capability),
      href: `/ai-playground?capability=${encodeURIComponent(fal.capability)}&model=${encodeURIComponent(fal.id)}`,
    });
  }

  return results;
}

function scoreSearchResult(query: string, result: SearchResult): number {
  if (!query) return 0;
  const q = query.toLowerCase();
  const title = result.title.toLowerCase();
  const subtitle = result.subtitle.toLowerCase();
  const vendor = result.vendor?.toLowerCase() ?? "";
  const id = result.id.toLowerCase();
  const badge = result.badge?.toLowerCase() ?? "";

  if (title === q) return 1000;
  if (title.startsWith(q)) return 700;
  if (title.split(/\s+/).some((word) => word.startsWith(q))) return 500;
  if (title.includes(q)) return 400;
  if (vendor.includes(q)) return 320;
  if (id.includes(q)) return 260;
  if (subtitle.includes(q)) return 220;
  if (badge.includes(q)) return 180;
  return 0;
}

function filterAndRankResults(
  query: string,
  all: ReadonlyArray<SearchResult>,
  limit = 28,
): ReadonlyArray<SearchResult> {
  const trimmed = query.trim();
  if (!trimmed) {
    const featured = all.filter((r) => r.category === "module" || r.category === "feature");
    const tail = all
      .filter((r) => r.category !== "module" && r.category !== "feature")
      .slice(0, Math.max(0, limit - featured.length));
    return [...featured, ...tail].slice(0, limit);
  }
  const stripped = trimmed.startsWith("/") ? trimmed.slice(1).trim() : trimmed;
  if (!stripped) {
    return filterAndRankResults("", all, limit);
  }
  return all
    .map((result) => ({ result, score: scoreSearchResult(stripped, result) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ result }) => result);
}

function SocialIconButton({ label, icon, href }: Readonly<{ label: string; icon: ReactNode; href: string }>) {
  const isExternal = /^https?:\/\//i.test(href);
  return (
    <a
      href={href}
      aria-label={label}
      title={label}
      target={isExternal ? "_blank" : undefined}
      rel={isExternal ? "noreferrer noopener" : undefined}
      className="flex size-8 items-center justify-center rounded-full text-[#8d8780] transition hover:bg-white/[0.04] hover:text-[#efe6dc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ef4444]/70"
    >
      {icon}
    </a>
  );
}

function BrandIcon({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden="true">
      {children}
    </svg>
  );
}

function GithubIcon() {
  return (
    <BrandIcon>
      <path d="M12 .8a11.2 11.2 0 0 0-3.54 21.83c.56.1.77-.24.77-.54v-2.1c-3.13.68-3.79-1.33-3.79-1.33-.51-1.3-1.25-1.65-1.25-1.65-1.02-.7.08-.68.08-.68 1.13.08 1.72 1.16 1.72 1.16 1 .1 2.63.72 3.27.55.1-.73.4-1.23.72-1.51-2.5-.28-5.12-1.25-5.12-5.55 0-1.23.44-2.23 1.15-3.02-.12-.28-.5-1.43.1-2.98 0 0 .95-.3 3.1 1.15a10.7 10.7 0 0 1 5.64 0c2.15-1.45 3.09-1.15 3.09-1.15.61 1.55.23 2.7.11 2.98.72.79 1.15 1.79 1.15 3.02 0 4.31-2.63 5.26-5.13 5.54.41.36.77 1.05.77 2.12v3.14c0 .3.2.65.78.54A11.2 11.2 0 0 0 12 .8Z" />
    </BrandIcon>
  );
}

function DiscordIcon() {
  return (
    <BrandIcon>
      <path d="M19.54 5.33A18.5 18.5 0 0 0 14.98 3.9l-.22.45c1.61.48 2.36 1.17 2.36 1.17a14.9 14.9 0 0 0-10.22 0s.75-.69 2.36-1.17l-.22-.45a18.5 18.5 0 0 0-4.56 1.43C1.58 9.73.72 14.02 1.12 18.25a18.7 18.7 0 0 0 5.6 2.84l.68-.93a7.2 7.2 0 0 1-1.08-.52l.26-.2c2.08.98 4.33 1.31 6.42 1.31s4.34-.33 6.42-1.31l.26.2c-.34.2-.7.38-1.08.52l.68.93a18.7 18.7 0 0 0 5.6-2.84c.47-4.9-.8-9.15-3.34-12.92ZM8.6 15.65c-1.09 0-1.98-1-1.98-2.22 0-1.23.87-2.23 1.98-2.23s2 1 1.98 2.23c0 1.22-.88 2.22-1.98 2.22Zm6.8 0c-1.09 0-1.98-1-1.98-2.22 0-1.23.87-2.23 1.98-2.23s2 1 1.98 2.23c0 1.22-.88 2.22-1.98 2.22Z" />
    </BrandIcon>
  );
}

function FacebookIcon() {
  return (
    <BrandIcon>
      <path d="M22.7 12A10.7 10.7 0 1 0 10.33 22.57v-7.48H7.62V12h2.71V9.65c0-2.68 1.6-4.16 4.04-4.16 1.17 0 2.39.21 2.39.21v2.63h-1.35c-1.33 0-1.74.82-1.74 1.67v2h2.96l-.47 3.09h-2.49v7.48A10.7 10.7 0 0 0 22.7 12Z" />
    </BrandIcon>
  );
}

function InstagramIcon() {
  return (
    <BrandIcon>
      <path d="M7.6 2.4h8.8a5.2 5.2 0 0 1 5.2 5.2v8.8a5.2 5.2 0 0 1-5.2 5.2H7.6a5.2 5.2 0 0 1-5.2-5.2V7.6a5.2 5.2 0 0 1 5.2-5.2Zm0 1.9a3.3 3.3 0 0 0-3.3 3.3v8.8a3.3 3.3 0 0 0 3.3 3.3h8.8a3.3 3.3 0 0 0 3.3-3.3V7.6a3.3 3.3 0 0 0-3.3-3.3H7.6Zm4.4 3.2a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9Zm0 1.9a2.6 2.6 0 1 0 0 5.2 2.6 2.6 0 0 0 0-5.2Zm5.05-.96a1.08 1.08 0 1 1 0-2.16 1.08 1.08 0 0 1 0 2.16Z" />
    </BrandIcon>
  );
}

function MailIcon() {
  return (
    <BrandIcon>
      <path d="M3 5.4h18c.66 0 1.2.54 1.2 1.2v10.8c0 .66-.54 1.2-1.2 1.2H3a1.2 1.2 0 0 1-1.2-1.2V6.6c0-.66.54-1.2 1.2-1.2Zm.6 1.92v.02L12 13.5l8.4-6.16v-.02H3.6Zm16.8 1.74L12.5 14.94c-.3.22-.7.22-1 0L3.6 9.06v8.4h16.8v-8.4Z" />
    </BrandIcon>
  );
}

function TelegramIcon() {
  return (
    <BrandIcon>
      <path d="M21.4 4.32c.3-.13.62.16.55.49l-3.06 14.6c-.07.34-.45.52-.76.36l-4.4-2.32-2.34 2.31a.5.5 0 0 1-.84-.34l-.05-3.6 8.34-7.62c.18-.16-.04-.42-.24-.3l-10.31 6.5-3.6-1.18c-.32-.1-.34-.55-.04-.69L21.4 4.32Z" />
    </BrandIcon>
  );
}

function getRandomHeadline(language: WebLanguage, previous: string | undefined, overrides?: { vi?: string[]; en?: string[] }) {
  const fromOverride = overrides && overrides[language]?.length ? overrides[language] : null;
  const source = fromOverride && fromOverride.length > 0 ? fromOverride : dailyHeadlinesByLanguage[language];

  if (source.length === 1) {
    return source[0];
  }

  let next = source[Math.floor(Math.random() * source.length)];

  while (next === previous) {
    next = source[Math.floor(Math.random() * source.length)];
  }

  return next;
}

function DailyTypeHeadline({ language, overrides }: Readonly<{ language: WebLanguage; overrides?: { vi?: string[]; en?: string[] } }>) {
  const initial = (overrides && overrides[language]?.length ? overrides[language]![0] : null) ?? dailyHeadlinesByLanguage[language][0];
  const [headline, setHeadline] = useState(initial);
  const [typedCount, setTypedCount] = useState(0);
  const characters = useMemo(() => Array.from(headline), [headline]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setHeadline((previous) => getRandomHeadline(language, previous, overrides));
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [language, overrides]);

  useEffect(() => {
    if (typedCount > characters.length) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setTypedCount((current) => {
        if (current >= characters.length) {
          setHeadline((previous) => getRandomHeadline(language, previous, overrides));
          return 0;
        }

        return current + 1;
      });
    }, typedCount >= characters.length ? 900 : 333);

    return () => window.clearTimeout(timeout);
  }, [characters.length, language, typedCount]);

  return (
    <h1
      aria-label={headline}
      className="max-w-[88rem] font-display text-[clamp(3.2rem,6.4vw,6.4rem)] font-black leading-[0.84] tracking-[-0.08em]"
    >
      <span className="sr-only">{headline}</span>
      <span aria-hidden="true" className="inline-flex flex-wrap items-baseline">
        {characters.map((character, index) => (
          <span key={`${character}-${index}`} className="inline-flex items-baseline">
            {index === typedCount ? <span className="mx-[0.025em] inline-block h-[0.9em] w-[0.085em] translate-y-[0.1em] bg-[#ef4444] animate-[cursorSignal_3.6s_steps(1,end)_infinite]" /> : null}
            <span
              className={cn(
                "transition-[color,text-shadow,opacity] duration-200",
                index < typedCount
                  ? "text-[#f4eadc] opacity-100 [text-shadow:_0_0_18px_rgba(244,234,220,0.12)]"
                  : "text-[#f4eadc]/40 opacity-90",
              )}
            >
              {character === " " ? "\u00A0" : character}
            </span>
          </span>
        ))}
        {typedCount >= characters.length ? <span className="mx-[0.025em] inline-block h-[0.9em] w-[0.085em] translate-y-[0.1em] bg-[#ef4444] animate-[cursorSignal_3.6s_steps(1,end)_infinite]" /> : null}
      </span>
    </h1>
  );
}

function getBangkokHour(): number {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    hour12: false,
    timeZone: "Asia/Bangkok",
  });
  return Number(formatter.format(now)) || 0;
}

type DayPhase = "dawn" | "day" | "dusk" | "night";

function getDayPhase(hour: number): DayPhase {
  if (hour >= 5 && hour < 9) return "dawn";
  if (hour >= 9 && hour < 17) return "day";
  if (hour >= 17 && hour < 20) return "dusk";
  return "night";
}

function getAutoTheme(phase: DayPhase): InterfaceTheme {
  if (phase === "dawn") return "gold";
  if (phase === "day") return "frost";
  if (phase === "dusk") return "crimson";
  return "eclipse";
}

function BangkokClock({ copy }: Readonly<{ copy: (typeof homeCopy)[WebLanguage] }>) {
  const [time, setTime] = useState("");
  const [phase, setPhase] = useState<DayPhase>("day");

  useEffect(() => {
    const formatter = new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      timeZone: "Asia/Bangkok",
    });

    function updateTime() {
      setTime(formatter.format(new Date()));
      setPhase(getDayPhase(getBangkokHour()));
    }

    updateTime();
    const interval = window.setInterval(updateTime, 1000);

    return () => window.clearInterval(interval);
  }, []);

  const phaseStyle: Record<DayPhase, { bg: string; ring: string; text: string; sub: string; icon: LucideIcon; iconClass: string }> = {
    dawn: { bg: "bg-[#1f1408]", ring: "border-[#f0a060]/30", text: "text-[#f0c86d]", sub: "text-[#a07b48]", icon: Sunrise, iconClass: "text-[#ffb87a]" },
    day: { bg: "bg-[#06181c]", ring: "border-[#47c9d9]/26", text: "text-[#a8e8f0]", sub: "text-[#5a8a92]", icon: Sun, iconClass: "text-[#ffd966]" },
    dusk: { bg: "bg-[#1f0a08]", ring: "border-[#ef4444]/30", text: "text-[#ffb8a8]", sub: "text-[#a06e5a]", icon: Sunset, iconClass: "text-[#ff7e5f]" },
    night: { bg: "bg-[#0f0a1f]", ring: "border-[#a78bfa]/30", text: "text-[#c4b3ff]", sub: "text-[#7a6f9c]", icon: Moon, iconClass: "text-[#c4b3ff]" },
  };
  const style = phaseStyle[phase];
  const Icon = style.icon;

  return (
    <time
      dateTime={time}
      aria-label={`${copy.bangkokAria}: ${time || "loading"}`}
      className={cn(
        "hidden min-w-[9.25rem] items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-[0.78rem] font-bold tabular-nums xl:flex",
        style.bg,
        style.ring,
        style.text,
      )}
      suppressHydrationWarning
    >
      <Icon className={cn("size-3.5 shrink-0", style.iconClass)} />
      {time || "--:--:--"} <span className={cn("ml-1 text-[0.55rem]", style.sub)}>{copy.bangkok}</span>
    </time>
  );
}

function HeroParticleNetwork() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const currentCanvas = canvas;
    const context = currentCanvas.getContext("2d");

    if (!context) {
      return;
    }

    const currentContext = context;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const colors = [
      { core: "rgba(239, 68, 68, 0.92)", glow: "rgba(239, 68, 68, 0.14)" },
      { core: "rgba(69, 168, 93, 0.92)", glow: "rgba(69, 168, 93, 0.14)" },
      { core: "rgba(214, 165, 72, 0.9)", glow: "rgba(214, 165, 72, 0.12)" },
    ];
    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      phase: number;
      color: (typeof colors)[number];
    }> = [];
    let width = 0;
    let height = 0;
    let animationFrame = 0;
    let lastTime = performance.now();

    function resize() {
      const rect = currentCanvas.getBoundingClientRect();
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      currentCanvas.width = Math.max(1, Math.floor(width * pixelRatio));
      currentCanvas.height = Math.max(1, Math.floor(height * pixelRatio));
      currentContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      particles.length = 0;

      const count = Math.max(14, Math.min(34, Math.floor(width / 58)));

      for (let index = 0; index < count; index += 1) {
        const speed = 9 + Math.random() * 16;
        const angle = Math.random() * Math.PI * 2;
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          radius: 1.6 + Math.random() * 1.6,
          phase: Math.random() * Math.PI * 2,
          color: colors[index % colors.length],
        });
      }
    }

    function draw(time: number) {
      const delta = Math.min((time - lastTime) / 1000, 0.04);
      lastTime = time;
      currentContext.clearRect(0, 0, width, height);

      for (const particle of particles) {
        if (!reduceMotion) {
          particle.x += particle.vx * delta;
          particle.y += particle.vy * delta;

          if (particle.x < -10) particle.x = width + 10;
          if (particle.x > width + 10) particle.x = -10;
          if (particle.y < -10) particle.y = height + 10;
          if (particle.y > height + 10) particle.y = -10;
        }
      }

      const connectionDistance = Math.min(120, Math.max(78, width * 0.065));
      const mouseDistance = connectionDistance * 1.6;

      for (let firstIndex = 0; firstIndex < particles.length; firstIndex += 1) {
        for (let secondIndex = firstIndex + 1; secondIndex < particles.length; secondIndex += 1) {
          const first = particles[firstIndex];
          const second = particles[secondIndex];
          const distance = Math.hypot(first.x - second.x, first.y - second.y);

          if (distance < connectionDistance) {
            const opacity = (1 - distance / connectionDistance) * 0.16;
            currentContext.beginPath();
            currentContext.moveTo(first.x, first.y);
            currentContext.lineTo(second.x, second.y);
            currentContext.strokeStyle = `rgba(164, 210, 151, ${opacity})`;
            currentContext.lineWidth = 0.45;
            currentContext.stroke();
          }
        }
      }

      // Mouse-attracted connections — draw brighter lines from any
      // particle within mouseDistance of the cursor, plus a faint
      // halo at the cursor itself.
      const mouse = mouseRef.current;
      if (mouse) {
        for (const particle of particles) {
          const distance = Math.hypot(particle.x - mouse.x, particle.y - mouse.y);
          if (distance < mouseDistance) {
            const opacity = Math.pow(1 - distance / mouseDistance, 1.4) * 0.95;
            currentContext.beginPath();
            currentContext.moveTo(particle.x, particle.y);
            currentContext.lineTo(mouse.x, mouse.y);
            currentContext.strokeStyle = `rgba(244, 234, 220, ${opacity})`;
            currentContext.lineWidth = 1.1;
            currentContext.stroke();
          }
        }
        currentContext.beginPath();
        currentContext.arc(mouse.x, mouse.y, 18, 0, Math.PI * 2);
        currentContext.fillStyle = "rgba(244, 234, 220, 0.1)";
        currentContext.fill();
        currentContext.beginPath();
        currentContext.arc(mouse.x, mouse.y, 3.2, 0, Math.PI * 2);
        currentContext.fillStyle = "rgba(244, 234, 220, 0.85)";
        currentContext.fill();
      }

      for (const particle of particles) {
        const pulse = 0.72 + Math.sin(time * 0.002 + particle.phase) * 0.28;
        currentContext.beginPath();
        currentContext.arc(particle.x, particle.y, particle.radius * 4.6, 0, Math.PI * 2);
        currentContext.fillStyle = particle.color.glow;
        currentContext.fill();
        currentContext.beginPath();
        currentContext.arc(particle.x, particle.y, particle.radius * pulse, 0, Math.PI * 2);
        currentContext.fillStyle = particle.color.core;
        currentContext.fill();
      }

      animationFrame = window.requestAnimationFrame(draw);
    }

    resize();
    window.addEventListener("resize", resize);
    animationFrame = window.requestAnimationFrame(draw);

    function handleMouseMove(event: globalThis.MouseEvent) {
      const rect = currentCanvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      if (x < 0 || y < 0 || x > rect.width || y > rect.height) {
        mouseRef.current = null;
        return;
      }
      mouseRef.current = { x, y };
    }
    function clearMouse() {
      mouseRef.current = null;
    }
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("mouseout", clearMouse);
    document.addEventListener("mouseleave", clearMouse);

    function handleVisibility() {
      if (document.hidden) {
        if (animationFrame) window.cancelAnimationFrame(animationFrame);
        animationFrame = 0;
      } else if (!animationFrame) {
        lastTime = performance.now();
        animationFrame = window.requestAnimationFrame(draw);
      }
    }
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseout", clearMouse);
      document.removeEventListener("mouseleave", clearMouse);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.cancelAnimationFrame(animationFrame);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 h-full w-full opacity-45 mix-blend-screen"
    />
  );
}

function InterfaceThemeSelector({
  theme,
  visuals,
  language,
  onThemeChange,
}: Readonly<{
  theme: (typeof interfaceThemes)[number];
  visuals: (typeof themeVisuals)[InterfaceTheme];
  language: WebLanguage;
  onThemeChange: (theme: InterfaceTheme) => void;
}>) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative hidden lg:block">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "flex items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-[0.6rem] uppercase tracking-[0.18em] transition hover:border-white/45 hover:text-[#f4eadc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ef4444]/70",
        )}
        style={visuals.selector}
      >
        <span className={cn("size-2 rounded-full shadow-[0_0_10px_currentColor]", theme.swatch)} />
        {themeCopy[language][theme.value].label}
        <ChevronDown className={cn("size-3 transition", open && "rotate-180")} aria-hidden="true" />
      </button>

      {open ? (
        <div
          role="menu"
          aria-label={language === "vi" ? "Chọn giao diện" : "Select interface theme"}
          className="absolute right-0 top-10 z-50 w-56 rounded-xl border border-white/10 bg-[#0b0a08]/96 p-2 shadow-[0_18px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl"
        >
          {interfaceThemes.map((option) => (
            <button
              key={option.value}
              type="button"
              role="menuitemradio"
              aria-checked={theme.value === option.value}
              onClick={() => {
                onThemeChange(option.value);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg border border-transparent px-3 py-2 text-left transition hover:border-white/12 hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ef4444]/70",
              )}
              style={theme.value === option.value ? themeVisuals[option.value].selected : undefined}
            >
              <span className={cn("size-2.5 rounded-full", option.swatch)} />
              <span className="min-w-0 flex-1">
                <span className="block font-mono text-[0.66rem] uppercase tracking-[0.18em] text-[#f4eadc]">
                  {themeCopy[language][option.value].label}
                </span>
                <span className="block truncate text-[0.68rem] text-[#8d8780]">{themeCopy[language][option.value].title}</span>
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function AuthControl({ language }: Readonly<{ language: WebLanguage }>) {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const copy = authCopy[language];
  const userName = session?.user?.name || session?.user?.email || copy.account;
  const initials = userName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "MR";

  if (status === "authenticated") {
    return (
      <div className="relative">
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
          className="flex h-9 items-center gap-2 rounded-full border border-[#45a85d]/32 bg-[#071109]/88 px-2.5 pr-3 font-mono text-[0.58rem] uppercase tracking-[0.16em] text-[#dff8e4] transition hover:border-[#45a85d]/62 hover:bg-[#0a1a0d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#45a85d]/80"
        >
          <span className="flex size-6 items-center justify-center rounded-full border border-[#45a85d]/35 bg-[#18c964]/14 text-[0.56rem] font-bold text-[#18c964]">
            {initials}
          </span>
          <span className="hidden max-w-28 truncate lg:block">{userName}</span>
        </button>

        {open ? (
          <div
            role="menu"
            aria-label={copy.accountMenu}
            className="absolute right-0 top-11 z-50 w-64 rounded-xl border border-white/10 bg-[#0b0a08]/96 p-2 shadow-[0_18px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl"
          >
            <div className="border-b border-white/8 px-3 py-2">
              <div className="truncate text-sm font-bold text-[#f4eadc]">{userName}</div>
              <div className="mt-1 truncate font-mono text-[0.55rem] uppercase tracking-[0.16em] text-[#7f8c7d]">
                {copy.mongoSession}
              </div>
            </div>
            <a
              role="menuitem"
              href="/profile"
              className="mt-2 flex w-full items-center justify-between rounded-lg border border-transparent px-3 py-2 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-[#dff8e4] transition hover:border-[#45a85d]/24 hover:bg-[#45a85d]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#45a85d]/70"
            >
              {copy.viewProfile}
              <ArrowRight className="size-3.5" />
            </a>
            <button
              type="button"
              role="menuitem"
              onClick={() => void signOut()}
              className="mt-1 flex w-full items-center justify-between rounded-lg border border-transparent px-3 py-2 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-[#ffb4ad] transition hover:border-[#ef4444]/24 hover:bg-[#ef4444]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ef4444]/70"
            >
              {copy.signOut}
              <ArrowRight className="size-3.5" />
            </button>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="h-9 rounded-full border border-[#ef4444]/40 bg-transparent px-5 font-mono text-[0.62rem] font-bold uppercase tracking-[0.24em] text-[#f4eadc] transition hover:border-[#ef4444]/70 hover:bg-[#ef4444]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ef4444]/70 disabled:opacity-55"
        disabled={status === "loading"}
      >
        {status === "loading" ? copy.checking : copy.signIn}
      </button>

      {open ? (
        <div
          role="menu"
          aria-label={copy.signInOptions}
          className="absolute right-0 top-11 z-50 w-64 rounded-xl border border-white/10 bg-[#0b0a08]/96 p-2 shadow-[0_18px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl"
        >
          <div className="px-3 py-2">
            <div className="font-mono text-[0.55rem] uppercase tracking-[0.2em] text-[#756d64]">{copy.accountAccess}</div>
            <div className="mt-1 text-sm font-bold text-[#f4eadc]">{copy.continueWith}</div>
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={() => void signIn("google")}
            className="flex w-full items-center gap-3 rounded-lg border border-transparent px-3 py-2 text-left transition hover:border-[#ef4444]/22 hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ef4444]/70"
          >
            <span className="flex size-7 items-center justify-center rounded-md border border-[#ef4444]/24 bg-[#ef4444]/10 font-mono text-[0.58rem] font-bold text-[#ef4444]">
              G
            </span>
            <span>
              <span className="block text-sm font-bold text-[#f4eadc]">Google</span>
              <span className="block font-mono text-[0.5rem] uppercase tracking-[0.14em] text-[#756d64]">{copy.oauthProvider}</span>
            </span>
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => void signIn("discord")}
            className="mt-1 flex w-full items-center gap-3 rounded-lg border border-transparent px-3 py-2 text-left transition hover:border-[#47c9d9]/22 hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#47c9d9]/60"
          >
            <span className="flex size-7 items-center justify-center rounded-md border border-[#47c9d9]/24 bg-[#47c9d9]/10 font-mono text-[0.58rem] font-bold text-[#47c9d9]">
              D
            </span>
            <span>
              <span className="block text-sm font-bold text-[#f4eadc]">Discord</span>
              <span className="block font-mono text-[0.5rem] uppercase tracking-[0.14em] text-[#756d64]">{copy.oauthProvider}</span>
            </span>
          </button>
        </div>
      ) : null}
    </div>
  );
}

function ActionChip({ action, onClose }: Readonly<{ action: AskAction; onClose: () => void }>) {
  const router = useRouter();

  if (action.type === "navigate") {
    return (
      <button
        type="button"
        onClick={() => {
          onClose();
          router.push(action.href);
        }}
        className="group flex max-w-[85%] items-center justify-between gap-3 rounded-lg border border-[#18c964]/45 bg-[#071109]/82 px-3 py-2 text-left transition hover:-translate-y-0.5 hover:border-[#18c964]/70 hover:bg-[#0a1a0d]"
      >
        <span className="flex items-center gap-2">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md border border-[#18c964]/45 bg-[#18c964]/12 font-mono text-[0.58rem] font-bold uppercase tracking-[0.16em] text-[#18c964]">
            GO
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[0.85rem] font-bold text-[#f4eadc]">{action.label}</span>
            {action.reason ? <span className="mt-0.5 block text-[0.7rem] text-[#9bd1a8]">{action.reason}</span> : null}
          </span>
        </span>
        <ArrowRight className="size-3.5 shrink-0 text-[#18c964] transition group-hover:translate-x-0.5" />
      </button>
    );
  }

  return (
    <div className="max-w-[85%] rounded-lg border border-[#d6a548]/45 bg-[#1b1508]/72 p-3">
      <div className="flex items-center gap-2 font-mono text-[0.58rem] uppercase tracking-[0.18em] text-[#d6a548]">
        <span className="size-1.5 rounded-full bg-[#d6a548]" />
        {action.label}
      </div>
      {action.reason ? <p className="mt-1 text-[0.74rem] text-[#dfd5c7]">{action.reason}</p> : null}
      <div className="mt-2 flex flex-col gap-1.5">
        {action.steps.map((step, idx) => (
          <button
            key={`${step.href}-${idx}`}
            type="button"
            onClick={() => {
              onClose();
              router.push(step.href);
            }}
            className="flex items-center justify-between rounded-md border border-[#d6a548]/30 bg-[#100b04]/72 px-2.5 py-1.5 text-left transition hover:border-[#d6a548]/55 hover:bg-[#1c1209]"
          >
            <span className="flex items-center gap-2 text-[0.78rem] text-[#fff2d3]">
              <span className="font-mono text-[0.5rem] uppercase tracking-[0.16em] text-[#d6a548]">{String(idx + 1).padStart(2, "0")}</span>
              {step.label}
            </span>
            <ArrowRight className="size-3 text-[#d6a548]" />
          </button>
        ))}
      </div>
    </div>
  );
}

function AskAnythingChat({ language }: Readonly<{ language: WebLanguage }>) {
  const copy = chatCopy[language];
  const { status: sessionStatus } = useSession();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [messages, setMessages] = useState<AskMessage[]>([
    {
      role: "assistant",
      content: "Tôi là MrNine AI. Bạn muốn viết, tạo ảnh, dựng video, xử lý tài liệu hay hỏi nhanh điều gì?",
    },
  ]);
  const hydratedRef = useRef(false);

  useEffect(() => {
    if (sessionStatus !== "authenticated" || hydratedRef.current) return;
    hydratedRef.current = true;
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/chat-history", { cache: "no-store" });
        const data = await response.json().catch(() => null);
        if (cancelled) return;
        const stored = Array.isArray(data?.messages) ? (data.messages as AskMessage[]) : [];
        if (stored.length > 0) {
          setMessages(stored);
        }
      } catch {
        // ignore — keep the greeting
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionStatus]);

  useEffect(() => {
    if (sessionStatus !== "authenticated") return;
    if (messages.length === 0) return;
    if (messages.length === 1 && messages[0]?.role === "assistant") return;
    const id = window.setTimeout(() => {
      void fetch("/api/chat-history", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages }),
      }).catch(() => null);
    }, 800);
    return () => window.clearTimeout(id);
  }, [messages, sessionStatus]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setMessages((current) => {
        if (current.length !== 1 || current[0]?.role !== "assistant") {
          return current;
        }

        return [{ role: "assistant", content: copy.greeting }];
      });
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [copy.greeting]);

  useEffect(() => {
    function openChat(event: Event) {
      setOpen(true);

      if (event instanceof CustomEvent && typeof event.detail?.prompt === "string") {
        setInput(event.detail.prompt);
      }
    }

    window.addEventListener("mrnine-open-chat", openChat);

    return () => window.removeEventListener("mrnine-open-chat", openChat);
  }, []);

  async function sendMessage() {
    const content = input.trim();

    if (!content || loading) {
      return;
    }

    const nextMessages: AskMessage[] = [...messages, { role: "user", content }];
    setMessages(nextMessages);
    setInput("");
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/ask-anything", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });
      const data = await safeParseJson(response);

      if (!response.ok) {
        throw new Error(data?.error || copy.failed);
      }

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: data.message || "Tôi chưa nhận được nội dung phản hồi.",
          action: data.action ?? null,
        },
      ]);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : copy.failed);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {open ? (
        <section
          aria-label={copy.aria}
          className="fixed bottom-20 left-5 z-50 flex h-[min(36rem,calc(100vh-7rem))] w-[min(26rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border border-[#45a85d]/28 bg-[#080b08]/96 shadow-[0_24px_90px_rgba(0,0,0,0.58),0_0_44px_rgba(24,201,100,0.16)] backdrop-blur-xl sm:bottom-24 lg:bottom-24 2xl:left-auto 2xl:right-5 2xl:bottom-6"
        >
          <div className="flex items-center justify-between border-b border-white/10 bg-[#0b140d] px-4 py-3">
            <div>
              <div className="font-display text-lg font-black tracking-[-0.06em] text-[#f4eadc]">
                Mr<span className="text-[#18c964]">Nine</span> AI
              </div>
              <div className="font-mono text-[0.58rem] uppercase tracking-[0.22em] text-[#7f8c7d]">
                {copy.subtitle}
              </div>
            </div>
            <button
              type="button"
              aria-label={copy.close}
              onClick={() => setOpen(false)}
              className="flex size-9 items-center justify-center rounded-lg text-[#9aa596] transition hover:bg-white/[0.06] hover:text-[#f4eadc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#45a85d]/80"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={cn("flex flex-col gap-2", message.role === "user" ? "items-end" : "items-start")}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-lg border px-3 py-2 text-sm leading-6 whitespace-pre-wrap",
                    message.role === "user"
                      ? "border-[#18c964]/35 bg-[#18c964]/14 text-[#edfff0]"
                      : "border-white/10 bg-white/[0.045] text-[#dfe8dc]",
                  )}
                >
                  {message.content}
                </div>
                {message.role === "assistant" && message.action ? (
                  <ActionChip action={message.action} onClose={() => setOpen(false)} />
                ) : null}
              </div>
            ))}
            {loading ? (
              <div className="flex items-center gap-2 font-mono text-[0.66rem] uppercase tracking-[0.18em] text-[#7f8c7d]">
                <LoaderCircle className="size-3.5 animate-spin text-[#18c964]" />
                {copy.thinking}
              </div>
            ) : null}
            {error ? <div className="rounded-lg border border-[#ef4444]/30 bg-[#ef4444]/10 px-3 py-2 text-xs text-[#ffb4ad]">{error}</div> : null}
          </div>

          <div className="border-t border-white/10 bg-[#070907] p-3">
            <div className="flex items-end gap-2 rounded-lg border border-[#45a85d]/22 bg-[#0c120c] p-2">
              <textarea
                value={input}
                rows={1}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void sendMessage();
                  }
                }}
        placeholder={copy.placeholder}
                className="max-h-28 min-h-9 flex-1 resize-none bg-transparent px-2 py-2 text-sm text-[#f4eadc] placeholder:text-[#6f776d] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => void sendMessage()}
                disabled={!input.trim() || loading}
                className="flex size-9 shrink-0 items-center justify-center rounded-md bg-[#18c964] text-[#061009] transition hover:bg-[#22dd73] disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#45a85d]/80"
                aria-label={copy.send}
              >
                {loading ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />}
              </button>
            </div>
          </div>
        </section>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-label={copy.button}
        title={copy.button}
        className="ask-dock-wake group fixed bottom-5 right-5 z-50 flex h-12 w-12 items-center justify-center rounded-full border border-[#45a85d]/35 bg-[#071109]/92 text-[#dff8e4] shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset,0_0_34px_rgba(24,201,100,0.16)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-[#45a85d]/70 hover:bg-[#0a1a0d] hover:text-[#f4fff6] hover:shadow-[0_0_0_1px_rgba(69,168,93,0.18)_inset,0_0_42px_rgba(24,201,100,0.24)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#45a85d]/80 sm:bottom-6 sm:left-6 sm:right-auto lg:hidden"
      >
        <span className="flex size-7 items-center justify-center rounded-full border border-[#45a85d]/35 bg-[#18c964]/12 text-[#18c964] transition group-hover:border-[#45a85d]/70 group-hover:bg-[#18c964]/18">
          <MessageCircle className="size-4" />
        </span>
        <span className="pointer-events-none absolute -top-1 -right-1 flex size-3 items-center justify-center rounded-full bg-[#18c964] shadow-[0_0_10px_rgba(24,201,100,0.7)] animate-[pulse_1.4s_ease-in-out_infinite]" />
      </button>

      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-label={copy.button}
        title={copy.button}
        className="ask-dock-wake group fixed bottom-6 left-6 z-40 hidden h-11 items-center gap-2.5 overflow-hidden rounded-lg border border-[#45a85d]/35 bg-[#071109]/92 px-3.5 pr-4 font-mono text-[0.62rem] font-bold uppercase tracking-[0.16em] text-[#dff8e4] shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset,0_0_34px_rgba(24,201,100,0.16)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-[#45a85d]/70 hover:bg-[#0a1a0d] hover:text-[#f4fff6] hover:shadow-[0_0_0_1px_rgba(69,168,93,0.18)_inset,0_0_42px_rgba(24,201,100,0.24)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#45a85d]/80 lg:flex 2xl:hidden"
      >
        <span className="pointer-events-none absolute inset-y-0 left-0 w-px bg-[#45a85d]/80 shadow-[0_0_18px_rgba(69,168,93,0.8)]" />
        <span className="flex size-6 items-center justify-center rounded-md border border-[#45a85d]/35 bg-[#18c964]/12 text-[#18c964] transition group-hover:border-[#45a85d]/70 group-hover:bg-[#18c964]/18">
          <MessageCircle className="size-3.5" />
        </span>
        <span>{copy.button}</span>
        <span className="flex gap-0.5 text-[#45a85d]">
          <span className="animate-[pulse_1.2s_ease-in-out_infinite]">.</span>
          <span className="animate-[pulse_1.2s_ease-in-out_0.18s_infinite]">.</span>
          <span className="animate-[pulse_1.2s_ease-in-out_0.36s_infinite]">.</span>
        </span>
      </button>
    </>
  );
}

export function HomeCommandSurface() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status: sessionStatus } = useSession();
  const shouldReduceMotion = useReducedMotion();
  const { language, setLanguage } = useLanguage();
  const [interfaceTheme, setInterfaceTheme] = useState<InterfaceTheme>("auto");
  const [armingModule, setArmingModule] = useState("");
  const [commandInput, setCommandInput] = useState("");
  const [commandFocused, setCommandFocused] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchActiveIndex, setSearchActiveIndex] = useState(0);
  const [previewModule, setPreviewModule] = useState<ModuleCard | null>(null);
  const [authPromptDismissed, setAuthPromptDismissed] = useState(false);
  const [authPromptForced, setAuthPromptForced] = useState(false);
  const [recentVisits, setRecentVisits] = useState<RecentVisit[]>([]);
  const [siteConfig, setSiteConfig] = useState<{
    hero?: { vi?: string[]; en?: string[] };
    modules?: Record<string, { hidden?: boolean; comingSoon?: boolean; detailVi?: string; detailEn?: string }>;
    themes?: Record<string, { hidden?: boolean }>;
  }>({});
  const heroRef = useRef<HTMLElement | null>(null);
  const commandInputRef = useRef<HTMLInputElement | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);
  const searchPanelRef = useRef<HTMLDivElement | null>(null);
  const mobileSearchPanelRef = useRef<HTMLDivElement | null>(null);
  const [searchPanelRect, setSearchPanelRect] = useState<{ left: number; top: number; width: number; maxHeight: number } | null>(null);
  const [autoPhase, setAutoPhase] = useState<DayPhase>(() =>
    typeof window === "undefined" ? "day" : getDayPhase(getBangkokHour()),
  );

  useEffect(() => {
    if (interfaceTheme !== "auto") return;
    const tick = () => setAutoPhase(getDayPhase(getBangkokHour()));
    tick();
    const id = window.setInterval(tick, 5 * 60 * 1000);
    return () => window.clearInterval(id);
  }, [interfaceTheme]);

  const resolvedTheme: InterfaceTheme = interfaceTheme === "auto" ? getAutoTheme(autoPhase) : interfaceTheme;
  const activeTheme = interfaceThemes.find((theme) => theme.value === resolvedTheme) ?? interfaceThemes[0];
  const activeVisuals = themeVisuals[activeTheme.value];
  const PreviewIcon = previewModule?.icon;
  const copy = homeCopy[language];
  const allSearchResults = useMemo(() => buildSearchResults(language), [language]);
  const [marketsTicker, setMarketsTicker] = useState<MarketTick[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const r = await fetch("/api/markets", { cache: "no-store" });
        const j = (await r.json().catch(() => null)) as { rows?: MarketTick[] } | null;
        if (!cancelled && j?.rows) setMarketsTicker(j.rows);
      } catch {
        // silent — fallback ticker is fine
      }
    }
    void load();
    const id = window.setInterval(load, 90_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const tickerItems = useMemo(() => {
    if (!marketsTicker.length) return ticker;
    const priced = shuffle(marketsTicker).map(formatTickerPrice);
    // Mix 6 randomized market lines + 4 system status lines so the ticker still
    // shows the original "queue/router" vibe but real prices headline.
    const status = shuffle(ticker).slice(0, 4);
    return shuffle([...priced.slice(0, 6), ...status]);
  }, [marketsTicker]);

  const enrichedSearchResults = useMemo(() => {
    const extras: SearchResult[] = [];
    for (const row of marketsTicker) {
      extras.push({
        id: `market-${row.id}`,
        title: `${row.symbol} · ${row.name}`,
        subtitle:
          row.kind === "forex"
            ? `1 ${row.symbol} ≈ ${Math.round(row.vnd).toLocaleString("vi-VN")} VND`
            : `${row.usd >= 1 ? `$${row.usd.toLocaleString("en-US", { maximumFractionDigits: 2 })}` : `$${row.usd.toFixed(4)}`}${
                row.change24h !== null ? ` · ${row.change24h >= 0 ? "+" : ""}${row.change24h.toFixed(2)}%` : ""
              }`,
        badge: row.kind === "metal" ? "Metal" : row.kind === "forex" ? "FX" : "Crypto",
        category: "feature",
        icon: LineChart,
        accent: row.change24h !== null && row.change24h < 0 ? "red" : "lime",
        href: `/markets?focus=${encodeURIComponent(row.symbol)}`,
      });
    }
    for (const item of aiStoreCatalog) {
      extras.push({
        id: `store-${item.id}`,
        title: `${item.product}`,
        subtitle: `${item.brand} · ${storeFmtVnd.format(item.priceVnd)} · ${item.duration}`,
        badge: item.badge ?? "AI",
        category: "feature",
        icon: ShoppingBag,
        accent: "amber",
        href: "/ai-store",
      });
    }
    if (extras.length === 0) return allSearchResults;
    return [...allSearchResults, ...extras];
  }, [allSearchResults, marketsTicker]);

  const searchResults = useMemo(
    () => filterAndRankResults(commandInput, enrichedSearchResults),
    [commandInput, enrichedSearchResults],
  );
  const slashMode = commandInput.trimStart().startsWith("/");
  const groupedResults = useMemo(() => {
    const order: ReadonlyArray<SearchCategory> = [
      "module",
      "feature",
      "image-model",
      "video-model",
      "motion-model",
    ];
    const groups = new Map<SearchCategory, SearchResult[]>();
    for (const result of searchResults) {
      const list = groups.get(result.category) ?? [];
      list.push(result);
      groups.set(result.category, list);
    }
    return order
      .filter((cat) => groups.has(cat))
      .map((cat) => ({ category: cat, items: groups.get(cat) ?? [] }));
  }, [searchResults]);
  const flatResults = useMemo(
    () => groupedResults.flatMap((group) => group.items),
    [groupedResults],
  );
  const authPromptCopy = language === "vi"
    ? "Vui lòng đăng nhập để sử dụng các tính năng MrNine."
    : "Please sign in to use MrNine features.";
  const loginRequested = searchParams?.get("login") === "1";
  const authPromptVisible =
    sessionStatus !== "authenticated" && !authPromptDismissed && (authPromptForced || loginRequested);

  useEffect(() => {
    if (sessionStatus !== "authenticated") {
      return;
    }
    if (!searchParams?.has("login") && !searchParams?.has("from")) {
      return;
    }
    const next = searchParams.get("from");
    if (next && next.startsWith("/") && !next.startsWith("/api")) {
      router.replace(next);
    } else {
      router.replace("/");
    }
  }, [sessionStatus, searchParams, router]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const savedTheme = window.localStorage.getItem("mrnine-interface-theme");
      if (interfaceThemes.some((theme) => theme.value === savedTheme)) {
        setInterfaceTheme(savedTheme as InterfaceTheme);
      }
    }, 0);

    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }

      if (event.metaKey || event.ctrlKey || event.altKey) {
        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
          event.preventDefault();
          commandInputRef.current?.focus();
        }
        return;
      }

      const moduleMatch = modules.find((mod) => mod.shortcut === event.key);
      if (moduleMatch) {
        event.preventDefault();
        openModule(moduleMatch.title);
      }
    }

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [armingModule]);

  function updateInterfaceTheme(nextTheme: InterfaceTheme) {
    setInterfaceTheme(nextTheme);
    window.localStorage.setItem("mrnine-interface-theme", nextTheme);
  }

  function applyQuickCommand(command: string) {
    setCommandInput(`${command} `);
    setSearchOpen(true);
    window.requestAnimationFrame(() => commandInputRef.current?.focus());
  }

  function navigateToResult(result: SearchResult) {
    if (sessionStatus !== "authenticated") {
      setAuthPromptForced(true);
      setAuthPromptDismissed(false);
      return;
    }
    setSearchOpen(false);
    setCommandFocused(false);
    setCommandInput("");
    commandInputRef.current?.blur();
    recordVisit(result.title, result.href);
    if (result.category === "module" && moduleNavMap[result.title]) {
      const delay = shouldReduceMotion ? 0 : 320;
      setArmingModule(result.title);
      window.setTimeout(() => router.push(result.href), delay);
      return;
    }
    router.push(result.href);
  }

  function handleSearchKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!searchOpen) setSearchOpen(true);
      setSearchActiveIndex((current) =>
        flatResults.length === 0 ? 0 : (current + 1) % flatResults.length,
      );
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!searchOpen) setSearchOpen(true);
      setSearchActiveIndex((current) =>
        flatResults.length === 0 ? 0 : (current - 1 + flatResults.length) % flatResults.length,
      );
      return;
    }
    if (event.key === "Escape") {
      if (searchOpen) {
        event.preventDefault();
        setSearchOpen(false);
      }
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const target = flatResults[searchActiveIndex] ?? flatResults[0];
      if (target) navigateToResult(target);
    }
  }

  useEffect(() => {
    setSearchActiveIndex(0);
  }, [commandInput]);

  useEffect(() => {
    if (!searchOpen) return;
    function handlePointerDown(event: globalThis.MouseEvent) {
      const target = event.target as Node;
      if (commandInputRef.current?.contains(target)) return;
      if (searchPanelRef.current?.contains(target)) return;
      if (mobileSearchPanelRef.current?.contains(target)) return;
      setSearchOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [searchOpen]);

  useEffect(() => {
    if (!searchOpen) {
      setSearchPanelRect(null);
      return;
    }
    function recalc() {
      const form = formRef.current;
      if (!form) return;
      const rect = form.getBoundingClientRect();
      const margin = 16;
      const available = window.innerHeight - rect.bottom - margin;
      setSearchPanelRect({
        left: rect.left,
        top: rect.bottom + 8,
        width: rect.width,
        maxHeight: Math.max(220, Math.min(available, 520)),
      });
    }
    recalc();
    window.addEventListener("resize", recalc);
    window.addEventListener("scroll", recalc, true);
    return () => {
      window.removeEventListener("resize", recalc);
      window.removeEventListener("scroll", recalc, true);
    };
  }, [searchOpen, commandInput, language]);

  useEffect(() => {
    setRecentVisits(loadRecentVisits());
    const onStorage = (e: StorageEvent) => {
      if (e.key === RECENT_VISITS_KEY) setRecentVisits(loadRecentVisits());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    void fetch("/api/site-config", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (data && typeof data === "object") setSiteConfig(data);
      })
      .catch(() => null);
  }, []);

  function recordVisit(title: string, href: string) {
    pushRecentVisit({ title, href });
    setRecentVisits(loadRecentVisits());
    void fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ module: title }),
    }).catch(() => null);
  }

  function openModule(title: string) {
    const destinations: Record<string, string> = {
      "AI Playground": "/ai-playground",
      "Photo Fix": "/photo-fix",
      "Smart Recap": "/smart-recap",
      "DocSense": "/docsense",
      "Story Writer": "/story-writer",
      "Mystic Deck": "/mystic-deck",
      "Markets": "/markets",
      "AI Store": "/ai-store",
      "Tools": "/tools",
      "Calculators": "/calculators",
    };
    const destination = destinations[title];

    if (!destination) {
      return;
    }

    if (sessionStatus !== "authenticated") {
      setAuthPromptForced(true);
      setAuthPromptDismissed(false);
      return;
    }

    if (armingModule) {
      return;
    }

    recordVisit(title, destination);
    const delay = shouldReduceMotion ? 0 : 320;
    setArmingModule(title);

    window.setTimeout(() => {
      router.push(destination);
    }, delay);
  }

  function submitCommand(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sessionStatus !== "authenticated") {
      setAuthPromptForced(true);
      setAuthPromptDismissed(false);
      return;
    }
    const target = flatResults[searchActiveIndex] ?? flatResults[0];
    if (target) {
      navigateToResult(target);
    }
  }

  function updateNumeralParallax(event: MouseEvent<HTMLElement>) {
    const section = event.currentTarget;
    const rect = section.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width - 0.5) * 10;
    const y = ((event.clientY - rect.top) / rect.height - 0.5) * 7;

    section.style.setProperty("--numeral-parallax-x", `${x.toFixed(2)}px`);
    section.style.setProperty("--numeral-parallax-y", `${y.toFixed(2)}px`);
  }

  function resetNumeralParallax() {
    const section = heroRef.current;

    if (!section) {
      return;
    }

    section.style.setProperty("--numeral-parallax-x", "0px");
    section.style.setProperty("--numeral-parallax-y", "0px");
  }

  return (
    <main className="relative min-h-screen overflow-x-hidden pb-20 transition-colors duration-300 sm:pb-0" style={activeVisuals.main}>
      <a href="#main-content" className="skip-link focus:left-4 focus:top-4">
        {copy.skip}
      </a>

      {authPromptVisible ? (
        <div className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex justify-center px-3 pt-3">
          <div className="pointer-events-auto flex max-w-xl items-start gap-3 rounded-lg border border-[#ef4444]/40 bg-[#0d0805]/96 px-4 py-3 shadow-[0_18px_60px_rgba(0,0,0,0.55)] backdrop-blur-xl">
            <Lock className="mt-0.5 size-4 shrink-0 text-[#ef4444]" />
            <div className="flex-1 text-[0.78rem] leading-5 text-[#f4eadc]">{authPromptCopy}</div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => void signIn("google")}
                className="rounded-md border border-[#ef4444]/45 bg-[#ef4444]/12 px-2.5 py-1 font-mono text-[0.58rem] uppercase tracking-[0.16em] text-[#ffe9e5] transition hover:bg-[#ef4444]/20"
              >
                {language === "vi" ? "Đăng nhập" : "Sign in"}
              </button>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setAuthPromptDismissed(true)}
                className="flex size-7 items-center justify-center rounded-md border border-white/10 text-[#9a9087] transition hover:bg-white/[0.05] hover:text-[#f4eadc]"
              >
                <X className="size-3.5" />
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="pointer-events-none absolute inset-0 transition-colors duration-300" style={activeVisuals.ambient} />
      <div className="pointer-events-none absolute inset-0 bg-[size:24px_24px] opacity-55 transition-colors duration-300" style={activeVisuals.grid} />
      <div className="blueprint-layer pointer-events-none absolute inset-0" aria-hidden="true" />

      <header className="relative z-30 flex h-14 items-center border-b px-4 transition-colors duration-300" style={activeVisuals.header}>
        <a
          href="/"
          aria-label="MrNine home"
          className="flex items-center gap-2 rounded-md outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#ef4444]/70"
        >
          <div className="font-display text-2xl font-black tracking-[-0.08em] text-[#f4eadc]">
            Mr<span className="text-[#ef4444]">Nine</span>
          </div>
          <div className="hidden font-mono text-[0.52rem] uppercase leading-3 tracking-[0.24em] text-[#9a9087] xl:block">
            <div>{copy.futureDomain}</div>
            <div>{copy.desktop}</div>
          </div>
        </a>

        <div className="hidden flex-1 justify-center xl:flex">
          <TabAudioVisualizer />
        </div>

        <div className="ml-auto flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.025] p-1 shadow-[0_0_0_1px_rgba(255,255,255,0.018)_inset]">
          <div className="hidden rounded-full border border-white/10 bg-white/[0.03] p-0.5 font-mono text-[0.58rem] uppercase tracking-[0.16em] text-[#c4b9ad] md:flex">
            {appLanguageOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                title={option.title}
                aria-pressed={language === option.value}
                onClick={() => setLanguage(option.value)}
                className={cn(
                  "rounded-full px-2.5 py-1 transition hover:text-[#f4eadc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ef4444]/70",
                  language === option.value
                    ? "bg-[#ef4444] text-[#090807]"
                    : "text-[#9f968b]",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
          <InterfaceThemeSelector theme={activeTheme} visuals={activeVisuals} language={language} onThemeChange={updateInterfaceTheme} />
          <BangkokClock copy={copy} />
          <AuthControl language={language} />
          <Button variant="ghost" size="icon" className="md:hidden" aria-label={copy.openMenu}>
            <Menu className="size-4" />
          </Button>
        </div>
      </header>

      <div className="relative z-10 grid min-h-[calc(100vh-3.5rem)] grid-cols-1 lg:grid-cols-[68px_minmax(0,1fr)]">
        <aside className="hidden border-r border-[#25211b] bg-[#090807]/76 lg:flex lg:flex-col">
          <div className="flex flex-1 flex-col items-center gap-2 pt-4">
            {railItems.filter((item) => item.label === "Home" || item.label === "Profile" || !siteConfig.modules?.[item.label]?.hidden).map((item, index) => {
              const Icon = item.icon;
              const isHome = item.label === "Home";
              const className = cn(
                "group relative flex size-11 items-center justify-center rounded-lg text-[#817a71] transition hover:bg-white/[0.04] hover:text-[#f2e9dd]",
                isHome && "rail-active-signal border border-[#f2e9dd]/64 bg-white/[0.12] text-[#f2e9dd]",
                !item.href && "opacity-55 cursor-not-allowed hover:bg-transparent hover:text-[#817a71]",
              );
              const inner = (
                <>
                  <Icon className="size-4" />
                  <span className="absolute -bottom-2 font-mono text-[0.45rem] tracking-[0.18em] text-[#6e675f] opacity-55 transition group-hover:opacity-100">
                    {item.shortcut ?? String(index).padStart(2, "0")}
                  </span>
                  <span className="pointer-events-none absolute left-[calc(100%+0.75rem)] top-1/2 z-40 -translate-y-1/2 rounded-md border border-[#2a251f] bg-[#0b0907]/95 px-2.5 py-1.5 font-mono text-[0.55rem] uppercase tracking-[0.16em] text-[#d8cfc4] opacity-0 shadow-[0_12px_34px_rgba(0,0,0,0.32)] transition group-hover:translate-x-0.5 group-hover:opacity-100">
                    {item.label}
                  </span>
                </>
              );
              if (item.href) {
                return (
                  <a key={item.label} href={item.href} aria-label={item.label} title={item.label} className={className}>
                    {inner}
                  </a>
                );
              }
              return (
                <button
                  key={item.label}
                  type="button"
                  aria-label={item.label}
                  title={`${item.label} — ${language === "vi" ? "sắp ra mắt" : "coming soon"}`}
                  disabled
                  className={className}
                >
                  {inner}
                </button>
              );
            })}
          </div>

          <div className="border-t border-[#25211b] py-3" />
        </aside>

        <div id="main-content" className="grid min-h-0 grid-cols-1 gap-0 px-4 sm:px-6 lg:px-7 2xl:grid-cols-[minmax(0,1fr)_18rem] 2xl:gap-5">
          <div className="flex min-h-0 flex-col">
          <section
            ref={heroRef}
            onMouseMove={updateNumeralParallax}
            onMouseLeave={resetNumeralParallax}
            className="relative min-h-[300px] shrink-0 overflow-hidden border-b border-[#25211b] py-5 sm:py-7 lg:min-h-[340px]"
          >
            <HeroParticleNetwork />
            <div
              className={cn(
                "hero-numeral-scan absolute -right-1 top-4 z-[1] hidden text-[18vw] font-bold leading-[0.86] tracking-[0.015em] text-[#ef4444]/[0.045] transition-opacity duration-500 xl:block",
                commandFocused && "opacity-35",
              )}
            >
              009
            </div>
            <div className="absolute inset-0 z-[1] bg-[radial-gradient(circle_at_24%_22%,rgba(69,168,93,0.12),transparent_16%),radial-gradient(circle_at_52%_18%,rgba(214,165,72,0.1),transparent_12%),radial-gradient(circle_at_72%_36%,rgba(239,68,68,0.1),transparent_14%)]" />
            <div className="relative z-[2] max-w-[88rem]">
              <div className="mb-6 font-mono text-[0.62rem] uppercase tracking-[0.28em] text-[#8f8579]">
                {copy.home}
              </div>
              <div className="mb-5 flex items-center gap-3 font-mono text-[0.64rem] uppercase tracking-[0.28em] text-[#ef4444]">
                <span className="size-1 rounded-full bg-[#ef4444]" />
                {copy.online}
                <span className="text-[#6f675e]">/</span>
                Exp 009
              </div>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              >
                <DailyTypeHeadline key={language} language={language} overrides={siteConfig.hero} />
              </motion.div>

              <p className="mt-5 max-w-2xl text-sm leading-7 text-[#c4b9ad] sm:text-base">
                {copy.heroDescription}
              </p>

              <form
                ref={formRef}
                onSubmit={submitCommand}
                className={cn(
                  "command-control-line relative mt-7 max-w-3xl rounded-xl border-2 bg-[#0d0b08]/92 p-2.5 shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset,0_24px_80px_rgba(239,68,68,0.08),0_18px_70px_rgba(0,0,0,0.32)] backdrop-blur transition",
                  commandFocused ? "border-[#ef4444]/72 bg-[#120c09]/96 shadow-[0_0_0_1px_rgba(239,68,68,0.2)_inset,0_28px_92px_rgba(239,68,68,0.18),0_22px_82px_rgba(0,0,0,0.4)]" : "border-[#3a322a]",
                )}
              >
                <div className="flex items-center gap-2.5">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-md border border-[#ef4444]/35 bg-[#ef4444]/14 font-mono text-base text-[#ef4444]">
                    &gt;_
                  </span>
                  <Search className="size-4 shrink-0 text-[#ef4444]/70" aria-hidden="true" />
                  <input
                    ref={commandInputRef}
                    value={commandInput}
                    onFocus={() => {
                      setCommandFocused(true);
                      setSearchOpen(true);
                    }}
                    onBlur={() => setCommandFocused(false)}
                    onChange={(event) => {
                      setCommandInput(event.target.value);
                      setSearchOpen(true);
                    }}
                    onKeyDown={handleSearchKeyDown}
                    role="combobox"
                    aria-expanded={searchOpen}
                    aria-autocomplete="list"
                    aria-controls="mrnine-search-listbox"
                    placeholder={copy.commandPlaceholder}
                    className="min-w-0 flex-1 bg-transparent px-1 text-base text-[#f4eadc] outline-none placeholder:text-[#8a8278]"
                  />
                  <kbd className="hidden h-7 items-center gap-1 rounded-md border border-white/12 bg-white/[0.04] px-2 font-mono text-[0.62rem] font-bold text-[#b5ab9f] sm:flex">
                    <span className="text-[#ef4444]">⌘</span>K
                  </kbd>
                  <Button
                    type="submit"
                    className="h-10 rounded-md bg-[#ef4444] px-5 font-mono text-[0.66rem] font-bold uppercase tracking-[0.16em] text-[#090807] hover:bg-[#ff5b55]"
                  >
                    {copy.run}
                    <ArrowRight className="size-3.5" />
                  </Button>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5 border-t border-white/7 pt-2">
                  {quickCommands.map((item) => {
                    const selected = commandInput.trimStart().startsWith(item.command);
                    const hinted = slashMode && item.command.startsWith(commandInput.trimStart());
                    const localizedCommand = quickCommandCopy[language][item.command as keyof typeof quickCommandCopy.vi] ?? item;

                    return (
                      <button
                        key={item.command}
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => applyQuickCommand(item.command)}
                        className={cn(
                          "rounded-md border px-2.5 py-1 font-mono text-[0.54rem] uppercase tracking-[0.14em] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ef4444]/70",
                          selected || hinted
                            ? "border-[#ef4444]/44 bg-[#ef4444]/12 text-[#ffd7d3]"
                            : "border-white/8 bg-white/[0.025] text-[#8f8579] hover:border-[#d6a548]/30 hover:text-[#f4eadc]",
                        )}
                        aria-label={`${item.command} ${localizedCommand.hint ?? item.hint}`}
                      >
                        <span className="text-[#ef4444]">{item.command}</span>
                        <span className="ml-1 hidden text-[#756d64] sm:inline">{localizedCommand.hint ?? item.hint}</span>
                      </button>
                    );
                  })}
                  <span className="ml-auto hidden items-center gap-1.5 font-mono text-[0.52rem] uppercase tracking-[0.16em] text-[#9a9087] md:flex">
                    {copy.searchHint}
                  </span>
                </div>

                {searchOpen && searchPanelRect ? (
                  <div
                    ref={searchPanelRef}
                    id="mrnine-search-listbox"
                    role="listbox"
                    onMouseDown={(event) => event.preventDefault()}
                    style={{
                      position: "fixed",
                      left: searchPanelRect.left,
                      top: searchPanelRect.top,
                      width: searchPanelRect.width,
                      maxHeight: searchPanelRect.maxHeight,
                    }}
                    className="z-[60] overflow-y-auto rounded-xl border border-[#3a322a] bg-[#0a0907]/97 p-2 shadow-[0_24px_80px_rgba(0,0,0,0.55)] backdrop-blur-xl"
                  >
                    {flatResults.length === 0 ? (
                      <div className="flex items-center justify-center px-3 py-6 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-[#8f8579]">
                        {copy.searchEmpty}
                      </div>
                    ) : (
                      groupedResults.map((group) => (
                        <div key={group.category} className="mb-1 last:mb-0">
                          <div className="flex items-center gap-2 px-2 pb-1 pt-1.5 font-mono text-[0.5rem] uppercase tracking-[0.22em] text-[#9a9087]">
                            <span className="size-1 rounded-full bg-[#ef4444]" />
                            {searchCategoryCopy[language][group.category]}
                            <span className="text-[#5e574e]">/ {group.items.length}</span>
                          </div>
                          {group.items.map((result) => {
                            const accent = accentMap[result.accent];
                            const flatIndex = flatResults.indexOf(result);
                            const active = flatIndex === searchActiveIndex;
                            const Icon = result.icon;
                            return (
                              <button
                                key={result.id}
                                type="button"
                                role="option"
                                aria-selected={active}
                                onMouseEnter={() => setSearchActiveIndex(flatIndex)}
                                onClick={() => navigateToResult(result)}
                                className={cn(
                                  "flex w-full items-center gap-3 rounded-lg border border-transparent px-2 py-2 text-left transition",
                                  active
                                    ? "border-[#ef4444]/45 bg-[#ef4444]/10"
                                    : "hover:border-white/8 hover:bg-white/[0.03]",
                                )}
                              >
                                <span
                                  className={cn(
                                    "flex size-8 shrink-0 items-center justify-center rounded-md border",
                                    accent.border,
                                    accent.bg,
                                  )}
                                >
                                  <Icon className={cn("size-4", accent.text)} />
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="flex items-center gap-2">
                                    <span className="truncate text-[0.82rem] font-bold text-[#f4eadc]">
                                      {result.title}
                                    </span>
                                    {result.badge ? (
                                      <span className={cn("rounded border border-white/10 px-1 py-0.5 font-mono text-[0.46rem] uppercase tracking-[0.18em]", accent.text)}>
                                        {result.badge}
                                      </span>
                                    ) : null}
                                  </span>
                                  <span className="mt-0.5 flex items-center gap-2 truncate font-mono text-[0.56rem] uppercase tracking-[0.14em] text-[#8f8579]">
                                    {result.vendor ? (
                                      <>
                                        <span className="text-[#b5ab9f]">{result.vendor}</span>
                                        <span className="text-[#5e574e]">·</span>
                                      </>
                                    ) : null}
                                    <span className="truncate normal-case tracking-normal text-[0.7rem] font-normal text-[#b5ab9f]">
                                      {result.subtitle}
                                    </span>
                                  </span>
                                </span>
                                <ArrowRight className={cn("size-3.5 shrink-0 transition", active ? accent.text : "text-[#5e574e]")} />
                              </button>
                            );
                          })}
                        </div>
                      ))
                    )}
                  </div>
                ) : null}
              </form>

              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="outline" className="h-10 rounded-md px-4 font-mono text-[0.65rem] uppercase tracking-[0.16em]">
                  {copy.modules}
                </Button>
                <Button variant="outline" className="h-10 rounded-md px-4 font-mono text-[0.65rem] uppercase tracking-[0.16em]">
                  {copy.todo}
                </Button>
              </div>
            </div>
          </section>

          <div className="relative flex h-7 shrink-0 items-center overflow-hidden border-b border-[#25211b]/60 font-mono text-[0.56rem] uppercase tracking-[0.18em] text-[#9a9087] opacity-50 transition-opacity hover:opacity-100">
            <div className="flex min-w-max animate-[marquee_32s_linear_infinite] gap-8">
              {[...tickerItems, ...tickerItems].map((item, index) => (
                <span key={`${item}-${index}`} className="flex items-center gap-2">
                  <span
                    className={cn(
                      "ticker-dot-signal size-1 rounded-full",
                      index % 3 === 0 ? "bg-[#d6a548]" : index % 3 === 1 ? "bg-[#45a85d]" : "bg-[#ef4444]",
                    )}
                    style={{ animationDelay: `${(index % tickerItems.length) * 0.18}s` }}
                  />
                  {item}
                </span>
              ))}
            </div>
          </div>

          <section className="min-h-0 flex-1 py-5">
            <div className="mb-4 flex items-end justify-between">
              <div>
                <p className="font-mono text-[0.58rem] uppercase tracking-[0.24em] text-[#9a9087]">{copy.missionDeck}</p>
                <h2 className="mt-1 text-base font-bold tracking-[-0.03em] text-[#d8cfc4]">{copy.launchConsole}</h2>
              </div>
              <div className="hidden items-center gap-2 font-mono text-[0.56rem] uppercase tracking-[0.2em] text-[#7dd391] md:flex">
                <span className="size-1 rounded-full bg-[#45a85d]" />
                {copy.allOnline}
              </div>
            </div>

            <div className="mt-3 grid grid-cols-[repeat(auto-fit,minmax(min(12rem,100%),1fr))] gap-3">
              {modules
                .filter((module) => !siteConfig.modules?.[module.title]?.hidden)
                .map((module, index) => {
                  const override = siteConfig.modules?.[module.title];
                  const Icon = module.icon;
                  const accent = accentMap[module.accent as keyof typeof accentMap];
                  const baseLocalized = moduleCopy[language][module.title as keyof typeof moduleCopy.vi] ?? module;
                  const localizedModule = {
                    ...baseLocalized,
                    detail: (language === "vi" ? override?.detailVi : override?.detailEn) || baseLocalized.detail,
                  };
                  const moduleIsArming = armingModule === module.title;
                  const moduleIsDimmed = Boolean(armingModule) && !moduleIsArming;
                  const isComingSoon = override?.comingSoon || module.action === "Coming soon";

                  return (
                    <motion.button
                      key={module.title}
                      type="button"
                      onClick={() => openModule(module.title)}
                      onMouseEnter={() => setPreviewModule(module)}
                      onMouseLeave={() => setPreviewModule(null)}
                      onFocus={() => setPreviewModule(module)}
                      onBlur={() => setPreviewModule(null)}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{
                        opacity: moduleIsDimmed ? 0.36 : 1,
                        y: moduleIsArming && !shouldReduceMotion ? -4 : moduleIsDimmed && !shouldReduceMotion ? 4 : 0,
                        scale: moduleIsArming && !shouldReduceMotion ? 1.018 : 1,
                      }}
                      transition={{
                        delay: armingModule ? 0 : index * 0.035,
                        duration: armingModule ? 0.24 : 0.35,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                      className={cn(
                        "module-card-signal group relative flex min-h-[9.25rem] min-w-0 overflow-hidden rounded-lg border border-[#2a251f] bg-[#14100d]/72 p-3.5 text-left transition-all duration-200 hover:-translate-y-1 hover:border-[#ef4444]/45 hover:bg-[#1c1612] hover:shadow-[0_12px_40px_rgba(239,68,68,0.12),0_0_0_1px_rgba(239,68,68,0.08)_inset] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ef4444]/70",
                        moduleAnimationClass(module.title),
                        moduleIsArming && "module-route-arming",
                        moduleIsDimmed && "pointer-events-none blur-[0.4px]",
                        module.title !== "AI Playground" &&
                          module.title !== "Photo Fix" &&
                          module.title !== "Smart Recap" &&
                          module.title !== "DocSense" &&
                          module.title !== "Story Writer" &&
                          module.title !== "Mystic Deck" &&
                          module.title !== "Markets" &&
                          module.title !== "AI Store" &&
                          module.title !== "Tools" &&
                          module.title !== "Calculators" &&
                          "cursor-default opacity-75",
                      )}
                    >
                      <div className="flex w-full flex-col">
                        <div className="mb-4 flex items-start justify-between">
                          <div className={cn("module-icon-signal flex size-8 items-center justify-center rounded-md border transition group-hover:scale-110", accent.border, accent.bg)}>
                            <Icon className={cn("size-4", accent.text)} />
                          </div>
                          <div className="flex items-center gap-1.5">
                            <kbd className="hidden rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[0.5rem] font-bold text-[#9f968b] sm:inline-block">
                              {module.shortcut}
                            </kbd>
                            <span className="font-mono text-[0.46rem] uppercase tracking-[0.14em] text-[#6f675e]">{module.number}</span>
                          </div>
                        </div>
                        <h3 className="truncate text-[0.95rem] font-bold leading-tight text-[#f4eadc]">{localizedModule.title ?? module.title}</h3>
                        <p className="mt-0.5 truncate text-[0.7rem] leading-5 text-[#b5ab9f]">{localizedModule.detail ?? module.detail}</p>
                        <div className="mt-3 h-px w-full bg-gradient-to-r from-white/8 via-white/4 to-transparent" />
                        <div className="mt-auto flex items-center justify-between gap-2 pt-3 font-mono text-[0.5rem] uppercase tracking-[0.14em] text-[#9a9087]">
                          <span className="truncate">{localizedModule.signal ?? module.signal}</span>
                          <span className="flex items-center gap-1.5">
                            <span className={cn("size-1.5 rounded-full", accent.dot)} />
                            {module.lastUsed}
                          </span>
                        </div>
                      </div>
                      <div className="module-detail-strip absolute inset-x-0 bottom-0 flex h-8 translate-y-full items-center justify-between border-t border-white/8 bg-[#090807]/96 px-3 font-mono text-[0.52rem] uppercase tracking-[0.16em] text-[#d8cfc4] transition duration-250 group-hover:translate-y-0 group-focus-visible:translate-y-0">
                        <span>{isComingSoon ? copy.runtimeRequired : localizedModule.action ?? module.action}</span>
                        <ArrowRight className={cn("size-3", accent.text)} />
                      </div>
                    </motion.button>
                  );
                })}
            </div>
          </section>

          <div className="recent-output-dock mb-3 hidden shrink-0 items-center gap-2 overflow-hidden rounded-lg border border-[#2a251f] bg-[#0c0a08]/82 px-3 py-2 md:flex 2xl:hidden">
            <div className="mr-2 shrink-0 font-mono text-[0.55rem] uppercase tracking-[0.2em] text-[#d6a548]">{copy.outputDock}</div>
            {recentVisits.length === 0 ? (
              <div className="min-w-0 flex-1 px-2 font-mono text-[0.55rem] uppercase tracking-[0.16em] text-[#756d64]">
                {language === "vi" ? "Chưa mở module nào — bấm 1 thẻ phía trên" : "No module opened yet — tap any tile above"}
              </div>
            ) : (
              recentVisits.slice(0, 3).map((visit) => (
                <button
                  key={visit.title}
                  type="button"
                  onClick={() => router.push(visit.href)}
                  className="min-w-0 flex-1 rounded-md border border-white/7 bg-white/[0.025] px-3 py-2 text-left transition hover:border-[#45a85d]/24 hover:bg-[#45a85d]/[0.045] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#45a85d]/70"
                >
                  <div className="truncate text-xs font-bold text-[#efe6dc]">{visit.title}</div>
                  <div className="mt-0.5 truncate font-mono text-[0.48rem] uppercase tracking-[0.14em] text-[#756d64]">{formatRelative(visit.ts, language)}</div>
                </button>
              ))
            )}
          </div>

          <footer className="flex h-10 shrink-0 items-center justify-between border-t border-[#25211b] font-mono text-[0.58rem] uppercase tracking-[0.22em] text-[#776f66]">
            <div>MrNine / 2026 / Exp 009</div>
            <div className="hidden sm:block">{copy.build}</div>
            <div className="flex items-center gap-1">
              {socialLinks.map((social) => (
                <SocialIconButton key={social.label} {...social} />
              ))}
            </div>
          </footer>
          </div>

          <aside className="hidden min-h-0 border-l border-[#25211b] py-5 2xl:flex 2xl:flex-col">
            <div className="mb-4 px-4">
              <p className="font-mono text-[0.58rem] uppercase tracking-[0.24em] text-[#9a9087]">
                {previewModule ? copy.modulePreview : copy.recentOutput}
              </p>
              <h2 className="mt-1 text-lg font-bold tracking-[-0.04em] text-[#f4eadc]">{previewModule ? moduleCopy[language][previewModule.title as keyof typeof moduleCopy.vi]?.title ?? previewModule.title : copy.context}</h2>
            </div>

            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={previewModule?.title ?? "system-context"}
                initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.985 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.99 }}
                transition={{ duration: shouldReduceMotion ? 0.12 : 0.24, ease: [0.16, 1, 0.3, 1] }}
                className="px-4"
              >
                {previewModule ? (
                  <div className="rounded-lg border border-[#2a251f] bg-[#100d0a]/76 p-3">
                    <div
                      className={cn(
                        "mb-3 flex size-10 items-center justify-center rounded-md border",
                        accentMap[previewModule.accent as keyof typeof accentMap].border,
                        accentMap[previewModule.accent as keyof typeof accentMap].bg,
                      )}
                    >
                      {PreviewIcon ? <PreviewIcon className={cn("size-5", accentMap[previewModule.accent as keyof typeof accentMap].text)} /> : null}
                    </div>
                    <div className="font-mono text-[0.52rem] uppercase tracking-[0.18em] text-[#9a9087]">{moduleCopy[language][previewModule.title as keyof typeof moduleCopy.vi]?.signal ?? previewModule.signal}</div>
                    <p className="mt-2 text-sm leading-6 text-[#e0d6ca]">{moduleCopy[language][previewModule.title as keyof typeof moduleCopy.vi]?.summary ?? previewModule.summary}</p>
                    <div className="mt-4 flex items-center justify-between border-t border-white/8 pt-3 font-mono text-[0.54rem] uppercase tracking-[0.16em]">
                      <span className={accentMap[previewModule.accent as keyof typeof accentMap].text}>{previewModule.number}</span>
                      <span className="text-[#b5ab9f]">{previewModule.action === "Coming soon" ? copy.runtimeRequired : copy.readyToOpen}</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {recentVisits.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-[#2a251f] bg-[#100d0a]/40 px-3 py-6 text-center">
                        <p className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[#9a9087]">{copy.queueClear}</p>
                        <p className="mt-2 text-xs leading-5 text-[#b5ab9f]">{copy.queueBody}</p>
                      </div>
                    ) : (
                      recentVisits.slice(0, 4).map((visit) => (
                        <button
                          key={visit.title}
                          type="button"
                          onClick={() => router.push(visit.href)}
                          className="group flex w-full items-center justify-between gap-3 rounded-lg border border-[#2a251f] bg-[#100d0a]/76 px-3 py-3 text-left transition hover:-translate-y-0.5 hover:border-[#45a85d]/35 hover:bg-[#0e1a11] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#45a85d]/70"
                          aria-label={`${visit.title} — ${formatRelative(visit.ts, language)}`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-bold text-[#f4eadc]">{visit.title}</div>
                            <div className="mt-1 truncate font-mono text-[0.52rem] uppercase tracking-[0.16em] text-[#9a9087]">{formatRelative(visit.ts, language)}</div>
                          </div>
                          <ArrowRight className="size-3.5 shrink-0 text-[#9a9087] opacity-0 transition group-hover:translate-x-0.5 group-hover:text-[#45a85d] group-hover:opacity-100" />
                        </button>
                      ))
                    )}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            <div className="mt-auto mb-3 flex flex-col gap-2 px-4">
              <div className="rounded-lg border border-[#45a85d]/18 bg-[#071109]/72 p-3">
                <div className="flex items-center gap-2 font-mono text-[0.54rem] uppercase tracking-[0.18em] text-[#7dd391]">
                  <span className="size-1.5 rounded-full bg-[#45a85d]" />
                  {copy.queueClear}
                </div>
                <p className="mt-2 text-xs leading-5 text-[#b5ab9f]">{copy.queueBody}</p>
              </div>
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent("mrnine-open-chat"))}
                className="group flex w-full items-center gap-2.5 rounded-lg border border-[#45a85d]/22 bg-[#071109]/72 p-3 text-left transition hover:-translate-y-0.5 hover:border-[#45a85d]/55 hover:bg-[#0a1a0d] hover:shadow-[0_0_0_1px_rgba(69,168,93,0.18)_inset,0_0_36px_rgba(24,201,100,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#45a85d]/80"
                aria-label={chatCopy[language].button}
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-md border border-[#45a85d]/35 bg-[#18c964]/12 text-[#18c964] transition group-hover:border-[#45a85d]/65 group-hover:bg-[#18c964]/18">
                  <MessageCircle className="size-3.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-mono text-[0.54rem] uppercase tracking-[0.18em] text-[#7dd391]">
                    {chatCopy[language].button}
                  </span>
                  <span className="mt-0.5 block truncate text-[0.7rem] text-[#b5ab9f]">
                    {chatCopy[language].subtitle}
                  </span>
                </span>
                <ArrowRight className="size-3.5 shrink-0 text-[#45a85d] opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
              </button>
            </div>
          </aside>
        </div>
      </div>

      <form
        onSubmit={submitCommand}
        className="fixed inset-x-3 bottom-3 z-40 flex flex-col gap-2 pr-16 sm:hidden"
      >
        <div className="flex items-center gap-2 rounded-lg border border-[#45a85d]/24 bg-[#070907]/94 p-2 shadow-[0_18px_58px_rgba(0,0,0,0.55),0_0_32px_rgba(69,168,93,0.12)] backdrop-blur-xl">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-md border border-[#ef4444]/30 bg-[#ef4444]/10 text-[#ef4444]">
            <Search className="size-4" />
          </span>
          <input
            value={commandInput}
            onFocus={() => {
              setCommandFocused(true);
              setSearchOpen(true);
            }}
            onBlur={() => setCommandFocused(false)}
            onChange={(event) => {
              setCommandInput(event.target.value);
              setSearchOpen(true);
            }}
            onKeyDown={handleSearchKeyDown}
            placeholder={copy.mobileCommandPlaceholder}
            className="min-w-0 flex-1 bg-transparent text-sm text-[#f4eadc] outline-none placeholder:text-[#6f776d]"
          />
          <Button type="submit" size="icon" className="size-9 rounded-md bg-[#ef4444] text-[#090807] hover:bg-[#ff5b55]" aria-label={copy.mobileRun}>
            <ArrowRight className="size-4" />
          </Button>
        </div>
        {searchOpen ? (
          <div
            ref={mobileSearchPanelRef}
            role="listbox"
            onMouseDown={(event) => event.preventDefault()}
            className="max-h-[60vh] overflow-y-auto rounded-lg border border-[#3a322a] bg-[#0a0907]/97 p-2 shadow-[0_18px_58px_rgba(0,0,0,0.55)] backdrop-blur-xl"
          >
            {flatResults.length === 0 ? (
              <div className="flex items-center justify-center px-3 py-6 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-[#8f8579]">
                {copy.searchEmpty}
              </div>
            ) : (
              groupedResults.map((group) => (
                <div key={group.category} className="mb-1 last:mb-0">
                  <div className="px-2 pb-1 pt-1.5 font-mono text-[0.5rem] uppercase tracking-[0.22em] text-[#9a9087]">
                    {searchCategoryCopy[language][group.category]}
                  </div>
                  {group.items.map((result) => {
                    const accent = accentMap[result.accent];
                    const Icon = result.icon;
                    return (
                      <button
                        key={result.id}
                        type="button"
                        onClick={() => navigateToResult(result)}
                        className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-white/[0.04]"
                      >
                        <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-md border", accent.border, accent.bg)}>
                          <Icon className={cn("size-4", accent.text)} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[0.82rem] font-bold text-[#f4eadc]">
                            {result.title}
                          </span>
                          <span className="block truncate text-[0.7rem] text-[#b5ab9f]">{result.subtitle}</span>
                        </span>
                        <ArrowRight className={cn("size-3.5 shrink-0", accent.text)} />
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        ) : null}
      </form>

      <AskAnythingChat key={language} language={language} />
    </main>
  );
}

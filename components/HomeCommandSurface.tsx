"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent, type MouseEvent, type ReactNode } from "react";
import {
  ArrowRight,
  AudioLines,
  Bot,
  BriefcaseBusiness,
  ChevronDown,
  Check,
  Code2,
  FileText,
  ImageIcon,
  LoaderCircle,
  Lock,
  Menu,
  PenLine,
  Send,
  Sparkles,
  Wrench,
  X,
} from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type WebLanguage = "en" | "vi";
type InterfaceTheme = "auto" | "crimson" | "signal" | "gold" | "frost";
type AskMessage = {
  role: "user" | "assistant";
  content: string;
};

const languageOptions: ReadonlyArray<{ value: WebLanguage; label: string; title: string }> = [
  { value: "en", label: "EN", title: "English" },
  { value: "vi", label: "VI", title: "Tiếng Việt" },
];

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
};

const modules = [
  {
    number: "01",
    title: "AI Playground",
    detail: "Chat, image, voice",
    summary: "One command surface for quick chat, creative generation, and cross-module routing.",
    signal: "Command core",
    action: "Open command",
    icon: Sparkles,
    accent: "red",
  },
  {
    number: "02",
    title: "Story Forge",
    detail: "Plot, draft, chapter",
    summary: "Long-form writing studio with plot, outline, chapter, and project memory.",
    signal: "Narrative engine",
    action: "Launch story",
    icon: PenLine,
    accent: "lime",
  },
  {
    number: "03",
    title: "Voice Studio",
    detail: "Narration, TTS",
    summary: "Voice cloning and narration workspace powered by the OmniVoice runtime.",
    signal: "Voice queue",
    action: "Open voice",
    icon: AudioLines,
    accent: "amber",
  },
  {
    number: "04",
    title: "Vision Foundry",
    detail: "Image and video",
    summary: "Visual generation path for image assets and video pipeline experiments.",
    signal: "Render pipe",
    action: "Open vision",
    icon: ImageIcon,
    accent: "cyan",
  },
  {
    number: "05",
    title: "Document Core",
    detail: "PDF, Word, slides",
    summary: "Document conversion, summarization, extraction, and office-file workflows.",
    signal: "File ops",
    action: "Coming soon",
    icon: FileText,
    accent: "lime",
  },
  {
    number: "06",
    title: "Code Lab",
    detail: "Build and debug",
    summary: "Coding assistant lane for fixes, scaffolds, reviews, and deployment tasks.",
    signal: "Dev lane",
    action: "Coming soon",
    icon: Code2,
    accent: "cyan",
  },
  {
    number: "07",
    title: "Business Ops",
    detail: "Email, ads, plans",
    summary: "Operational AI for emails, ads, planning, campaigns, and daily execution.",
    signal: "Ops desk",
    action: "Coming soon",
    icon: BriefcaseBusiness,
    accent: "red",
  },
  {
    number: "08",
    title: "To-Do List",
    detail: "Priorities, history",
    summary: "Personal priority board connected to command history and saved outputs.",
    signal: "Task rail",
    action: "Coming soon",
    icon: Check,
    accent: "lime",
  },
];

const railItems = [
  { label: "Home", icon: Lock, active: true },
  { label: "Command", icon: Sparkles },
  { label: "Create", icon: PenLine },
  { label: "Documents", icon: FileText },
  { label: "Code", icon: Code2 },
  { label: "Vault", icon: Bot },
  { label: "History", icon: Wrench },
  { label: "Settings", icon: Check },
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
  { title: "Story outline", meta: "Story Forge / saved" },
  { title: "Voice draft", meta: "Voice Studio / queued" },
  { title: "Prompt map", meta: "Command / 2 min ago" },
];

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
];

const socialLinks = [
  { label: "GitHub", icon: <GithubIcon /> },
  { label: "Discord", icon: <DiscordIcon /> },
  { label: "Facebook", icon: <FacebookIcon /> },
  { label: "Instagram", icon: <InstagramIcon /> },
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

function SocialIconButton({ label, icon }: Readonly<{ label: string; icon: ReactNode }>) {
  return (
    <a
      href="#"
      aria-label={label}
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

function getRandomHeadline(previous?: string) {
  if (dailyHeadlines.length === 1) {
    return dailyHeadlines[0];
  }

  let next = dailyHeadlines[Math.floor(Math.random() * dailyHeadlines.length)];

  while (next === previous) {
    next = dailyHeadlines[Math.floor(Math.random() * dailyHeadlines.length)];
  }

  return next;
}

function DailyTypeHeadline() {
  const [headline, setHeadline] = useState(dailyHeadlines[0]);
  const [typedCount, setTypedCount] = useState(0);
  const characters = useMemo(() => Array.from(headline), [headline]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setHeadline((previous) => getRandomHeadline(previous));
    }, 0);

    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (typedCount > characters.length) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setTypedCount((current) => {
        if (current >= characters.length) {
          setHeadline((previous) => getRandomHeadline(previous));
          return 0;
        }

        return current + 1;
      });
    }, typedCount >= characters.length ? 900 : 333);

    return () => window.clearTimeout(timeout);
  }, [characters.length, typedCount]);

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
                  : "text-[#f4eadc]/18 opacity-70",
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

function BangkokClock() {
  const [time, setTime] = useState("");

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
    }

    updateTime();
    const interval = window.setInterval(updateTime, 1000);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <time
      dateTime={time}
      aria-label={`Current time in Bangkok: ${time || "loading"}`}
      className="hidden min-w-[8.25rem] rounded-full border border-[#d6a548]/24 bg-[#201707] px-3 py-1.5 font-mono text-[0.78rem] font-bold tabular-nums text-[#e4c56b] xl:block"
      suppressHydrationWarning
    >
      {time || "--:--:--"} <span className="ml-2 text-[0.55rem] text-[#7b7369]">Bangkok</span>
    </time>
  );
}

function HeroParticleNetwork() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

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
      { core: "rgba(239, 68, 68, 0.86)", glow: "rgba(239, 68, 68, 0.07)" },
      { core: "rgba(69, 168, 93, 0.86)", glow: "rgba(69, 168, 93, 0.07)" },
      { core: "rgba(214, 165, 72, 0.84)", glow: "rgba(214, 165, 72, 0.06)" },
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
        const speed = 7 + Math.random() * 13;
        const angle = Math.random() * Math.PI * 2;
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          radius: 0.72 + Math.random() * 0.78,
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

      for (const particle of particles) {
        const pulse = 0.72 + Math.sin(time * 0.002 + particle.phase) * 0.28;
        currentContext.beginPath();
        currentContext.arc(particle.x, particle.y, particle.radius * 2.35, 0, Math.PI * 2);
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

    return () => {
      window.removeEventListener("resize", resize);
      window.cancelAnimationFrame(animationFrame);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 h-full w-full opacity-60 mix-blend-screen"
    />
  );
}

function InterfaceThemeSelector({
  theme,
  visuals,
  onThemeChange,
}: Readonly<{
  theme: (typeof interfaceThemes)[number];
  visuals: (typeof themeVisuals)[InterfaceTheme];
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
        {theme.label}
        <ChevronDown className={cn("size-3 transition", open && "rotate-180")} aria-hidden="true" />
      </button>

      {open ? (
        <div
          role="menu"
          aria-label="Select interface theme"
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
                  {option.label}
                </span>
                <span className="block truncate text-[0.68rem] text-[#8d8780]">{option.title}</span>
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function AskAnythingChat() {
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
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Chat request failed.");
      }

      setMessages((current) => [
        ...current,
        { role: "assistant", content: data.message || "Tôi chưa nhận được nội dung phản hồi." },
      ]);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Chat request failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {open ? (
        <section
          aria-label="MrNine AI chat"
          className="fixed bottom-28 right-5 z-50 flex h-[min(36rem,calc(100vh-8rem))] w-[min(26rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border border-[#45a85d]/28 bg-[#080b08]/96 shadow-[0_24px_90px_rgba(0,0,0,0.58),0_0_44px_rgba(24,201,100,0.16)] backdrop-blur-xl"
        >
          <div className="flex items-center justify-between border-b border-white/10 bg-[#0b140d] px-4 py-3">
            <div>
              <div className="font-display text-lg font-black tracking-[-0.06em] text-[#f4eadc]">
                Mr<span className="text-[#18c964]">Nine</span> AI
              </div>
              <div className="font-mono text-[0.58rem] uppercase tracking-[0.22em] text-[#7f8c7d]">
                Ask anything / gpt-5.5
              </div>
            </div>
            <button
              type="button"
              aria-label="Close chat"
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
                className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-lg border px-3 py-2 text-sm leading-6",
                    message.role === "user"
                      ? "border-[#18c964]/35 bg-[#18c964]/14 text-[#edfff0]"
                      : "border-white/10 bg-white/[0.045] text-[#dfe8dc]",
                  )}
                >
                  {message.content}
                </div>
              </div>
            ))}
            {loading ? (
              <div className="flex items-center gap-2 font-mono text-[0.66rem] uppercase tracking-[0.18em] text-[#7f8c7d]">
                <LoaderCircle className="size-3.5 animate-spin text-[#18c964]" />
                Thinking
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
                placeholder="Ask MrNine anything..."
                className="max-h-28 min-h-9 flex-1 resize-none bg-transparent px-2 py-2 text-sm text-[#f4eadc] placeholder:text-[#6f776d] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => void sendMessage()}
                disabled={!input.trim() || loading}
                className="flex size-9 shrink-0 items-center justify-center rounded-md bg-[#18c964] text-[#061009] transition hover:bg-[#22dd73] disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#45a85d]/80"
                aria-label="Send message"
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
        className="ask-dock-wake group fixed bottom-14 right-5 z-40 flex h-12 items-center gap-3 overflow-hidden rounded-lg border border-[#45a85d]/35 bg-[#071109]/92 px-4 pr-5 font-mono text-[0.68rem] font-bold uppercase tracking-[0.12em] text-[#dff8e4] shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset,0_0_34px_rgba(24,201,100,0.16)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-[#45a85d]/70 hover:bg-[#0a1a0d] hover:text-[#f4fff6] hover:shadow-[0_0_0_1px_rgba(69,168,93,0.18)_inset,0_0_42px_rgba(24,201,100,0.24)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#45a85d]/80 lg:bottom-16"
      >
        <span className="pointer-events-none absolute inset-y-0 left-0 w-px bg-[#45a85d]/80 shadow-[0_0_18px_rgba(69,168,93,0.8)]" />
        <span className="flex size-7 items-center justify-center rounded-md border border-[#45a85d]/35 bg-[#18c964]/12 text-[#18c964] transition group-hover:border-[#45a85d]/70 group-hover:bg-[#18c964]/18">
          <Send className="ask-icon-wake size-3.5" />
        </span>
        <span>Ask anything</span>
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
  const [language, setLanguage] = useState<WebLanguage>("vi");
  const [interfaceTheme, setInterfaceTheme] = useState<InterfaceTheme>("auto");
  const [armingModule, setArmingModule] = useState("");
  const [commandInput, setCommandInput] = useState("");
  const heroRef = useRef<HTMLElement | null>(null);
  const activeTheme = interfaceThemes.find((theme) => theme.value === interfaceTheme) ?? interfaceThemes[0];
  const activeVisuals = themeVisuals[activeTheme.value];

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const saved = window.localStorage.getItem("mrnine-language");
      if (saved === "en" || saved === "vi") {
        setLanguage(saved);
      }

      const savedTheme = window.localStorage.getItem("mrnine-interface-theme");
      if (interfaceThemes.some((theme) => theme.value === savedTheme)) {
        setInterfaceTheme(savedTheme as InterfaceTheme);
      }
    }, 0);

    return () => window.clearTimeout(timeout);
  }, []);

  function updateLanguage(nextLanguage: WebLanguage) {
    setLanguage(nextLanguage);
    window.localStorage.setItem("mrnine-language", nextLanguage);
  }

  function updateInterfaceTheme(nextTheme: InterfaceTheme) {
    setInterfaceTheme(nextTheme);
    window.localStorage.setItem("mrnine-interface-theme", nextTheme);
  }

  function openModule(title: string) {
    const destinations: Record<string, string> = {
      "Story Forge": "/story-forge",
      "Voice Studio": "/voice-studio",
      "Vision Foundry": "/video-studio",
    };
    const isAiPlayground = title === "AI Playground";
    const destination = destinations[title];

    if (!isAiPlayground && !destination) {
      return;
    }

    if (armingModule) {
      return;
    }

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const delay = reduceMotion ? 0 : 240;
    setArmingModule(title);

    window.setTimeout(() => {
      if (isAiPlayground) {
        window.dispatchEvent(new CustomEvent("mrnine-open-chat"));
        setArmingModule("");
        return;
      }

      window.location.assign(destination);
    }, delay);
  }

  function submitCommand(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const prompt = commandInput.trim();

    window.dispatchEvent(new CustomEvent("mrnine-open-chat", { detail: { prompt } }));
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
    <main className="relative min-h-screen overflow-x-hidden transition-colors duration-300 lg:h-screen lg:overflow-hidden" style={activeVisuals.main}>
      <a href="#main-content" className="skip-link focus:left-4 focus:top-4">
        Skip to content
      </a>

      <div className="pointer-events-none absolute inset-0 transition-colors duration-300" style={activeVisuals.ambient} />
      <div className="pointer-events-none absolute inset-0 bg-[size:24px_24px] opacity-55 transition-colors duration-300" style={activeVisuals.grid} />

      <header className="relative z-30 flex h-14 items-center border-b px-4 transition-colors duration-300" style={activeVisuals.header}>
        <div className="flex w-[22rem] items-center gap-2">
          <div className="font-display text-2xl font-black tracking-[-0.08em] text-[#f4eadc]">
            Mr<span className="text-[#ef4444]">Nine</span>
          </div>
          <div className="font-mono text-[0.56rem] uppercase leading-3 tracking-[0.28em] text-[#7b7369]">
            <div>Future Domain</div>
            <div>2026 / Desktop</div>
          </div>
        </div>

        <div className="hidden flex-1 justify-center lg:flex">
          <div className="flex h-10 items-center gap-3 rounded-full border border-[#1f7d43]/45 bg-[#0b2114] px-4 shadow-[0_0_28px_rgba(34,197,94,0.12)]">
            <span className="flex size-7 items-center justify-center rounded-full bg-[conic-gradient(from_180deg,#ef4444,#45a85d,#47c9d9,#ef4444)]">
              <Sparkles className="size-4 text-[#070604]" />
            </span>
            <div className="font-mono text-[0.64rem] uppercase leading-3 tracking-[0.14em]">
              <div className="text-[#f4eadc]">009</div>
              <div className="text-[#8d8780]">mrnine.net</div>
            </div>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <div className="hidden rounded-full border border-white/10 bg-white/[0.03] p-0.5 font-mono text-[0.58rem] uppercase tracking-[0.16em] text-[#c4b9ad] md:flex">
            {languageOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                title={option.title}
                aria-pressed={language === option.value}
                onClick={() => updateLanguage(option.value)}
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
          <InterfaceThemeSelector theme={activeTheme} visuals={activeVisuals} onThemeChange={updateInterfaceTheme} />
          <BangkokClock />
          <Button variant="outline" className="h-9 border-[#ef4444]/40 px-5 font-mono text-[0.62rem] uppercase tracking-[0.24em]">
            Sign In
          </Button>
          <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
            <Menu className="size-4" />
          </Button>
        </div>
      </header>

      <div className="relative z-10 grid min-h-[calc(100vh-3.5rem)] grid-cols-1 lg:h-[calc(100vh-3.5rem)] lg:min-h-0 lg:grid-cols-[68px_minmax(0,1fr)]">
        <aside className="hidden border-r border-[#25211b] bg-[#090807]/76 lg:flex lg:flex-col">
          <div className="flex flex-1 flex-col items-center gap-2 pt-4">
            {railItems.map(({ label, icon: Icon, active }, index) => (
              <button
                key={label}
                type="button"
                aria-label={label}
                title={label}
                className={cn(
                  "group relative flex size-11 items-center justify-center rounded-lg text-[#817a71] transition hover:bg-white/[0.04] hover:text-[#f2e9dd]",
                  active && "rail-active-signal border border-[#f2e9dd]/64 bg-white/[0.12] text-[#f2e9dd]",
                )}
              >
                <Icon className="size-4" />
                <span className="absolute -bottom-2 font-mono text-[0.45rem] tracking-[0.18em] text-[#6e675f]">
                  {String(index + 1).padStart(2, "0")}
                </span>
              </button>
            ))}
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
            <div className="hero-numeral-scan absolute -right-1 top-4 z-[1] hidden text-[18vw] font-bold leading-[0.86] tracking-[0.015em] text-[#ef4444]/[0.045] xl:block">
              009
            </div>
            <div className="absolute inset-0 z-[1] bg-[radial-gradient(circle_at_24%_22%,rgba(69,168,93,0.12),transparent_16%),radial-gradient(circle_at_52%_18%,rgba(214,165,72,0.1),transparent_12%),radial-gradient(circle_at_72%_36%,rgba(239,68,68,0.1),transparent_14%)]" />
            <div className="relative z-[2] max-w-[88rem]">
              <div className="mb-6 font-mono text-[0.62rem] uppercase tracking-[0.28em] text-[#8f8579]">
                Home
              </div>
              <div className="mb-5 flex items-center gap-3 font-mono text-[0.64rem] uppercase tracking-[0.28em] text-[#ef4444]">
                <span className="size-1 rounded-full bg-[#ef4444]" />
                Online
                <span className="text-[#6f675e]">/</span>
                Exp 009
              </div>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              >
                <DailyTypeHeadline />
              </motion.div>

              <p className="mt-5 max-w-2xl text-sm leading-7 text-[#a79d91] sm:text-base">
                A personal AI control surface: writing, voice, image, video, documents, coding, and tools woven into one command center.
              </p>

              <form
                onSubmit={submitCommand}
                className="mt-7 flex max-w-3xl items-center gap-2 rounded-lg border border-[#2a251f] bg-[#0d0b08]/88 p-2 shadow-[0_0_0_1px_rgba(255,255,255,0.025)_inset,0_18px_70px_rgba(0,0,0,0.2)] backdrop-blur"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-md border border-[#ef4444]/28 bg-[#ef4444]/10 font-mono text-[#ef4444]">
                  &gt;_
                </span>
                <input
                  value={commandInput}
                  onChange={(event) => setCommandInput(event.target.value)}
                  placeholder="Ask MrNine to write, render, convert, debug..."
                  className="min-w-0 flex-1 bg-transparent px-1 text-sm text-[#f4eadc] outline-none placeholder:text-[#6f675e]"
                />
                <Button
                  type="submit"
                  className="h-9 rounded-md bg-[#ef4444] px-4 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-[#090807] hover:bg-[#ff5b55]"
                >
                  Run
                  <ArrowRight className="size-3.5" />
                </Button>
              </form>

              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="outline" className="h-10 rounded-md px-4 font-mono text-[0.65rem] uppercase tracking-[0.16em]">
                  Modules
                </Button>
                <Button variant="outline" className="h-10 rounded-md px-4 font-mono text-[0.65rem] uppercase tracking-[0.16em]">
                  To-do
                </Button>
              </div>
            </div>
          </section>

          <div className="relative flex h-8 shrink-0 items-center overflow-hidden border-b border-[#25211b] font-mono text-[0.62rem] uppercase tracking-[0.18em] text-[#d6a548]">
            <div className="flex min-w-max animate-[marquee_32s_linear_infinite] gap-8">
              {[...ticker, ...ticker].map((item, index) => (
                <span key={`${item}-${index}`} className="flex items-center gap-2">
                  <span
                    className={cn(
                      "ticker-dot-signal size-1.5 rounded-full",
                      index % 3 === 0 ? "bg-[#d6a548]" : index % 3 === 1 ? "bg-[#45a85d]" : "bg-[#ef4444]",
                    )}
                    style={{ animationDelay: `${(index % ticker.length) * 0.18}s` }}
                  />
                  {item}
                </span>
              ))}
            </div>
          </div>

          <section className="min-h-0 flex-1 py-5">
            <div className="mb-4 flex items-end justify-between">
              <div>
                <p className="font-mono text-[0.62rem] uppercase tracking-[0.28em] text-[#756d64]">Mission deck / 08</p>
                <h2 className="mt-1 text-xl font-bold tracking-[-0.04em] text-[#f4eadc]">Launch console</h2>
              </div>
              <div className="hidden items-center gap-2 font-mono text-[0.6rem] uppercase tracking-[0.2em] text-[#45a85d] md:flex">
                <span className="size-1.5 rounded-full bg-[#45a85d]" />
                All online
              </div>
            </div>

            <div className="grid grid-cols-[repeat(auto-fit,minmax(13.75rem,1fr))] gap-3 min-[1920px]:grid-cols-4">
              {moduleGroups.map((group) => (
                <div key={group.label} className="col-span-full mt-1 flex items-center gap-3 first:mt-0">
                  <span className="font-mono text-[0.58rem] uppercase tracking-[0.24em] text-[#d6a548]">{group.label}</span>
                  <span className="h-px flex-1 bg-gradient-to-r from-[#2a251f] to-transparent" />
                </div>
              ))}
            </div>

            <div className="mt-3 grid grid-cols-[repeat(auto-fit,minmax(13.75rem,1fr))] gap-3 min-[1920px]:grid-cols-4">
              {moduleGroups.flatMap((group) =>
                group.modules.map((module) => ({ ...module, group: group.label })),
              ).map((module, index) => {
                  const Icon = module.icon;
                  const accent = accentMap[module.accent as keyof typeof accentMap];

                  return (
                    <motion.button
                      key={module.title}
                      type="button"
                      onClick={() => openModule(module.title)}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.035, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                      className={cn(
                        "module-card-signal relative flex min-h-[9.25rem] overflow-hidden rounded-lg border border-[#2a251f] bg-[#14100d]/72 p-3.5 text-left transition hover:-translate-y-0.5 hover:border-[#ef4444]/28 hover:bg-[#18120f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ef4444]/70 min-[1920px]:min-h-[9.5rem]",
                        armingModule === module.title && "module-route-arming",
                        module.title !== "Story Forge" &&
                          module.title !== "Voice Studio" &&
                          module.title !== "AI Playground" &&
                          module.title !== "Vision Foundry" &&
                          "cursor-default",
                      )}
                    >
                      <div className="flex w-full flex-col">
                        <div className="mb-4 flex items-start justify-between">
                          <div className={cn("module-icon-signal flex size-8 items-center justify-center rounded-md border", accent.border, accent.bg)}>
                            <Icon className={cn("size-4", accent.text)} />
                          </div>
                          <div className="text-right">
                            <span className={cn("block font-mono text-[0.62rem] font-bold", accent.text)}>{module.number}</span>
                            <span className="mt-1 block font-mono text-[0.46rem] uppercase tracking-[0.14em] text-[#6f675e]">{module.group}</span>
                          </div>
                        </div>
                        <h3 className="truncate text-[0.9rem] font-bold leading-tight text-[#efe6dc]">{module.title}</h3>
                        <p className="mt-0.5 truncate text-[0.68rem] leading-5 text-[#8f8579]">{module.detail}</p>
                        <div className="mt-3 h-px w-full bg-gradient-to-r from-white/8 via-white/4 to-transparent" />
                        <div className="mt-auto flex items-center justify-between gap-2 pt-3 font-mono text-[0.5rem] uppercase tracking-[0.14em] text-[#82786e]">
                          <span className="truncate">{module.signal}</span>
                          <span className="flex items-center gap-1.5">
                            <span className={cn("size-1.5 rounded-full", accent.dot)} />
                            OK
                          </span>
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
            </div>
          </section>

          <footer className="flex h-10 shrink-0 items-center justify-between border-t border-[#25211b] font-mono text-[0.58rem] uppercase tracking-[0.22em] text-[#776f66]">
            <div>MrNine / 2026 / Exp 009</div>
            <div className="hidden sm:block">Build / 2026.05.17</div>
            <div className="flex items-center gap-1">
              {socialLinks.map((social) => (
                <SocialIconButton key={social.label} {...social} />
              ))}
            </div>
          </footer>
          </div>

          <aside className="hidden min-h-0 border-l border-[#25211b] py-5 2xl:flex 2xl:flex-col">
            <div className="mb-4 px-4">
              <p className="font-mono text-[0.58rem] uppercase tracking-[0.24em] text-[#756d64]">System panel</p>
              <h2 className="mt-1 text-lg font-bold tracking-[-0.04em] text-[#f4eadc]">Context</h2>
            </div>

            <div className="space-y-3 px-4">
              {systemPanelItems.map((item) => (
                <div key={item.label} className="rounded-lg border border-[#2a251f] bg-[#100d0a]/76 px-3 py-3">
                  <div className="font-mono text-[0.5rem] uppercase tracking-[0.18em] text-[#756d64]">{item.label}</div>
                  <div className={cn("mt-1 text-sm font-bold", item.tone)}>{item.value}</div>
                </div>
              ))}
            </div>

            <div className="mt-6 px-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="font-mono text-[0.58rem] uppercase tracking-[0.22em] text-[#d6a548]">Recent output</p>
                <span className="size-1.5 rounded-full bg-[#45a85d] shadow-[0_0_12px_rgba(69,168,93,0.72)]" />
              </div>
              <div className="space-y-2">
                {recentOutputs.map((output) => (
                  <div key={output.title} className="rounded-md border border-white/8 bg-white/[0.03] px-3 py-2">
                    <div className="truncate text-xs font-bold text-[#e8dfd4]">{output.title}</div>
                    <div className="mt-1 truncate font-mono text-[0.5rem] uppercase tracking-[0.14em] text-[#756d64]">{output.meta}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-auto px-4">
              <div className="rounded-lg border border-[#45a85d]/18 bg-[#071109]/72 p-3">
                <div className="flex items-center gap-2 font-mono text-[0.54rem] uppercase tracking-[0.18em] text-[#45a85d]">
                  <span className="size-1.5 rounded-full bg-[#45a85d]" />
                  Queue clear
                </div>
                <p className="mt-2 text-xs leading-5 text-[#8f8579]">Ready for command input, module launch, or project routing.</p>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <AskAnythingChat />
    </main>
  );
}

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
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useRouter } from "next/navigation";
import { signIn, signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { languageOptions as appLanguageOptions, useLanguage, type WebLanguage } from "@/components/LanguageProvider";
import { cn } from "@/lib/utils";

type InterfaceTheme = "auto" | "crimson" | "signal" | "gold" | "frost";
type AskMessage = {
  role: "user" | "assistant";
  content: string;
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
    detail: "Image and video / FAL.AI",
    summary: "Tạo ảnh và video bằng các model mới nhất của FAL.AI ngay trên một bề mặt.",
    signal: "FAL queue",
    action: "Open playground",
    icon: Sparkles,
    accent: "red",
    shortcut: "1",
    lastUsed: "ready",
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
    shortcut: "2",
    lastUsed: "1 hr",
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
    shortcut: "3",
    lastUsed: "yesterday",
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
    shortcut: "4",
    lastUsed: "3 days",
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
    shortcut: "5",
    lastUsed: "—",
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
    shortcut: "6",
    lastUsed: "—",
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
    shortcut: "7",
    lastUsed: "—",
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
    shortcut: "8",
    lastUsed: "—",
  },
];

type ModuleCard = (typeof modules)[number];

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
    "Story outline": { title: "Dàn ý truyện", meta: "Story Forge / đã lưu" },
    "Voice draft": { title: "Bản nháp giọng", meta: "Voice Studio / trong hàng đợi" },
    "Prompt map": { title: "Bản đồ prompt", meta: "Command / 2 phút trước" },
  },
} satisfies Record<WebLanguage, Record<string, Partial<(typeof recentOutputs)[number]>>>;

const quickCommands = [
  { command: "/story", label: "Story", hint: "plot + chapter", module: "Story Forge" },
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
    commandPlaceholder: "Ask MrNine to write, render, convert, debug...",
    mobileCommandPlaceholder: "Ask MrNine...",
    run: "Run",
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
    commandPlaceholder: "Yêu cầu MrNine viết, dựng, chuyển đổi, debug...",
    mobileCommandPlaceholder: "Hỏi MrNine...",
    run: "Chạy",
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
      detail: "Tạo ảnh và video / FAL.AI",
      summary: "Tạo ảnh và video bằng các model mới nhất của FAL.AI trong cùng một bề mặt.",
      signal: "Hàng đợi FAL",
      action: "Mở playground",
    },
    "Story Forge": {
      title: "Story Forge",
      detail: "Cốt truyện, bản nháp, chương",
      summary: "Studio viết dài với cốt truyện, dàn ý, chương và bộ nhớ dự án.",
      signal: "Máy viết truyện",
      action: "Mở viết truyện",
    },
    "Voice Studio": {
      title: "Voice Studio",
      detail: "Thuyết minh, TTS",
      summary: "Không gian nhân bản giọng nói và thuyết minh dùng OmniVoice runtime.",
      signal: "Hàng đợi giọng",
      action: "Mở giọng nói",
    },
    "Vision Foundry": {
      title: "Vision Foundry",
      detail: "Hình ảnh và video",
      summary: "Luồng tạo hình ảnh và thử nghiệm pipeline video.",
      signal: "Đường dựng hình",
      action: "Mở hình ảnh",
    },
    "Document Core": {
      title: "Document Core",
      detail: "PDF, Word, slide",
      summary: "Chuyển đổi, tóm tắt, trích xuất và xử lý tài liệu văn phòng.",
      signal: "Tác vụ file",
      action: "Sắp ra mắt",
    },
    "Code Lab": {
      title: "Code Lab",
      detail: "Build và debug",
      summary: "Không gian trợ lý code cho sửa lỗi, scaffold, review và deploy.",
      signal: "Luồng dev",
      action: "Sắp ra mắt",
    },
    "Business Ops": {
      title: "Business Ops",
      detail: "Email, quảng cáo, kế hoạch",
      summary: "AI vận hành cho email, quảng cáo, lập kế hoạch, chiến dịch và công việc hằng ngày.",
      signal: "Bàn vận hành",
      action: "Sắp ra mắt",
    },
    "To-Do List": {
      title: "To-Do List",
      detail: "Ưu tiên, lịch sử",
      summary: "Bảng ưu tiên cá nhân kết nối với lịch sử lệnh và kết quả đã lưu.",
      signal: "Luồng công việc",
      action: "Sắp ra mắt",
    },
  },
} satisfies Record<WebLanguage, Record<string, Partial<ModuleCard>>>;

const quickCommandCopy = {
  en: Object.fromEntries(quickCommands.map((command) => [command.command, command])),
  vi: {
    "/story": { label: "Truyện", hint: "cốt truyện + chương", module: "Story Forge" },
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
  },
  vi: {
    auto: { label: "Auto", title: "Bề mặt điều khiển cân bằng" },
    crimson: { label: "Đỏ", title: "Giao diện terminal đỏ" },
    signal: { label: "Tín hiệu", title: "Giao diện vận hành xanh" },
    gold: { label: "Vàng", title: "Giao diện thị trường amber" },
    frost: { label: "Băng", title: "Giao diện visual engine lạnh" },
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
];

const dailyHeadlinesByLanguage = {
  en: dailyHeadlines,
  vi: dailyHeadlinesVi,
} satisfies Record<WebLanguage, string[]>;

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

function getRandomHeadline(language: WebLanguage, previous?: string) {
  const source = dailyHeadlinesByLanguage[language];

  if (source.length === 1) {
    return source[0];
  }

  let next = source[Math.floor(Math.random() * source.length)];

  while (next === previous) {
    next = source[Math.floor(Math.random() * source.length)];
  }

  return next;
}

function DailyTypeHeadline({ language }: Readonly<{ language: WebLanguage }>) {
  const [headline, setHeadline] = useState(dailyHeadlinesByLanguage[language][0]);
  const [typedCount, setTypedCount] = useState(0);
  const characters = useMemo(() => Array.from(headline), [headline]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setHeadline((previous) => getRandomHeadline(language, previous));
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [language]);

  useEffect(() => {
    if (typedCount > characters.length) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setTypedCount((current) => {
        if (current >= characters.length) {
          setHeadline((previous) => getRandomHeadline(language, previous));
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

function BangkokClock({ copy }: Readonly<{ copy: (typeof homeCopy)[WebLanguage] }>) {
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
      aria-label={`${copy.bangkokAria}: ${time || "loading"}`}
      className="hidden min-w-[8.25rem] rounded-full border border-[#d6a548]/24 bg-[#201707] px-3 py-1.5 font-mono text-[0.78rem] font-bold tabular-nums text-[#e4c56b] xl:block"
      suppressHydrationWarning
    >
      {time || "--:--:--"} <span className="ml-2 text-[0.55rem] text-[#7b7369]">{copy.bangkok}</span>
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
            <button
              type="button"
              role="menuitem"
              onClick={() => void signOut()}
              className="mt-2 flex w-full items-center justify-between rounded-lg border border-transparent px-3 py-2 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-[#ffb4ad] transition hover:border-[#ef4444]/24 hover:bg-[#ef4444]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ef4444]/70"
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

function AskAnythingChat({ language }: Readonly<{ language: WebLanguage }>) {
  const copy = chatCopy[language];
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [scrolledPastHero, setScrolledPastHero] = useState(false);
  const [messages, setMessages] = useState<AskMessage[]>([
    {
      role: "assistant",
      content: "Tôi là MrNine AI. Bạn muốn viết, tạo ảnh, dựng video, xử lý tài liệu hay hỏi nhanh điều gì?",
    },
  ]);

  useEffect(() => {
    function handleScroll() {
      setScrolledPastHero(window.scrollY > 320);
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || copy.failed);
      }

      setMessages((current) => [
        ...current,
        { role: "assistant", content: data.message || "Tôi chưa nhận được nội dung phản hồi." },
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
          className="fixed bottom-28 right-5 z-50 flex h-[min(36rem,calc(100vh-8rem))] w-[min(26rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border border-[#45a85d]/28 bg-[#080b08]/96 shadow-[0_24px_90px_rgba(0,0,0,0.58),0_0_44px_rgba(24,201,100,0.16)] backdrop-blur-xl"
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
        aria-hidden={!scrolledPastHero && !open}
        tabIndex={scrolledPastHero || open ? 0 : -1}
        className={cn(
          "ask-dock-wake group fixed bottom-14 right-5 z-40 hidden h-12 items-center gap-3 overflow-hidden rounded-lg border border-[#45a85d]/35 bg-[#071109]/92 px-4 pr-5 font-mono text-[0.68rem] font-bold uppercase tracking-[0.12em] text-[#dff8e4] shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset,0_0_34px_rgba(24,201,100,0.16)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-[#45a85d]/70 hover:bg-[#0a1a0d] hover:text-[#f4fff6] hover:shadow-[0_0_0_1px_rgba(69,168,93,0.18)_inset,0_0_42px_rgba(24,201,100,0.24)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#45a85d]/80 sm:flex lg:bottom-16",
          scrolledPastHero ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 translate-y-4 pointer-events-none",
        )}
      >
        <span className="pointer-events-none absolute inset-y-0 left-0 w-px bg-[#45a85d]/80 shadow-[0_0_18px_rgba(69,168,93,0.8)]" />
        <span className="flex size-7 items-center justify-center rounded-md border border-[#45a85d]/35 bg-[#18c964]/12 text-[#18c964] transition group-hover:border-[#45a85d]/70 group-hover:bg-[#18c964]/18">
          <Send className="ask-icon-wake size-3.5" />
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
  const shouldReduceMotion = useReducedMotion();
  const { language, setLanguage } = useLanguage();
  const [interfaceTheme, setInterfaceTheme] = useState<InterfaceTheme>("auto");
  const [armingModule, setArmingModule] = useState("");
  const [commandInput, setCommandInput] = useState("");
  const [commandFocused, setCommandFocused] = useState(false);
  const [previewModule, setPreviewModule] = useState<ModuleCard | null>(null);
  const heroRef = useRef<HTMLElement | null>(null);
  const commandInputRef = useRef<HTMLInputElement | null>(null);
  const activeTheme = interfaceThemes.find((theme) => theme.value === interfaceTheme) ?? interfaceThemes[0];
  const activeVisuals = themeVisuals[activeTheme.value];
  const commandMode = quickCommands.find((item) => commandInput.trimStart().startsWith(item.command));
  const slashMode = commandInput.trimStart().startsWith("/");
  const PreviewIcon = previewModule?.icon;
  const copy = homeCopy[language];

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
    window.requestAnimationFrame(() => commandInputRef.current?.focus());
  }

  function openModule(title: string) {
    const destinations: Record<string, string> = {
      "AI Playground": "/ai-playground",
      "Story Forge": "/story-forge",
      "Voice Studio": "/voice-studio",
      "Vision Foundry": "/video-studio",
    };
    const destination = destinations[title];

    if (!destination) {
      return;
    }

    if (armingModule) {
      return;
    }

    const delay = shouldReduceMotion ? 0 : 320;
    setArmingModule(title);

    window.setTimeout(() => {
      router.push(destination);
    }, delay);
  }

  function submitCommand(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const prompt = commandInput.trim();

    window.dispatchEvent(new CustomEvent("mrnine-open-chat", { detail: { prompt } }));
    setCommandFocused(false);
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
    <main className="relative min-h-screen overflow-x-hidden pb-20 transition-colors duration-300 sm:pb-0 lg:h-screen lg:overflow-hidden" style={activeVisuals.main}>
      <a href="#main-content" className="skip-link focus:left-4 focus:top-4">
        {copy.skip}
      </a>

      <div className="pointer-events-none absolute inset-0 transition-colors duration-300" style={activeVisuals.ambient} />
      <div className="pointer-events-none absolute inset-0 bg-[size:24px_24px] opacity-55 transition-colors duration-300" style={activeVisuals.grid} />
      <div className="blueprint-layer pointer-events-none absolute inset-0" aria-hidden="true" />

      <header className="relative z-30 flex h-14 items-center border-b px-4 transition-colors duration-300" style={activeVisuals.header}>
        <div className="flex items-center gap-2">
          <div className="font-display text-2xl font-black tracking-[-0.08em] text-[#f4eadc]">
            Mr<span className="text-[#ef4444]">Nine</span>
          </div>
          <div className="hidden font-mono text-[0.52rem] uppercase leading-3 tracking-[0.24em] text-[#9a9087] xl:block">
            <div>{copy.futureDomain}</div>
            <div>{copy.desktop}</div>
          </div>
        </div>

        <div className="hidden flex-1 justify-center xl:flex">
          <div className="flex h-9 items-center gap-2.5 rounded-full border border-[#1f7d43]/35 bg-[#0b2114]/72 px-3.5 shadow-[0_0_22px_rgba(34,197,94,0.08)]">
            <span className="flex size-6 items-center justify-center rounded-full bg-[conic-gradient(from_180deg,#ef4444,#45a85d,#47c9d9,#ef4444)]">
              <Sparkles className="size-3 text-[#070604]" />
            </span>
            <div className="font-mono text-[0.6rem] uppercase leading-3 tracking-[0.14em]">
              <div className="text-[#f4eadc]">009</div>
              <div className="text-[#9a9087]">mrnine.net</div>
            </div>
          </div>
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
                <span className="absolute -bottom-2 font-mono text-[0.45rem] tracking-[0.18em] text-[#6e675f] opacity-55 transition group-hover:opacity-100">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="pointer-events-none absolute left-[calc(100%+0.75rem)] top-1/2 z-40 -translate-y-1/2 rounded-md border border-[#2a251f] bg-[#0b0907]/95 px-2.5 py-1.5 font-mono text-[0.55rem] uppercase tracking-[0.16em] text-[#d8cfc4] opacity-0 shadow-[0_12px_34px_rgba(0,0,0,0.32)] transition group-hover:translate-x-0.5 group-hover:opacity-100">
                  {label}
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
                <DailyTypeHeadline key={language} language={language} />
              </motion.div>

              <p className="mt-5 max-w-2xl text-sm leading-7 text-[#c4b9ad] sm:text-base">
                {copy.heroDescription}
              </p>

              <form
                onSubmit={submitCommand}
                className={cn(
                  "command-control-line mt-7 max-w-3xl rounded-xl border-2 bg-[#0d0b08]/92 p-2.5 shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset,0_24px_80px_rgba(239,68,68,0.08),0_18px_70px_rgba(0,0,0,0.32)] backdrop-blur transition",
                  commandFocused ? "border-[#ef4444]/72 bg-[#120c09]/96 shadow-[0_0_0_1px_rgba(239,68,68,0.2)_inset,0_28px_92px_rgba(239,68,68,0.18),0_22px_82px_rgba(0,0,0,0.4)]" : "border-[#3a322a]",
                )}
              >
                <div className="flex items-center gap-2.5">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-md border border-[#ef4444]/35 bg-[#ef4444]/14 font-mono text-base text-[#ef4444]">
                    &gt;_
                  </span>
                  <input
                    ref={commandInputRef}
                    value={commandInput}
                    onFocus={() => setCommandFocused(true)}
                    onBlur={() => setCommandFocused(false)}
                    onChange={(event) => setCommandInput(event.target.value)}
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
                  {commandMode ? (
                    <span className="ml-auto hidden items-center gap-1.5 font-mono text-[0.52rem] uppercase tracking-[0.16em] text-[#45a85d] md:flex">
                      <span className="size-1.5 rounded-full bg-[#45a85d]" />
                      {quickCommandCopy[language][commandMode.command as keyof typeof quickCommandCopy.vi]?.module ?? commandMode.module}
                    </span>
                  ) : null}
                </div>
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
              {[...ticker, ...ticker].map((item, index) => (
                <span key={`${item}-${index}`} className="flex items-center gap-2">
                  <span
                    className={cn(
                      "ticker-dot-signal size-1 rounded-full",
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
                <p className="font-mono text-[0.58rem] uppercase tracking-[0.24em] text-[#9a9087]">{copy.missionDeck}</p>
                <h2 className="mt-1 text-base font-bold tracking-[-0.03em] text-[#d8cfc4]">{copy.launchConsole}</h2>
              </div>
              <div className="hidden items-center gap-2 font-mono text-[0.56rem] uppercase tracking-[0.2em] text-[#7dd391] md:flex">
                <span className="size-1 rounded-full bg-[#45a85d]" />
                {copy.allOnline}
              </div>
            </div>

            <div className="grid grid-cols-[repeat(auto-fit,minmax(13.75rem,1fr))] gap-3 min-[1920px]:grid-cols-4">
              {moduleGroups.map((group) => (
                <div key={group.label} className="col-span-full mt-1 flex items-center gap-3 first:mt-0">
                  <span className="font-mono text-[0.58rem] uppercase tracking-[0.24em] text-[#d6a548]">{group.label === "Create" ? copy.create : copy.tools}</span>
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
                  const localizedModule = moduleCopy[language][module.title as keyof typeof moduleCopy.vi] ?? module;
                  const moduleIsArming = armingModule === module.title;
                  const moduleIsDimmed = Boolean(armingModule) && !moduleIsArming;

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
                        "module-card-signal group relative flex min-h-[9.25rem] overflow-hidden rounded-lg border border-[#2a251f] bg-[#14100d]/72 p-3.5 text-left transition-all duration-200 hover:-translate-y-1 hover:border-[#ef4444]/45 hover:bg-[#1c1612] hover:shadow-[0_12px_40px_rgba(239,68,68,0.12),0_0_0_1px_rgba(239,68,68,0.08)_inset] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ef4444]/70 min-[1920px]:min-h-[9.5rem]",
                        moduleIsArming && "module-route-arming",
                        moduleIsDimmed && "pointer-events-none blur-[0.4px]",
                        module.title !== "Story Forge" &&
                          module.title !== "Voice Studio" &&
                          module.title !== "AI Playground" &&
                          module.title !== "Vision Foundry" &&
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
                            <span className="font-mono text-[0.46rem] uppercase tracking-[0.14em] text-[#6f675e]">{module.group === "Create" ? copy.create : copy.tools}</span>
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
                        <span>{module.action === "Coming soon" ? copy.runtimeRequired : localizedModule.action ?? module.action}</span>
                        <ArrowRight className={cn("size-3", accent.text)} />
                      </div>
                    </motion.button>
                  );
                })}
            </div>
          </section>

          <div className="recent-output-dock mb-3 hidden shrink-0 items-center gap-2 overflow-hidden rounded-lg border border-[#2a251f] bg-[#0c0a08]/82 px-3 py-2 md:flex 2xl:hidden">
            <div className="mr-2 shrink-0 font-mono text-[0.55rem] uppercase tracking-[0.2em] text-[#d6a548]">{copy.outputDock}</div>
            {recentOutputs.map((output) => (
              <button
                key={output.title}
                type="button"
                className="min-w-0 flex-1 rounded-md border border-white/7 bg-white/[0.025] px-3 py-2 text-left transition hover:border-[#45a85d]/24 hover:bg-[#45a85d]/[0.045] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#45a85d]/70"
              >
                <div className="truncate text-xs font-bold text-[#efe6dc]">{recentOutputCopy[language][output.title as keyof typeof recentOutputCopy.vi]?.title ?? output.title}</div>
                <div className="mt-0.5 truncate font-mono text-[0.48rem] uppercase tracking-[0.14em] text-[#756d64]">{recentOutputCopy[language][output.title as keyof typeof recentOutputCopy.vi]?.meta ?? output.meta}</div>
              </button>
            ))}
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
                    {recentOutputs.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-[#2a251f] bg-[#100d0a]/40 px-3 py-6 text-center">
                        <p className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[#9a9087]">{copy.queueClear}</p>
                        <p className="mt-2 text-xs leading-5 text-[#b5ab9f]">{copy.queueBody}</p>
                      </div>
                    ) : (
                      recentOutputs.map((output) => (
                        <button
                          key={output.title}
                          type="button"
                          className="group flex w-full items-center justify-between gap-3 rounded-lg border border-[#2a251f] bg-[#100d0a]/76 px-3 py-3 text-left transition hover:-translate-y-0.5 hover:border-[#45a85d]/35 hover:bg-[#0e1a11] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#45a85d]/70"
                          aria-label={`${recentOutputCopy[language][output.title as keyof typeof recentOutputCopy.vi]?.title ?? output.title} — ${recentOutputCopy[language][output.title as keyof typeof recentOutputCopy.vi]?.meta ?? output.meta}`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-bold text-[#f4eadc]">{recentOutputCopy[language][output.title as keyof typeof recentOutputCopy.vi]?.title ?? output.title}</div>
                            <div className="mt-1 truncate font-mono text-[0.52rem] uppercase tracking-[0.16em] text-[#9a9087]">{recentOutputCopy[language][output.title as keyof typeof recentOutputCopy.vi]?.meta ?? output.meta}</div>
                          </div>
                          <ArrowRight className="size-3.5 shrink-0 text-[#9a9087] opacity-0 transition group-hover:translate-x-0.5 group-hover:text-[#45a85d] group-hover:opacity-100" />
                        </button>
                      ))
                    )}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            <div className="mt-auto mb-32 px-4">
              <div className="rounded-lg border border-[#45a85d]/18 bg-[#071109]/72 p-3">
                <div className="flex items-center gap-2 font-mono text-[0.54rem] uppercase tracking-[0.18em] text-[#7dd391]">
                  <span className="size-1.5 rounded-full bg-[#45a85d]" />
                  {copy.queueClear}
                </div>
                <p className="mt-2 text-xs leading-5 text-[#b5ab9f]">{copy.queueBody}</p>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <form
        onSubmit={submitCommand}
        className="fixed inset-x-3 bottom-3 z-40 flex items-center gap-2 rounded-lg border border-[#45a85d]/24 bg-[#070907]/94 p-2 shadow-[0_18px_58px_rgba(0,0,0,0.55),0_0_32px_rgba(69,168,93,0.12)] backdrop-blur-xl sm:hidden"
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md border border-[#45a85d]/30 bg-[#45a85d]/10 text-[#45a85d]">
          <Send className="size-4" />
        </span>
        <input
          value={commandInput}
          onFocus={() => setCommandFocused(true)}
          onBlur={() => setCommandFocused(false)}
          onChange={(event) => setCommandInput(event.target.value)}
          placeholder={copy.mobileCommandPlaceholder}
          className="min-w-0 flex-1 bg-transparent text-sm text-[#f4eadc] outline-none placeholder:text-[#6f776d]"
        />
        <Button type="submit" size="icon" className="size-9 rounded-md bg-[#45a85d] text-[#061009] hover:bg-[#58c772]" aria-label={copy.mobileRun}>
          <ArrowRight className="size-4" />
        </Button>
      </form>

      <AskAnythingChat key={language} language={language} />
    </main>
  );
}

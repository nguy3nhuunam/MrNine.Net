"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Copy,
  FileSearch,
  FileText,
  Globe,
  LoaderCircle,
  Send,
  Sparkles,
  Trash2,
  TriangleAlert,
  Type,
  Upload,
  Video,
  Wand2,
  X,
} from "lucide-react";
import { languageOptions, useLanguage, type WebLanguage } from "@/components/LanguageProvider";
import { cn } from "@/lib/utils";
import { safeParseJson } from "@/lib/fetch-json";

type SourceMode = "auto" | "youtube" | "url" | "pdf" | "text";

type Status =
  | { kind: "idle" }
  | { kind: "extracting" }
  | { kind: "summarizing" }
  | { kind: "error"; message: string };

type RecapEntry = {
  id: string;
  summary: string;
  sourceLabel?: string;
  sourceTitle?: string;
  truncated?: boolean;
  preview: string;
  createdAt: number;
};

const MODES: ReadonlyArray<{
  id: SourceMode;
  labelVi: string;
  labelEn: string;
  icon: typeof Wand2;
}> = [
  { id: "auto", labelVi: "Auto", labelEn: "Auto", icon: Wand2 },
  { id: "youtube", labelVi: "YouTube", labelEn: "YouTube", icon: Video },
  { id: "url", labelVi: "Trang web", labelEn: "Web page", icon: Globe },
  { id: "pdf", labelVi: "PDF", labelEn: "PDF", icon: FileText },
  { id: "text", labelVi: "Văn bản", labelEn: "Text", icon: Type },
];

const recapCopy = {
  vi: {
    back: "Quay lại trang chủ",
    title: "Smart Recap",
    subtitle: "Paste link YouTube, link bài web, upload PDF dài hoặc văn bản — nhận tóm tắt 1 phút.",
    inputLabel: "Nội dung",
    inputPlaceholder: "Dán link YouTube, link bài web, hoặc paste văn bản dài tại đây...",
    pdfUpload: "Upload PDF",
    pdfHint: "PDF text-based, tối đa ~2MB",
    needInput: "Cần nhập nội dung hoặc URL",
    submit: "Tóm tắt",
    runShortcut: "Ctrl + Enter để chạy",
    statusIdle: "Sẵn sàng",
    statusExtracting: "Đang trích xuất",
    statusSummarizing: "Đang tóm tắt",
    statusError: "Có lỗi",
    sourceText: "Văn bản",
    sourceUrl: "Trang web",
    sourceYouTube: "YouTube",
    truncatedNote: "Nội dung quá dài đã bị cắt còn 40 000 ký tự",
    copy: "Sao chép",
    copied: "Đã chép",
    empty: "Chưa có tóm tắt. Paste link hoặc nội dung rồi bấm Tóm tắt.",
    pdfFailed: "Không đọc được PDF",
    pdfTextEmpty: "PDF không có text trích xuất được (có thể là ảnh scan)",
    historyTitle: "Lịch sử",
    historyEmpty: "Lịch sử trống. Mỗi recap sẽ lưu tại đây.",
    historyClear: "Xoá lịch sử",
  },
  en: {
    back: "Back to home",
    title: "Smart Recap",
    subtitle: "Paste a YouTube link, web URL, upload a long PDF or text — get a 1-minute recap.",
    inputLabel: "Input",
    inputPlaceholder: "Paste a YouTube link, a web URL, or long text here...",
    pdfUpload: "Upload PDF",
    pdfHint: "Text-based PDF, max ~2MB",
    needInput: "Input is required",
    submit: "Summarize",
    runShortcut: "Press Ctrl + Enter to run",
    statusIdle: "Ready",
    statusExtracting: "Extracting",
    statusSummarizing: "Summarizing",
    statusError: "Error",
    sourceText: "Text",
    sourceUrl: "Web page",
    sourceYouTube: "YouTube",
    truncatedNote: "Content too long; truncated at 40k characters",
    copy: "Copy",
    copied: "Copied",
    empty: "No summary yet. Paste a link or text and press Summarize.",
    pdfFailed: "Failed to read PDF",
    pdfTextEmpty: "PDF has no extractable text (may be a scanned image)",
    historyTitle: "History",
    historyEmpty: "History is empty. Each recap is saved here.",
    historyClear: "Clear history",
  },
} satisfies Record<WebLanguage, Record<string, string>>;

const STORAGE_KEY = "mrnine-smartrecap-history";

function renderMarkdown(md: string): string {
  const escape = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const lines = md.split("\n");
  const out: string[] = [];
  let inList = false;
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line.startsWith("## ")) {
      if (inList) {
        out.push("</ul>");
        inList = false;
      }
      out.push(
        `<h3 class="mt-5 first:mt-0 font-mono text-[0.66rem] uppercase tracking-[0.22em] text-[#d6a548]">${escape(line.slice(3))}</h3>`,
      );
    } else if (line.startsWith("# ")) {
      if (inList) {
        out.push("</ul>");
        inList = false;
      }
      out.push(
        `<h2 class="mt-6 first:mt-0 text-lg font-bold tracking-[-0.02em] text-[#f4eadc]">${escape(line.slice(2))}</h2>`,
      );
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      if (!inList) {
        out.push('<ul class="mt-2 space-y-1.5 text-[0.86rem] leading-6 text-[#d8cfc4]">');
        inList = true;
      }
      out.push(
        `<li class="flex gap-2"><span class="mt-2 size-1 shrink-0 rounded-full bg-[#45a85d]"></span><span>${escape(line.slice(2))}</span></li>`,
      );
    } else if (line === "") {
      if (inList) {
        out.push("</ul>");
        inList = false;
      }
    } else {
      if (inList) {
        out.push("</ul>");
        inList = false;
      }
      out.push(`<p class="mt-2 text-[0.86rem] leading-6 text-[#d8cfc4]">${escape(line)}</p>`);
    }
  }
  if (inList) out.push("</ul>");
  return out.join("\n");
}

async function extractPdfText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  const text = new TextDecoder("latin1").decode(bytes);
  const out: string[] = [];
  const blockRe = /BT([\s\S]*?)ET/g;
  let block: RegExpExecArray | null;
  while ((block = blockRe.exec(text)) !== null) {
    const body = block[1];
    const tjRe = /\(((?:\\\)|\\\(|\\\\|[^()])*)\)\s*Tj/g;
    let m: RegExpExecArray | null;
    while ((m = tjRe.exec(body)) !== null) {
      out.push(m[1]);
    }
    const arrRe = /\[([^\]]*)\]\s*TJ/g;
    while ((m = arrRe.exec(body)) !== null) {
      const inside = m[1];
      const partRe = /\(((?:\\\)|\\\(|\\\\|[^()])*)\)/g;
      let p: RegExpExecArray | null;
      while ((p = partRe.exec(inside)) !== null) {
        out.push(p[1]);
      }
    }
  }
  return out
    .map((chunk) =>
      chunk
        .replace(/\\n/g, "\n")
        .replace(/\\r/g, " ")
        .replace(/\\t/g, " ")
        .replace(/\\\(/g, "(")
        .replace(/\\\)/g, ")")
        .replace(/\\\\/g, "\\")
        .replace(/\\([0-7]{1,3})/g, (_, oct: string) => String.fromCharCode(parseInt(oct, 8))),
    )
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

export function SmartRecapShell() {
  const { language, setLanguage } = useLanguage();
  const copy = recapCopy[language];

  const [mode, setMode] = useState<SourceMode>("auto");
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const [results, setResults] = useState<RecapEntry[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as RecapEntry[];
      return Array.isArray(parsed)
        ? parsed
            .filter((item) => item && typeof item.summary === "string" && typeof item.id === "string")
            .slice(0, 40)
        : [];
    } catch {
      return [];
    }
  });
  const [activeId, setActiveId] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return "";
      const parsed = JSON.parse(raw) as RecapEntry[];
      return Array.isArray(parsed) && parsed[0]?.id ? parsed[0].id : "";
    } catch {
      return "";
    }
  });

  const activeResult = activeId ? results.find((item) => item.id === activeId) ?? results[0] : results[0];

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(results.slice(0, 40)));
    } catch {
      // ignore
    }
  }, [results]);

  function clearHistory() {
    setResults([]);
    setActiveId("");
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }

  async function handlePdf(file: File) {
    setStatus({ kind: "extracting" });
    try {
      const text = await extractPdfText(file);
      if (!text) {
        setStatus({ kind: "error", message: copy.pdfTextEmpty });
        return;
      }
      setInput(text);
      setMode("text");
      setStatus({ kind: "idle" });
    } catch (error) {
      setStatus({ kind: "error", message: error instanceof Error ? error.message : copy.pdfFailed });
    }
  }

  async function submit() {
    const trimmed = input.trim();
    if (!trimmed) {
      setStatus({ kind: "error", message: copy.needInput });
      return;
    }
    setStatus({ kind: "summarizing" });
    try {
      const res = await fetch("/api/smart-recap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: trimmed, language }),
      });
      const json = await safeParseJson(res);
      if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);

      const entry: RecapEntry = {
        id: `${Date.now()}`,
        summary: String(json.summary ?? ""),
        sourceLabel: typeof json.sourceLabel === "string" ? json.sourceLabel : undefined,
        sourceTitle: typeof json.sourceTitle === "string" ? json.sourceTitle : undefined,
        truncated: Boolean(json.truncated),
        preview: trimmed.slice(0, 140),
        createdAt: Date.now(),
      };
      setResults((current) => [entry, ...current].slice(0, 40));
      setActiveId(entry.id);
      setStatus({ kind: "idle" });
    } catch (error) {
      setStatus({ kind: "error", message: error instanceof Error ? error.message : copy.statusError });
    }
  }

  function handleKey(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      void submit();
    }
  }

  function copySummary() {
    if (!activeResult) return;
    void navigator.clipboard.writeText(activeResult.summary);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  const isWorking = status.kind === "extracting" || status.kind === "summarizing";

  function modeLabel(m: string | undefined): string {
    if (m === "youtube") return copy.sourceYouTube;
    if (m === "url") return copy.sourceUrl;
    return copy.sourceText;
  }

  return (
    <main className="relative flex h-screen flex-col overflow-hidden bg-[#0b0a08] text-[#e8dfd4]">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 16% 10%, rgba(69,168,93,0.16), transparent 28%), radial-gradient(circle at 78% 12%, rgba(214,165,72,0.1), transparent 24%), linear-gradient(180deg,#0d0c0a 0%,#070604 100%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[size:24px_24px] opacity-50"
        style={{
          backgroundImage:
            "linear-gradient(rgba(94,86,75,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(94,86,75,0.055) 1px, transparent 1px)",
        }}
      />

      <header className="relative z-20 flex h-14 shrink-0 items-center gap-3 border-b border-[#25211b] bg-[#0a0907]/92 px-3 backdrop-blur md:px-5">
        <Link
          href="/"
          aria-label={copy.back}
          className="flex size-9 items-center justify-center rounded-md border border-white/10 text-[#a79d91] transition hover:border-[#45a85d]/40 hover:text-[#f4eadc]"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <Link
          href="/"
          aria-label="MrNine home"
          className="flex items-center gap-2.5 rounded-md outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#45a85d]/70"
        >
          <div className="flex size-9 items-center justify-center rounded-md border border-[#45a85d]/30 bg-[#45a85d]/10 text-[#45a85d]">
            <FileSearch className="size-4" />
          </div>
          <div className="hidden min-w-0 sm:block">
            <p className="font-mono text-[0.58rem] uppercase tracking-[0.22em] text-[#45a85d]">MrNine Studio</p>
            <h1 className="truncate text-base font-black tracking-[-0.04em] text-[#f4eadc]">{copy.title}</h1>
          </div>
        </Link>

        <nav className="ml-1 hidden flex-1 items-center justify-center gap-1 md:flex" aria-label="Source modes">
          {MODES.map((item) => {
            const Icon = item.icon;
            const active = item.id === mode;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setMode(item.id)}
                aria-pressed={active}
                data-active={active}
                className={cn(
                  "playground-cap-pill flex h-10 items-center gap-2 rounded-md border px-3 font-mono text-[0.62rem] uppercase tracking-[0.16em] transition-[color,background-color,border-color,box-shadow] duration-300",
                  active
                    ? "border-[#45a85d]/50 bg-[#45a85d]/12 text-[#dff8e4] playground-capability-armed shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset]"
                    : "border-[#25211b] text-[#9a9087] hover:border-white/20 hover:text-[#f4eadc]",
                )}
              >
                <Icon className={cn("size-3.5 transition-transform duration-300", active && "scale-110")} />
                {language === "vi" ? item.labelVi : item.labelEn}
              </button>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 font-mono text-[0.58rem] uppercase tracking-[0.16em] text-[#9f968b] sm:flex">
            <span
              className={cn(
                "size-1.5 rounded-full",
                status.kind === "error" ? "bg-[#ef4444]" : isWorking ? "bg-[#d6a548] animate-pulse" : "bg-[#45a85d]",
              )}
            />
            {status.kind === "error"
              ? copy.statusError
              : status.kind === "extracting"
                ? copy.statusExtracting
                : status.kind === "summarizing"
                  ? copy.statusSummarizing
                  : copy.statusIdle}
          </div>
          <div className="flex rounded-full border border-white/10 bg-white/[0.03] p-0.5 font-mono text-[0.58rem] uppercase tracking-[0.16em]">
            {languageOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                title={option.title}
                aria-pressed={language === option.value}
                onClick={() => setLanguage(option.value)}
                className={cn(
                  "rounded-full px-2.5 py-1 transition",
                  language === option.value ? "bg-[#45a85d] text-[#061009]" : "text-[#9f968b] hover:text-[#f4eadc]",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="md:hidden relative z-10 shrink-0 overflow-x-auto border-b border-[#25211b] bg-[#0a0907]/92 px-3 py-2">
        <div className="flex min-w-max items-center gap-1.5">
          {MODES.map((item) => {
            const Icon = item.icon;
            const active = item.id === mode;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setMode(item.id)}
                className={cn(
                  "flex h-9 items-center gap-1.5 rounded-md border px-3 font-mono text-[0.6rem] uppercase tracking-[0.16em] transition",
                  active ? "border-[#45a85d]/50 bg-[#45a85d]/10 text-[#dff8e4]" : "border-[#25211b] text-[#9a9087]",
                )}
              >
                <Icon className="size-3" />
                {language === "vi" ? item.labelVi : item.labelEn}
              </button>
            );
          })}
        </div>
      </div>

      <div className="relative z-10 grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[26rem_minmax(0,1fr)] xl:grid-cols-[28rem_minmax(0,1fr)]">
        <aside className="flex min-h-0 flex-col border-b border-[#25211b] bg-[#0a0907]/72 lg:border-b-0 lg:border-r">
          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 md:px-5">
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-[#45a85d]">{copy.inputLabel}</label>
                {input ? (
                  <button
                    type="button"
                    onClick={() => setInput("")}
                    className="flex items-center gap-1 font-mono text-[0.55rem] uppercase tracking-[0.16em] text-[#9a9087] transition hover:text-[#ffb4ad]"
                  >
                    <X className="size-3" />
                    Clear
                  </button>
                ) : null}
              </div>
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleKey}
                placeholder={copy.inputPlaceholder}
                rows={10}
                className="playground-textarea-active min-h-[12rem] w-full resize-y rounded-md border border-[#2a251f] bg-[#0c0a08] p-3 text-sm leading-6 text-[#f4eadc] outline-none focus:border-[#45a85d]/60 focus:bg-[#0d130c]"
              />
              <div className="mt-1.5 flex items-center justify-between font-mono text-[0.55rem] uppercase tracking-[0.16em] text-[#756d64]">
                <span>{copy.runShortcut}</span>
              </div>
            </div>

            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void handlePdf(file);
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={status.kind === "extracting"}
                className={cn(
                  "flex h-10 w-full items-center justify-center gap-2 rounded-md border px-3 font-mono text-[0.6rem] uppercase tracking-[0.16em] transition-[color,background-color,border-color] duration-200",
                  status.kind === "extracting"
                    ? "playground-upload-active border-[#d6a548]/45 bg-[#d6a548]/10 text-[#f0c86d]"
                    : "border-[#d6a548]/35 bg-[#d6a548]/10 text-[#f0c86d] hover:border-[#d6a548]/60 hover:bg-[#d6a548]/16 active:scale-[0.985]",
                )}
              >
                {status.kind === "extracting" ? <LoaderCircle className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
                {status.kind === "extracting" ? copy.statusExtracting : copy.pdfUpload}
              </button>
              <p className="mt-1.5 font-mono text-[0.55rem] uppercase tracking-[0.16em] text-[#756d64]">
                {copy.pdfHint}
              </p>
            </div>
          </div>

          <div className="shrink-0 border-t border-[#25211b] bg-[#08070680]/60 p-3 backdrop-blur md:p-4">
            {status.kind === "error" ? (
              <div className="mb-2 flex items-start gap-2 rounded-md border border-[#ef4444]/30 bg-[#ef4444]/10 px-2.5 py-2 text-[0.7rem] leading-5 text-[#ffb4ad]">
                <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
                <span>{status.message}</span>
              </div>
            ) : null}
            {isWorking ? (
              <div className="playground-queue-bar mb-2 flex items-center justify-between rounded-md border border-[#d6a548]/30 bg-[#d6a548]/10 px-2.5 py-2 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-[#f0c86d]">
                <span className="flex items-center gap-2">
                  <LoaderCircle className="size-3.5 animate-spin" />
                  {status.kind === "extracting" ? copy.statusExtracting : copy.statusSummarizing}
                </span>
              </div>
            ) : null}
            <button
              type="button"
              onClick={submit}
              disabled={isWorking}
              className={cn(
                "flex h-12 w-full items-center justify-center gap-2 rounded-md font-mono text-[0.72rem] font-bold uppercase tracking-[0.18em] transition-[transform,background-color,box-shadow] duration-300",
                "active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#45a85d]/70",
                isWorking ? "playground-loading-shimmer" : "playground-run-armed",
                "bg-[#45a85d] text-[#061009] hover:bg-[#58c772]",
              )}
            >
              {isWorking ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />}
              {copy.submit}
            </button>
          </div>
        </aside>

        <section className="grid min-h-0 grid-cols-1 overflow-hidden xl:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="flex-1 overflow-y-auto px-4 py-4 md:px-6">
            {activeResult ? (
              <div className="mx-auto flex h-full max-w-4xl flex-col">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-md border border-[#25211b] bg-[#0c0a08] px-3 py-2.5">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-md border border-[#45a85d]/35 bg-[#45a85d]/10 px-2 py-0.5 font-mono text-[0.55rem] uppercase tracking-[0.16em] text-[#dff8e4]">
                      {modeLabel(activeResult.sourceLabel)}
                    </span>
                    {activeResult.sourceTitle ? (
                      <span className="max-w-md truncate text-[0.7rem] text-[#cfc4b8]">{activeResult.sourceTitle}</span>
                    ) : null}
                    <span className="font-mono text-[0.5rem] uppercase tracking-[0.18em] text-[#756d64]">
                      {new Date(activeResult.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={copySummary}
                    className={cn(
                      "flex h-8 items-center gap-1.5 rounded-md border px-3 font-mono text-[0.55rem] uppercase tracking-[0.16em] transition",
                      copied
                        ? "border-[#45a85d]/45 bg-[#45a85d]/14 text-[#dff8e4]"
                        : "border-white/10 bg-white/[0.03] text-[#cfc4b8] hover:bg-white/[0.06]",
                    )}
                  >
                    <Copy className="size-3.5" />
                    {copied ? copy.copied : copy.copy}
                  </button>
                </div>

                {activeResult.truncated ? (
                  <div className="mb-3 rounded-md border border-[#d6a548]/30 bg-[#d6a548]/10 px-3 py-2 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-[#f0c86d]">
                    {copy.truncatedNote}
                  </div>
                ) : null}

                <div
                  className="playground-result-arrive flex-1 overflow-y-auto rounded-lg border border-[#25211b] bg-[#0d0b08]/82 p-5"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(activeResult.summary) }}
                />
              </div>
            ) : (
              <div className="mx-auto flex h-full max-w-3xl flex-col items-center justify-center text-center">
                <div className="playground-fade-in flex size-14 items-center justify-center rounded-md border border-[#45a85d]/35 bg-[#45a85d]/10">
                  <Sparkles className="size-6 animate-pulse text-[#45a85d]" />
                </div>
                <h3 className="playground-fade-in mt-4 max-w-xl text-2xl font-black tracking-[-0.04em] text-[#f4eadc]" style={{ animationDelay: "60ms" }}>
                  {copy.title}
                </h3>
                <p className="playground-fade-in mt-1 max-w-md text-sm leading-6 text-[#b5ab9f]" style={{ animationDelay: "120ms" }}>
                  {copy.empty}
                </p>
              </div>
            )}
          </div>

          <aside className="hidden min-h-0 flex-col border-l border-[#25211b] bg-[#0a0907]/72 xl:flex">
            <div className="flex shrink-0 items-center justify-between border-b border-[#25211b] px-4 py-3">
              <div>
                <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-[#45a85d]">{copy.historyTitle}</p>
                <p className="mt-0.5 font-mono text-[0.5rem] uppercase tracking-[0.18em] text-[#756d64]">
                  {results.length} / 40
                </p>
              </div>
              {results.length > 0 ? (
                <button
                  type="button"
                  onClick={clearHistory}
                  className="flex h-7 items-center gap-1 rounded-md border border-white/10 bg-white/[0.03] px-2 font-mono text-[0.55rem] uppercase tracking-[0.16em] text-[#9a9087] transition hover:border-[#ef4444]/35 hover:bg-[#ef4444]/10 hover:text-[#ffb4ad]"
                >
                  <Trash2 className="size-3" />
                  {copy.historyClear}
                </button>
              ) : null}
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-3">
              {results.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                  <div className="flex size-10 items-center justify-center rounded-md border border-[#25211b] bg-[#100d0a]/60 text-[#9a9087]">
                    <Sparkles className="size-4" />
                  </div>
                  <p className="px-2 text-[0.7rem] leading-5 text-[#9a9087]">{copy.historyEmpty}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {results.map((entry) => {
                    const active = entry.id === (activeResult?.id ?? "");
                    return (
                      <button
                        key={entry.id}
                        type="button"
                        onClick={() => setActiveId(entry.id)}
                        className={cn(
                          "playground-thumb group block w-full rounded-md border px-3 py-2.5 text-left transition",
                          active ? "border-[#45a85d]/50 bg-[#0e1a11]" : "border-[#25211b] bg-[#0d0b08]/82 hover:border-white/20",
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className={cn("font-mono text-[0.55rem] uppercase tracking-[0.16em]", active ? "text-[#dff8e4]" : "text-[#d6a548]")}>
                            {modeLabel(entry.sourceLabel)}
                          </span>
                          <span className="font-mono text-[0.5rem] uppercase tracking-[0.18em] text-[#756d64]">
                            {new Date(entry.createdAt).toLocaleTimeString()}
                          </span>
                        </div>
                        {entry.sourceTitle ? (
                          <p className="mt-1 truncate text-[0.74rem] font-bold text-[#f4eadc]">{entry.sourceTitle}</p>
                        ) : null}
                        <p className="mt-1 line-clamp-2 text-[0.7rem] leading-5 text-[#b5ab9f]">{entry.preview}</p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}

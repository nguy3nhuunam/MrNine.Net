"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import {
  ArrowLeft,
  Copy,
  FileSearch,
  FileText,
  Globe,
  LoaderCircle,
  Send,
  TriangleAlert,
  Upload,
  Video,
  X,
} from "lucide-react";
import { languageOptions, useLanguage, type WebLanguage } from "@/components/LanguageProvider";
import { cn } from "@/lib/utils";

type Mode = "auto" | "text" | "pdf";

type Status =
  | { kind: "idle" }
  | { kind: "extracting" }
  | { kind: "summarizing" }
  | { kind: "error"; message: string };

type Result = {
  summary: string;
  sourceLabel?: string;
  sourceTitle?: string;
  sourceLength?: number;
  truncated?: boolean;
};

const recapCopy = {
  vi: {
    back: "Quay lại trang chủ",
    title: "Smart Recap",
    subtitle: "Paste link YouTube, link bài web hoặc upload PDF dài — nhận tóm tắt 1 phút.",
    inputLabel: "URL hoặc nội dung",
    inputPlaceholder: "Dán link YouTube, link bài web, hoặc paste văn bản dài tại đây...",
    pdfUpload: "Upload PDF",
    pdfHint: "PDF text-based, tối đa ~2MB",
    needInput: "Cần nhập nội dung hoặc URL",
    submit: "Tóm tắt",
    statusIdle: "Sẵn sàng",
    statusExtracting: "Đang trích xuất...",
    statusSummarizing: "Đang tóm tắt...",
    statusError: "Có lỗi",
    sourceMeta: "Nguồn",
    sourceText: "Văn bản",
    sourceUrl: "Trang web",
    sourceYouTube: "YouTube",
    sourcePdf: "PDF",
    truncatedNote: "Nội dung quá dài đã bị cắt còn 40 000 ký tự",
    copy: "Sao chép",
    copied: "Đã chép",
    empty: "Chưa có tóm tắt. Paste link hoặc nội dung rồi bấm Tóm tắt.",
    pdfFailed: "Không đọc được PDF",
    pdfTextEmpty: "PDF không có text trích xuất được (có thể là ảnh scan)",
  },
  en: {
    back: "Back to home",
    title: "Smart Recap",
    subtitle: "Paste a YouTube link, web URL, or upload a long PDF — get a 1-minute recap.",
    inputLabel: "URL or content",
    inputPlaceholder: "Paste a YouTube link, a web URL, or long text here...",
    pdfUpload: "Upload PDF",
    pdfHint: "Text-based PDF, max ~2MB",
    needInput: "Input is required",
    submit: "Summarize",
    statusIdle: "Ready",
    statusExtracting: "Extracting...",
    statusSummarizing: "Summarizing...",
    statusError: "Error",
    sourceMeta: "Source",
    sourceText: "Text",
    sourceUrl: "Web page",
    sourceYouTube: "YouTube",
    sourcePdf: "PDF",
    truncatedNote: "Content too long; truncated at 40k characters",
    copy: "Copy",
    copied: "Copied",
    empty: "No summary yet. Paste a link or text and press Summarize.",
    pdfFailed: "Failed to read PDF",
    pdfTextEmpty: "PDF has no extractable text (may be scanned image)",
  },
} satisfies Record<WebLanguage, Record<string, string>>;

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
      out.push(`<h3 class="mt-5 first:mt-0 font-mono text-[0.66rem] uppercase tracking-[0.22em] text-[#d6a548]">${escape(line.slice(3))}</h3>`);
    } else if (line.startsWith("# ")) {
      if (inList) {
        out.push("</ul>");
        inList = false;
      }
      out.push(`<h2 class="mt-6 first:mt-0 text-lg font-bold tracking-[-0.02em] text-[#f4eadc]">${escape(line.slice(2))}</h2>`);
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      if (!inList) {
        out.push('<ul class="mt-2 space-y-1.5 text-[0.86rem] leading-6 text-[#d8cfc4]">');
        inList = true;
      }
      out.push(`<li class="flex gap-2"><span class="mt-2 size-1 shrink-0 rounded-full bg-[#45a85d]"></span><span>${escape(line.slice(2))}</span></li>`);
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
  // PDF text streams are wrapped in BT...ET; pull the strings between Tj / TJ.
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
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [result, setResult] = useState<Result | null>(null);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  async function handlePdf(file: File) {
    setStatus({ kind: "extracting" });
    try {
      const text = await extractPdfText(file);
      if (!text) {
        setStatus({ kind: "error", message: copy.pdfTextEmpty });
        return;
      }
      setInput(text);
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
    setResult(null);
    try {
      const res = await fetch("/api/smart-recap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: trimmed, language }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
      setResult(json as Result);
      setStatus({ kind: "idle" });
    } catch (error) {
      setStatus({ kind: "error", message: error instanceof Error ? error.message : copy.statusError });
    }
  }

  function copySummary() {
    if (!result) return;
    void navigator.clipboard.writeText(result.summary);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  const isWorking = status.kind === "extracting" || status.kind === "summarizing";
  const sourceTag = result?.sourceLabel === "youtube"
    ? copy.sourceYouTube
    : result?.sourceLabel === "url"
      ? copy.sourceUrl
      : copy.sourceText;

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#0b0a08] pb-12 text-[#e8dfd4]">
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

      <header className="relative z-20 flex h-14 items-center border-b border-[#25211b] bg-[#0a0907]/92 px-4 backdrop-blur md:px-6">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            aria-label={copy.back}
            className="flex size-9 items-center justify-center rounded-md border border-white/10 text-[#a79d91] transition hover:border-[#45a85d]/40 hover:text-[#f4eadc]"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div className="flex size-9 items-center justify-center rounded-md border border-[#45a85d]/30 bg-[#45a85d]/10 text-[#45a85d]">
            <FileSearch className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="font-mono text-[0.6rem] uppercase tracking-[0.22em] text-[#45a85d]">MrNine Studio</p>
            <h1 className="truncate text-lg font-black tracking-[-0.04em] text-[#f4eadc]">{copy.title}</h1>
          </div>
        </div>
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

      <div className="relative z-10 mx-auto grid max-w-[88rem] gap-5 px-4 pt-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:px-8">
        <section className="space-y-3">
          <div>
            <p className="font-mono text-[0.62rem] uppercase tracking-[0.28em] text-[#8f8579]">{copy.title}</p>
            <h2 className="mt-1 max-w-2xl text-2xl font-black leading-tight tracking-[-0.04em] text-[#f4eadc] sm:text-3xl">
              {copy.subtitle}
            </h2>
          </div>

          <div className="rounded-lg border border-[#25211b] bg-[#0d0b08]/82 p-4">
            <div className="mb-2 flex items-center justify-between">
              <label className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-[#45a85d]">
                {copy.inputLabel}
              </label>
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
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={copy.inputPlaceholder}
              rows={10}
              className="min-h-[12rem] w-full resize-y rounded-md border border-[#2a251f] bg-[#0c0a08] p-3 text-sm leading-6 text-[#f4eadc] outline-none focus:border-[#45a85d]/60"
            />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
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
                className="flex h-10 items-center gap-2 rounded-md border border-[#d6a548]/35 bg-[#d6a548]/10 px-3 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-[#f0c86d] transition hover:border-[#d6a548]/60 hover:bg-[#d6a548]/16 disabled:opacity-60"
              >
                {status.kind === "extracting" ? <LoaderCircle className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
                {status.kind === "extracting" ? copy.statusExtracting : copy.pdfUpload}
              </button>
              <span className="font-mono text-[0.55rem] uppercase tracking-[0.16em] text-[#756d64]">
                {copy.pdfHint}
              </span>
            </div>

            {status.kind === "error" ? (
              <div className="mt-3 flex items-start gap-2 rounded-md border border-[#ef4444]/30 bg-[#ef4444]/10 px-3 py-2 text-[0.72rem] leading-5 text-[#ffb4ad]">
                <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
                <span>{status.message}</span>
              </div>
            ) : null}

            <div className="mt-4 flex items-center justify-end">
              <button
                type="button"
                onClick={submit}
                disabled={isWorking}
                className="flex h-11 items-center gap-2 rounded-md bg-[#45a85d] px-5 font-mono text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#061009] transition hover:bg-[#58c772] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isWorking ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />}
                {copy.submit}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-[0.62rem] uppercase tracking-[0.16em] text-[#9a9087]">
            <div className="flex items-center gap-1.5 rounded-md border border-[#25211b] bg-[#0d0b08]/82 px-2 py-2">
              <Video className="size-3.5 text-[#ef4444]" /> YouTube
            </div>
            <div className="flex items-center gap-1.5 rounded-md border border-[#25211b] bg-[#0d0b08]/82 px-2 py-2">
              <FileText className="size-3.5 text-[#d6a548]" /> PDF
            </div>
            <div className="flex items-center gap-1.5 rounded-md border border-[#25211b] bg-[#0d0b08]/82 px-2 py-2">
              <Globe className="size-3.5 text-[#45a85d]" /> URL
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <div className="rounded-lg border border-[#25211b] bg-[#0d0b08]/82 p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-[#45a85d]">Recap</p>
                {result ? (
                  <span className="rounded-md border border-[#45a85d]/35 bg-[#45a85d]/10 px-2 py-0.5 font-mono text-[0.55rem] uppercase tracking-[0.16em] text-[#dff8e4]">
                    {sourceTag}
                  </span>
                ) : null}
                {result?.sourceTitle ? (
                  <span className="max-w-xs truncate text-[0.7rem] text-[#9a9087]">{result.sourceTitle}</span>
                ) : null}
              </div>
              {result ? (
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
              ) : null}
            </div>

            {!result ? (
              <div className="flex min-h-[24rem] items-center justify-center rounded-md border border-dashed border-[#2a251f] bg-[#100d0a]/40 p-6 text-center text-[0.78rem] leading-6 text-[#9a9087]">
                {copy.empty}
              </div>
            ) : (
              <>
                {result.truncated ? (
                  <div className="mb-3 rounded-md border border-[#d6a548]/30 bg-[#d6a548]/10 px-3 py-2 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-[#f0c86d]">
                    {copy.truncatedNote}
                  </div>
                ) : null}
                <div
                  className="prose prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(result.summary) }}
                />
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

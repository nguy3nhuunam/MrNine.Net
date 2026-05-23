"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ChevronDown,
  Copy,
  Image as ImageLucide,
  Languages,
  LoaderCircle,
  Send,
  Sparkles,
  Trash2,
  TriangleAlert,
  Type,
  Upload,
  X,
} from "lucide-react";
import { languageOptions, useLanguage, type WebLanguage } from "@/components/LanguageProvider";
import { cn } from "@/lib/utils";
import { safeParseJson } from "@/lib/fetch-json";

type Mode = "image" | "text";

type Status =
  | { kind: "idle" }
  | { kind: "uploading" }
  | { kind: "processing" }
  | { kind: "error"; message: string };

type Entry = {
  id: string;
  mode: Mode;
  imageUrl?: string;
  extracted: string;
  translation: string;
  targetLang: string;
  truncated?: boolean;
  preview: string;
  createdAt: number;
};

const TARGET_OPTIONS: ReadonlyArray<{ value: string; vi: string; en: string }> = [
  { value: "vi", vi: "Tiếng Việt", en: "Vietnamese" },
  { value: "en", vi: "Tiếng Anh", en: "English" },
  { value: "zh", vi: "Tiếng Trung (giản thể)", en: "Chinese (Simplified)" },
  { value: "ja", vi: "Tiếng Nhật", en: "Japanese" },
  { value: "ko", vi: "Tiếng Hàn", en: "Korean" },
  { value: "fr", vi: "Tiếng Pháp", en: "French" },
  { value: "de", vi: "Tiếng Đức", en: "German" },
  { value: "es", vi: "Tiếng Tây Ban Nha", en: "Spanish" },
  { value: "th", vi: "Tiếng Thái", en: "Thai" },
  { value: "id", vi: "Tiếng Indonesia", en: "Indonesian" },
];

const docsenseCopy = {
  vi: {
    back: "Quay lại trang chủ",
    title: "DocSense",
    subtitle: "OCR ảnh hoặc paste văn bản, sau đó dịch chuyên nghiệp giữ nguyên định dạng.",
    imageTab: "Ảnh",
    textTab: "Văn bản",
    targetLang: "Ngôn ngữ đích",
    sourceImage: "Ảnh nguồn",
    sourceImageHint: "Dán URL hoặc tải ảnh từ máy",
    pasteUrl: "Dán URL ảnh",
    uploadFromDevice: "Tải từ máy",
    uploading: "Đang tải lên",
    uploadFailed: "Tải file thất bại",
    clearImage: "Bỏ ảnh",
    pasteText: "Văn bản nguồn",
    pastePlaceholder: "Paste văn bản cần dịch tại đây...",
    submitImage: "OCR + Dịch",
    submitText: "Dịch",
    runShortcut: "Ctrl + Enter để chạy",
    statusIdle: "Sẵn sàng",
    statusUploading: "Đang tải ảnh",
    statusProcessing: "Đang xử lý",
    statusError: "Có lỗi",
    needInput: "Cần upload ảnh hoặc paste văn bản",
    extractedTitle: "Văn bản gốc",
    translationTitle: "Bản dịch",
    copy: "Sao chép",
    copied: "Đã chép",
    truncatedNote: "Văn bản quá dài đã bị cắt",
    empty: "Kết quả sẽ hiện ở đây sau khi xử lý.",
    historyTitle: "Lịch sử",
    historyEmpty: "Lịch sử trống. Mỗi lần xử lý sẽ lưu tại đây.",
    historyClear: "Xoá lịch sử",
    uploaded: "Đã tải lên",
    remoteUrl: "Liên kết ngoài",
  },
  en: {
    back: "Back to home",
    title: "DocSense",
    subtitle: "OCR an image or paste text, then translate it professionally with format preserved.",
    imageTab: "Image",
    textTab: "Text",
    targetLang: "Target language",
    sourceImage: "Source image",
    sourceImageHint: "Paste a URL or upload from your device",
    pasteUrl: "Paste image URL",
    uploadFromDevice: "Upload from device",
    uploading: "Uploading",
    uploadFailed: "Upload failed",
    clearImage: "Remove",
    pasteText: "Source text",
    pastePlaceholder: "Paste text to translate here...",
    submitImage: "OCR + Translate",
    submitText: "Translate",
    runShortcut: "Press Ctrl + Enter to run",
    statusIdle: "Ready",
    statusUploading: "Uploading",
    statusProcessing: "Processing",
    statusError: "Error",
    needInput: "Upload an image or paste text",
    extractedTitle: "Source text",
    translationTitle: "Translation",
    copy: "Copy",
    copied: "Copied",
    truncatedNote: "Text was truncated due to length",
    empty: "Output will appear here after processing.",
    historyTitle: "History",
    historyEmpty: "History is empty. Each run is saved here.",
    historyClear: "Clear history",
    uploaded: "Uploaded",
    remoteUrl: "Remote URL",
  },
} satisfies Record<WebLanguage, Record<string, string>>;

const STORAGE_KEY = "mrnine-docsense-history";

export function DocSenseShell() {
  const { language, setLanguage } = useLanguage();
  const copy = docsenseCopy[language];

  const [mode, setMode] = useState<Mode>("image");
  const [imageUrl, setImageUrl] = useState("");
  const [text, setText] = useState("");
  const [targetLang, setTargetLang] = useState("vi");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [copiedKey, setCopiedKey] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textRef = useRef<HTMLTextAreaElement | null>(null);

  const [results, setResults] = useState<Entry[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as Entry[];
      return Array.isArray(parsed)
        ? parsed
            .filter((item) => item && typeof item.id === "string" && typeof item.translation === "string")
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
      const parsed = JSON.parse(raw) as Entry[];
      return Array.isArray(parsed) && parsed[0]?.id ? parsed[0].id : "";
    } catch {
      return "";
    }
  });

  const activeEntry = activeId ? results.find((item) => item.id === activeId) ?? results[0] : results[0];

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

  async function uploadFile(file: File) {
    setStatus({ kind: "uploading" });
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/ai-playground/upload", { method: "POST", body: form });
      const json = await safeParseJson(res);
      if (!res.ok || !json?.url) throw new Error(json?.error || copy.uploadFailed);
      setImageUrl(json.url as string);
      setStatus({ kind: "idle" });
    } catch (error) {
      setStatus({ kind: "error", message: error instanceof Error ? error.message : copy.uploadFailed });
    }
  }

  async function submit() {
    if (mode === "image" && !imageUrl.trim()) {
      setStatus({ kind: "error", message: copy.needInput });
      return;
    }
    if (mode === "text" && !text.trim()) {
      setStatus({ kind: "error", message: copy.needInput });
      return;
    }
    setStatus({ kind: "processing" });
    try {
      const res = await fetch("/api/docsense", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: mode === "image" ? imageUrl.trim() : "",
          text: mode === "text" ? text.trim() : "",
          targetLang,
          ui: language,
        }),
      });
      const json = await safeParseJson(res);
      if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);

      const extracted = String(json.extracted ?? "");
      const translation = String(json.translation ?? "");
      const entry: Entry = {
        id: `${Date.now()}`,
        mode,
        imageUrl: mode === "image" ? imageUrl.trim() : undefined,
        extracted,
        translation,
        targetLang: typeof json.targetLang === "string" ? json.targetLang : targetLang,
        truncated: Boolean(json.truncated),
        preview: (extracted || translation).slice(0, 140),
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

  function copyValue(key: string, value: string) {
    void navigator.clipboard.writeText(value);
    setCopiedKey(key);
    window.setTimeout(() => setCopiedKey(""), 1500);
  }

  const isWorking = status.kind === "uploading" || status.kind === "processing";

  function targetLabel(value: string): string {
    const opt = TARGET_OPTIONS.find((item) => item.value === value);
    if (!opt) return value;
    return language === "vi" ? opt.vi : opt.en;
  }

  return (
    <main className="relative flex h-screen flex-col overflow-hidden bg-[#0b0a08] text-[#e8dfd4]">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 16% 10%, rgba(71,201,217,0.16), transparent 28%), radial-gradient(circle at 78% 12%, rgba(214,165,72,0.1), transparent 24%), linear-gradient(180deg,#0d0c0a 0%,#070604 100%)",
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
          className="flex size-9 items-center justify-center rounded-md border border-white/10 text-[#a79d91] transition hover:border-[#47c9d9]/40 hover:text-[#f4eadc]"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-md border border-[#47c9d9]/30 bg-[#47c9d9]/10 text-[#47c9d9]">
            <Languages className="size-4" />
          </div>
          <div className="hidden min-w-0 sm:block">
            <p className="font-mono text-[0.58rem] uppercase tracking-[0.22em] text-[#47c9d9]">MrNine Studio</p>
            <h1 className="truncate text-base font-black tracking-[-0.04em] text-[#f4eadc]">{copy.title}</h1>
          </div>
        </div>

        <nav className="ml-1 hidden flex-1 items-center justify-center gap-1 md:flex" aria-label="Modes">
          {([
            { id: "image", labelVi: copy.imageTab, labelEn: copy.imageTab, Icon: ImageLucide },
            { id: "text", labelVi: copy.textTab, labelEn: copy.textTab, Icon: Type },
          ] as const).map((item) => {
            const active = item.id === mode;
            const Icon = item.Icon;
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
                    ? "border-[#47c9d9]/50 bg-[#47c9d9]/12 text-[#cdf3fb] playground-capability-armed shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset]"
                    : "border-[#25211b] text-[#9a9087] hover:border-white/20 hover:text-[#f4eadc]",
                )}
              >
                <Icon className={cn("size-3.5 transition-transform duration-300", active && "scale-110")} />
                {item.labelVi}
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
              : status.kind === "uploading"
                ? copy.statusUploading
                : status.kind === "processing"
                  ? copy.statusProcessing
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
                  language === option.value ? "bg-[#47c9d9] text-[#04141a]" : "text-[#9f968b] hover:text-[#f4eadc]",
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
          {([
            { id: "image", label: copy.imageTab, Icon: ImageLucide },
            { id: "text", label: copy.textTab, Icon: Type },
          ] as const).map((item) => {
            const active = item.id === mode;
            const Icon = item.Icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setMode(item.id)}
                className={cn(
                  "flex h-9 items-center gap-1.5 rounded-md border px-3 font-mono text-[0.6rem] uppercase tracking-[0.16em] transition",
                  active ? "border-[#47c9d9]/50 bg-[#47c9d9]/10 text-[#cdf3fb]" : "border-[#25211b] text-[#9a9087]",
                )}
              >
                <Icon className="size-3" />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="relative z-10 grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[26rem_minmax(0,1fr)] xl:grid-cols-[28rem_minmax(0,1fr)]">
        <aside className="flex min-h-0 flex-col border-b border-[#25211b] bg-[#0a0907]/72 lg:border-b-0 lg:border-r">
          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 md:px-5">
            <div>
              <label className="mb-1.5 block font-mono text-[0.58rem] uppercase tracking-[0.2em] text-[#d6a548]">
                {copy.targetLang}
              </label>
              <div className="relative">
                <select
                  value={targetLang}
                  onChange={(event) => setTargetLang(event.target.value)}
                  className="w-full appearance-none rounded-md border border-[#2a251f] bg-[#0c0a08] px-3 py-2 pr-8 font-mono text-[0.78rem] text-[#f4eadc] outline-none focus:border-[#d6a548]/60"
                >
                  {TARGET_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {language === "vi" ? option.vi : option.en}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-3.5 -translate-y-1/2 text-[#9a9087]" />
              </div>
            </div>

            {mode === "image" ? (
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="block font-mono text-[0.58rem] uppercase tracking-[0.2em] text-[#47c9d9]">
                    {copy.sourceImage}
                  </label>
                  {imageUrl ? (
                    <button
                      type="button"
                      onClick={() => {
                        setImageUrl("");
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      className="flex items-center gap-1 font-mono text-[0.55rem] uppercase tracking-[0.16em] text-[#9a9087] transition hover:text-[#ffb4ad]"
                    >
                      <X className="size-3" />
                      {copy.clearImage}
                    </button>
                  ) : null}
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(event) => setImageUrl(event.target.value)}
                    placeholder={copy.pasteUrl}
                    className="min-w-0 flex-1 rounded-md border border-[#2a251f] bg-[#0c0a08] px-3 py-2 font-mono text-[0.78rem] text-[#f4eadc] outline-none focus:border-[#47c9d9]/60"
                  />
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void uploadFile(file);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={status.kind === "uploading"}
                    className={cn(
                      "flex h-10 shrink-0 items-center justify-center gap-2 rounded-md border px-3 font-mono text-[0.6rem] uppercase tracking-[0.16em] transition-[color,background-color,border-color] duration-200",
                      status.kind === "uploading"
                        ? "playground-upload-active border-[#d6a548]/45 bg-[#d6a548]/10 text-[#f0c86d]"
                        : "border-[#45a85d]/35 bg-[#45a85d]/10 text-[#dff8e4] hover:border-[#45a85d]/60 hover:bg-[#45a85d]/16 active:scale-[0.985]",
                    )}
                  >
                    {status.kind === "uploading" ? <LoaderCircle className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
                    {status.kind === "uploading" ? copy.uploading : copy.uploadFromDevice}
                  </button>
                </div>
                {imageUrl ? (
                  <div className="mt-2 flex items-center gap-3 rounded-md border border-[#25211b] bg-[#0c0a08] p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imageUrl}
                      alt="source"
                      className="size-16 shrink-0 rounded border border-white/8 bg-black object-cover"
                    />
                    <div className="min-w-0 flex-1 font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[#cfc4b8]">
                      {imageUrl.startsWith("https://v3.fal.media") ? copy.uploaded : copy.remoteUrl}
                    </div>
                  </div>
                ) : null}
                <p className="mt-1.5 font-mono text-[0.55rem] uppercase tracking-[0.16em] text-[#756d64]">
                  {copy.sourceImageHint}
                </p>
              </div>
            ) : (
              <div>
                <label className="mb-1.5 block font-mono text-[0.58rem] uppercase tracking-[0.2em] text-[#47c9d9]">
                  {copy.pasteText}
                </label>
                <textarea
                  ref={textRef}
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  onKeyDown={handleKey}
                  placeholder={copy.pastePlaceholder}
                  rows={10}
                  className="playground-textarea-active min-h-[12rem] w-full resize-y rounded-md border border-[#2a251f] bg-[#0c0a08] p-3 text-sm leading-6 text-[#f4eadc] outline-none focus:border-[#47c9d9]/60 focus:bg-[#091317]"
                />
                <div className="mt-1.5 font-mono text-[0.55rem] uppercase tracking-[0.16em] text-[#756d64]">
                  {copy.runShortcut}
                </div>
              </div>
            )}
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
                  {status.kind === "uploading" ? copy.statusUploading : copy.statusProcessing}
                </span>
              </div>
            ) : null}
            <button
              type="button"
              onClick={submit}
              disabled={isWorking}
              className={cn(
                "flex h-12 w-full items-center justify-center gap-2 rounded-md font-mono text-[0.72rem] font-bold uppercase tracking-[0.18em] transition-[transform,background-color,box-shadow] duration-300",
                "active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#47c9d9]/70",
                isWorking ? "playground-loading-shimmer" : "playground-run-armed",
                "bg-[#47c9d9] text-[#04141a] hover:bg-[#5fd6e4]",
              )}
            >
              {isWorking ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />}
              {mode === "image" ? copy.submitImage : copy.submitText}
            </button>
          </div>
        </aside>

        <section className="grid min-h-0 grid-cols-1 overflow-hidden xl:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="flex-1 overflow-y-auto px-4 py-4 md:px-6">
            {activeEntry ? (
              <div className="mx-auto flex h-full max-w-6xl flex-col gap-3">
                {activeEntry.truncated ? (
                  <div className="rounded-md border border-[#d6a548]/30 bg-[#d6a548]/10 px-3 py-2 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-[#f0c86d]">
                    {copy.truncatedNote}
                  </div>
                ) : null}
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-[#25211b] bg-[#0c0a08] px-3 py-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md border border-[#47c9d9]/35 bg-[#47c9d9]/10 px-2 py-0.5 font-mono text-[0.55rem] uppercase tracking-[0.16em] text-[#cdf3fb]">
                      {targetLabel(activeEntry.targetLang)}
                    </span>
                    <span className="font-mono text-[0.5rem] uppercase tracking-[0.18em] text-[#756d64]">
                      {new Date(activeEntry.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                </div>

                <div className="grid flex-1 gap-3 lg:grid-cols-2">
                  <div className="flex min-h-0 flex-col rounded-lg border border-[#25211b] bg-[#0d0b08]/82 p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-[#d6a548]">{copy.extractedTitle}</p>
                      {activeEntry.extracted ? (
                        <button
                          type="button"
                          onClick={() => copyValue("src", activeEntry.extracted)}
                          className={cn(
                            "flex h-7 items-center gap-1 rounded-md border px-2 font-mono text-[0.55rem] uppercase tracking-[0.16em] transition",
                            copiedKey === "src"
                              ? "border-[#45a85d]/45 bg-[#45a85d]/14 text-[#dff8e4]"
                              : "border-white/10 bg-white/[0.03] text-[#cfc4b8] hover:bg-white/[0.06]",
                          )}
                        >
                          <Copy className="size-3" />
                          {copiedKey === "src" ? copy.copied : copy.copy}
                        </button>
                      ) : null}
                    </div>
                    <pre className="playground-result-arrive flex-1 overflow-y-auto whitespace-pre-wrap rounded-md border border-[#25211b] bg-[#0c0a08] p-3 text-[0.82rem] leading-6 text-[#cfc4b8]">
                      {activeEntry.extracted || ""}
                    </pre>
                  </div>

                  <div className="flex min-h-0 flex-col rounded-lg border border-[#25211b] bg-[#0d0b08]/82 p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-[#47c9d9]">{copy.translationTitle}</p>
                      {activeEntry.translation ? (
                        <button
                          type="button"
                          onClick={() => copyValue("dst", activeEntry.translation)}
                          className={cn(
                            "flex h-7 items-center gap-1 rounded-md border px-2 font-mono text-[0.55rem] uppercase tracking-[0.16em] transition",
                            copiedKey === "dst"
                              ? "border-[#45a85d]/45 bg-[#45a85d]/14 text-[#dff8e4]"
                              : "border-white/10 bg-white/[0.03] text-[#cfc4b8] hover:bg-white/[0.06]",
                          )}
                        >
                          <Copy className="size-3" />
                          {copiedKey === "dst" ? copy.copied : copy.copy}
                        </button>
                      ) : null}
                    </div>
                    <pre className="playground-result-arrive flex-1 overflow-y-auto whitespace-pre-wrap rounded-md border border-[#25211b] bg-[#0c0a08] p-3 text-[0.86rem] leading-6 text-[#f4eadc]">
                      {activeEntry.translation || ""}
                    </pre>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mx-auto flex h-full max-w-3xl flex-col items-center justify-center text-center">
                <div className="playground-fade-in flex size-14 items-center justify-center rounded-md border border-[#47c9d9]/35 bg-[#47c9d9]/10">
                  <Languages className="size-6 animate-pulse text-[#47c9d9]" />
                </div>
                <h3 className="playground-fade-in mt-4 max-w-xl text-2xl font-black tracking-[-0.04em] text-[#f4eadc]" style={{ animationDelay: "60ms" }}>
                  {copy.title}
                </h3>
                <p className="playground-fade-in mt-1 max-w-md text-sm leading-6 text-[#b5ab9f]" style={{ animationDelay: "120ms" }}>
                  {copy.subtitle}
                </p>
              </div>
            )}
          </div>

          <aside className="hidden min-h-0 flex-col border-l border-[#25211b] bg-[#0a0907]/72 xl:flex">
            <div className="flex shrink-0 items-center justify-between border-b border-[#25211b] px-4 py-3">
              <div>
                <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-[#47c9d9]">{copy.historyTitle}</p>
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
                    const active = entry.id === (activeEntry?.id ?? "");
                    return (
                      <button
                        key={entry.id}
                        type="button"
                        onClick={() => setActiveId(entry.id)}
                        className={cn(
                          "playground-thumb group block w-full rounded-md border px-3 py-2.5 text-left transition",
                          active ? "border-[#47c9d9]/50 bg-[#0a181b]" : "border-[#25211b] bg-[#0d0b08]/82 hover:border-white/20",
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className={cn("font-mono text-[0.55rem] uppercase tracking-[0.16em]", active ? "text-[#cdf3fb]" : "text-[#47c9d9]")}>
                            {targetLabel(entry.targetLang)}
                          </span>
                          <span className="font-mono text-[0.5rem] uppercase tracking-[0.18em] text-[#756d64]">
                            {new Date(entry.createdAt).toLocaleTimeString()}
                          </span>
                        </div>
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

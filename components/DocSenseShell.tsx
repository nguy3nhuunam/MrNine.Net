"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import {
  ArrowLeft,
  ChevronDown,
  Copy,
  Languages,
  LoaderCircle,
  Send,
  TriangleAlert,
  Upload,
  X,
} from "lucide-react";
import { languageOptions, useLanguage, type WebLanguage } from "@/components/LanguageProvider";
import { cn } from "@/lib/utils";

type Status =
  | { kind: "idle" }
  | { kind: "uploading" }
  | { kind: "processing" }
  | { kind: "error"; message: string };

type Result = {
  extracted: string;
  translation: string;
  targetLang: string;
  truncated?: boolean;
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
    inputTab: "Đầu vào",
    pasteTab: "Văn bản",
    imageTab: "Ảnh",
    targetLang: "Ngôn ngữ đích",
    sourceImage: "Ảnh nguồn",
    pasteUrl: "Dán URL ảnh",
    uploadFromDevice: "Tải từ máy",
    uploading: "Đang tải lên...",
    uploadFailed: "Tải file thất bại",
    clearImage: "Bỏ ảnh",
    pasteText: "Văn bản nguồn",
    pastePlaceholder: "Paste văn bản cần dịch tại đây...",
    submit: "OCR + Dịch",
    submitTextOnly: "Dịch",
    statusIdle: "Sẵn sàng",
    statusProcessing: "Đang xử lý...",
    statusError: "Có lỗi",
    needInput: "Cần upload ảnh hoặc paste văn bản",
    extractedTitle: "Văn bản gốc",
    translationTitle: "Bản dịch",
    copy: "Sao chép",
    copied: "Đã chép",
    truncatedNote: "Văn bản quá dài đã bị cắt",
    empty: "Kết quả sẽ hiện ở đây sau khi xử lý.",
  },
  en: {
    back: "Back to home",
    title: "DocSense",
    subtitle: "OCR an image or paste text, then translate it professionally with format preserved.",
    inputTab: "Input",
    pasteTab: "Text",
    imageTab: "Image",
    targetLang: "Target language",
    sourceImage: "Source image",
    pasteUrl: "Paste image URL",
    uploadFromDevice: "Upload from device",
    uploading: "Uploading...",
    uploadFailed: "Upload failed",
    clearImage: "Remove",
    pasteText: "Source text",
    pastePlaceholder: "Paste text to translate here...",
    submit: "OCR + Translate",
    submitTextOnly: "Translate",
    statusIdle: "Ready",
    statusProcessing: "Processing...",
    statusError: "Error",
    needInput: "Upload an image or paste text",
    extractedTitle: "Source text",
    translationTitle: "Translation",
    copy: "Copy",
    copied: "Copied",
    truncatedNote: "Text was truncated due to length",
    empty: "Output will appear here after processing.",
  },
} satisfies Record<WebLanguage, Record<string, string>>;

export function DocSenseShell() {
  const { language, setLanguage } = useLanguage();
  const copy = docsenseCopy[language];
  const [mode, setMode] = useState<"image" | "text">("image");
  const [imageUrl, setImageUrl] = useState("");
  const [text, setText] = useState("");
  const [targetLang, setTargetLang] = useState("vi");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [result, setResult] = useState<Result | null>(null);
  const [copiedKey, setCopiedKey] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  async function uploadFile(file: File) {
    setStatus({ kind: "uploading" });
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/ai-playground/upload", { method: "POST", body: form });
      const json = await res.json();
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
    setResult(null);
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
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
      setResult(json as Result);
      setStatus({ kind: "idle" });
    } catch (error) {
      setStatus({ kind: "error", message: error instanceof Error ? error.message : copy.statusError });
    }
  }

  function copyValue(key: string, value: string) {
    void navigator.clipboard.writeText(value);
    setCopiedKey(key);
    window.setTimeout(() => setCopiedKey(""), 1500);
  }

  const isWorking = status.kind === "uploading" || status.kind === "processing";

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#0b0a08] pb-12 text-[#e8dfd4]">
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

      <header className="relative z-20 flex h-14 items-center border-b border-[#25211b] bg-[#0a0907]/92 px-4 backdrop-blur md:px-6">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            aria-label={copy.back}
            className="flex size-9 items-center justify-center rounded-md border border-white/10 text-[#a79d91] transition hover:border-[#47c9d9]/40 hover:text-[#f4eadc]"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div className="flex size-9 items-center justify-center rounded-md border border-[#47c9d9]/30 bg-[#47c9d9]/10 text-[#47c9d9]">
            <Languages className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="font-mono text-[0.6rem] uppercase tracking-[0.22em] text-[#47c9d9]">MrNine Studio</p>
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
              : status.kind === "uploading"
                ? copy.uploading
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

      <div className="relative z-10 mx-auto max-w-[88rem] px-4 pt-6 sm:px-6 lg:px-8">
        <div className="mb-5">
          <p className="font-mono text-[0.62rem] uppercase tracking-[0.28em] text-[#8f8579]">{copy.title}</p>
          <h2 className="mt-1 max-w-2xl text-2xl font-black leading-tight tracking-[-0.04em] text-[#f4eadc] sm:text-3xl">
            {copy.subtitle}
          </h2>
        </div>

        <div className="grid gap-5 lg:grid-cols-[20rem_minmax(0,1fr)]">
          <aside className="space-y-3">
            <div className="rounded-lg border border-[#25211b] bg-[#0d0b08]/82 p-4">
              <div className="mb-3 flex rounded-md border border-[#25211b] bg-[#0c0a08] p-1 font-mono text-[0.6rem] uppercase tracking-[0.16em]">
                <button
                  type="button"
                  onClick={() => setMode("image")}
                  className={cn(
                    "flex-1 rounded px-3 py-2 transition",
                    mode === "image" ? "bg-[#47c9d9]/14 text-[#cdf3fb]" : "text-[#9a9087] hover:text-[#f4eadc]",
                  )}
                >
                  {copy.imageTab}
                </button>
                <button
                  type="button"
                  onClick={() => setMode("text")}
                  className={cn(
                    "flex-1 rounded px-3 py-2 transition",
                    mode === "text" ? "bg-[#47c9d9]/14 text-[#cdf3fb]" : "text-[#9a9087] hover:text-[#f4eadc]",
                  )}
                >
                  {copy.pasteTab}
                </button>
              </div>

              {mode === "image" ? (
                <>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-[#47c9d9]">{copy.sourceImage}</p>
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
                  <div className="flex flex-col gap-2">
                    <input
                      type="url"
                      value={imageUrl}
                      onChange={(event) => setImageUrl(event.target.value)}
                      placeholder={copy.pasteUrl}
                      className="w-full rounded-md border border-[#2a251f] bg-[#0c0a08] px-3 py-2 font-mono text-[0.78rem] text-[#f4eadc] outline-none focus:border-[#47c9d9]/60"
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
                      className="flex h-10 items-center justify-center gap-2 rounded-md border border-[#45a85d]/35 bg-[#45a85d]/10 px-3 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-[#dff8e4] transition hover:border-[#45a85d]/60 hover:bg-[#45a85d]/16 disabled:opacity-60"
                    >
                      {status.kind === "uploading" ? <LoaderCircle className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
                      {status.kind === "uploading" ? copy.uploading : copy.uploadFromDevice}
                    </button>
                  </div>
                  {imageUrl ? (
                    <div className="mt-3 overflow-hidden rounded-md border border-[#25211b] bg-black">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imageUrl} alt="source" className="max-h-72 w-full object-contain" />
                    </div>
                  ) : null}
                </>
              ) : (
                <>
                  <p className="mb-2 font-mono text-[0.58rem] uppercase tracking-[0.2em] text-[#47c9d9]">{copy.pasteText}</p>
                  <textarea
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                    placeholder={copy.pastePlaceholder}
                    rows={10}
                    className="min-h-[12rem] w-full resize-y rounded-md border border-[#2a251f] bg-[#0c0a08] p-3 text-sm leading-6 text-[#f4eadc] outline-none focus:border-[#47c9d9]/60"
                  />
                </>
              )}

              <div className="mt-3">
                <label className="mb-1 block font-mono text-[0.58rem] uppercase tracking-[0.18em] text-[#d6a548]">
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
                  className="flex h-11 items-center gap-2 rounded-md bg-[#47c9d9] px-5 font-mono text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#04141a] transition hover:bg-[#5fd6e4] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isWorking ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />}
                  {mode === "image" ? copy.submit : copy.submitTextOnly}
                </button>
              </div>
            </div>
          </aside>

          <section className="space-y-3">
            {result?.truncated ? (
              <div className="rounded-md border border-[#d6a548]/30 bg-[#d6a548]/10 px-3 py-2 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-[#f0c86d]">
                {copy.truncatedNote}
              </div>
            ) : null}

            <div className="grid gap-3 lg:grid-cols-2">
              <div className="rounded-lg border border-[#25211b] bg-[#0d0b08]/82 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-[#d6a548]">{copy.extractedTitle}</p>
                  {result?.extracted ? (
                    <button
                      type="button"
                      onClick={() => copyValue("src", result.extracted)}
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
                {result?.extracted ? (
                  <pre className="max-h-[60vh] overflow-y-auto whitespace-pre-wrap rounded-md border border-[#25211b] bg-[#0c0a08] p-3 text-[0.82rem] leading-6 text-[#cfc4b8]">
                    {result.extracted}
                  </pre>
                ) : (
                  <div className="rounded-md border border-dashed border-[#2a251f] bg-[#100d0a]/40 px-3 py-10 text-center text-[0.78rem] leading-6 text-[#9a9087]">
                    {copy.empty}
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-[#25211b] bg-[#0d0b08]/82 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-[#47c9d9]">{copy.translationTitle}</p>
                  {result?.translation ? (
                    <button
                      type="button"
                      onClick={() => copyValue("dst", result.translation)}
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
                {result?.translation ? (
                  <pre className="max-h-[60vh] overflow-y-auto whitespace-pre-wrap rounded-md border border-[#25211b] bg-[#0c0a08] p-3 text-[0.86rem] leading-6 text-[#f4eadc]">
                    {result.translation}
                  </pre>
                ) : (
                  <div className="rounded-md border border-dashed border-[#2a251f] bg-[#100d0a]/40 px-3 py-10 text-center text-[0.78rem] leading-6 text-[#9a9087]">
                    {copy.empty}
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

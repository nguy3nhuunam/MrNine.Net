"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Copy,
  Download,
  Eraser,
  ImageDown,
  Layers,
  LoaderCircle,
  Send,
  Smile,
  Sparkles,
  Trash2,
  TriangleAlert,
  Upload,
  Wand2,
  X,
} from "lucide-react";
import { languageOptions, useLanguage, type WebLanguage } from "@/components/LanguageProvider";
import { cn } from "@/lib/utils";
import { safeParseJson } from "@/lib/fetch-json";

type Op = "remove-bg" | "sharpen" | "replace-bg" | "face-fix";

type PhotoOp = {
  id: Op;
  modelId: string;
  labelVi: string;
  labelEn: string;
  taglineVi: string;
  taglineEn: string;
  icon: typeof Eraser;
  needsPrompt?: boolean;
  promptLabelVi?: string;
  promptLabelEn?: string;
  promptPlaceholderVi?: string;
  promptPlaceholderEn?: string;
};

const OPS: ReadonlyArray<PhotoOp> = [
  {
    id: "remove-bg",
    modelId: "bria-background-remove",
    labelVi: "Tách nền",
    labelEn: "Remove BG",
    taglineVi: "Tách chủ thể, nền trong suốt",
    taglineEn: "Cut subject, transparent background",
    icon: Eraser,
  },
  {
    id: "sharpen",
    modelId: "clarity-upscaler",
    labelVi: "Làm nét + upscale",
    labelEn: "Sharpen + upscale",
    taglineVi: "Tăng độ phân giải, chi tiết hoá",
    taglineEn: "Higher resolution, more detail",
    icon: Sparkles,
  },
  {
    id: "replace-bg",
    modelId: "bria-background-replace",
    labelVi: "Đổi nền theo prompt",
    labelEn: "Replace BG by prompt",
    taglineVi: "Thay nền mới, giữ chủ thể",
    taglineEn: "New background, keep subject",
    icon: Wand2,
    needsPrompt: true,
    promptLabelVi: "Mô tả nền mới",
    promptLabelEn: "Describe the new background",
    promptPlaceholderVi: "Ví dụ: bãi biển hoàng hôn, ánh sáng vàng cam",
    promptPlaceholderEn: "Example: sunset beach with warm orange light",
  },
  {
    id: "face-fix",
    modelId: "gfpgan",
    labelVi: "Phục hồi khuôn mặt",
    labelEn: "Face restore",
    taglineVi: "Sửa mặt mờ / cũ bằng GFPGAN",
    taglineEn: "Fix blurry or old faces with GFPGAN",
    icon: Smile,
  },
];

type Status =
  | { kind: "idle" }
  | { kind: "uploading" }
  | { kind: "submitting" }
  | { kind: "queued"; statusUrl: string; responseUrl: string }
  | { kind: "running"; statusUrl: string; responseUrl: string }
  | { kind: "error"; message: string };

type ResultAsset = {
  id: string;
  url: string;
  op: Op;
  opLabel: string;
  createdAt: number;
};

const photoCopy = {
  vi: {
    back: "Quay lại trang chủ",
    title: "Photo Fix",
    subtitle: "Sửa ảnh có sẵn — tách nền, làm nét, đổi nền, phục hồi khuôn mặt.",
    chooseOp: "Thao tác",
    sourceImage: "Ảnh đầu vào",
    sourceImageHint: "Dán URL hoặc tải ảnh từ máy",
    pasteUrl: "Dán URL ảnh",
    uploadFromDevice: "Tải từ máy",
    uploading: "Đang tải lên",
    uploadFailed: "Tải file lên thất bại",
    clearImage: "Bỏ ảnh",
    needImage: "Cần chọn ảnh đầu vào",
    needPrompt: "Cần mô tả nền mới",
    submit: "Chạy",
    runShortcut: "Ctrl + Enter để chạy",
    statusIdle: "Sẵn sàng",
    statusUploading: "Đang tải ảnh",
    statusSubmitting: "Đang gửi job",
    statusQueued: "Đang chờ",
    statusRunning: "Đang xử lý",
    statusError: "Có lỗi",
    download: "Tải về",
    copyUrl: "Sao chép URL",
    copied: "Đã chép",
    historyTitle: "Lịch sử",
    historyEmpty: "Lịch sử trống. Mỗi lần tạo xong sẽ lưu tại đây.",
    historyClear: "Xoá lịch sử",
    galleryEmpty: "Chưa có kết quả. Chọn thao tác và upload ảnh để bắt đầu.",
    uploaded: "Đã tải lên",
    remoteUrl: "Liên kết ngoài",
  },
  en: {
    back: "Back to home",
    title: "Photo Fix",
    subtitle: "Edit existing photos — remove BG, sharpen, replace BG, restore faces.",
    chooseOp: "Operation",
    sourceImage: "Source image",
    sourceImageHint: "Paste a URL or upload from your device",
    pasteUrl: "Paste image URL",
    uploadFromDevice: "Upload from device",
    uploading: "Uploading",
    uploadFailed: "Upload failed",
    clearImage: "Remove",
    needImage: "Source image is required",
    needPrompt: "New background description is required",
    submit: "Run",
    runShortcut: "Press Ctrl + Enter to run",
    statusIdle: "Ready",
    statusUploading: "Uploading",
    statusSubmitting: "Submitting",
    statusQueued: "Queued",
    statusRunning: "Processing",
    statusError: "Error",
    download: "Download",
    copyUrl: "Copy URL",
    copied: "Copied",
    historyTitle: "History",
    historyEmpty: "History is empty. Every render is saved here.",
    historyClear: "Clear history",
    galleryEmpty: "No outputs yet. Pick an operation and upload an image to begin.",
    uploaded: "Uploaded",
    remoteUrl: "Remote URL",
  },
} satisfies Record<WebLanguage, Record<string, string>>;

function extractAssets(payload: unknown): { url: string }[] {
  if (!payload || typeof payload !== "object") return [];
  const data = payload as Record<string, unknown>;
  const assets: { url: string }[] = [];
  if (Array.isArray(data.images)) {
    for (const img of data.images) {
      if (img && typeof img === "object") {
        const i = img as { url?: string };
        if (i.url) assets.push({ url: i.url });
      }
    }
  }
  if (data.image && typeof data.image === "object") {
    const i = data.image as { url?: string };
    if (i.url) assets.push({ url: i.url });
  }
  return assets;
}

const STORAGE_KEY = "mrnine-photofix-history";

export function PhotoFixShell() {
  const { language, setLanguage } = useLanguage();
  const copy = photoCopy[language];

  const [op, setOp] = useState<Op>("remove-bg");
  const [sourceImage, setSourceImage] = useState("");
  const [prompt, setPrompt] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [copiedId, setCopiedId] = useState("");
  const [results, setResults] = useState<ResultAsset[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as ResultAsset[];
      return Array.isArray(parsed)
        ? parsed
            .filter((item) => item && typeof item.url === "string" && typeof item.id === "string")
            .slice(0, 60)
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
      const parsed = JSON.parse(raw) as ResultAsset[];
      return Array.isArray(parsed) && parsed[0]?.id ? parsed[0].id : "";
    } catch {
      return "";
    }
  });

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pollRef = useRef<number | null>(null);
  const promptRef = useRef<HTMLTextAreaElement | null>(null);

  const activeOp = OPS.find((item) => item.id === op) ?? OPS[0];
  const activeAsset = activeId ? results.find((item) => item.id === activeId) ?? results[0] : results[0];

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(results.slice(0, 60)));
    } catch {
      // ignore
    }
  }, [results]);

  useEffect(() => {
    return () => {
      if (pollRef.current) {
        window.clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, []);

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
      setSourceImage(json.url as string);
      setStatus({ kind: "idle" });
    } catch (error) {
      setStatus({ kind: "error", message: error instanceof Error ? error.message : copy.uploadFailed });
    }
  }

  function startPolling(statusUrl: string, responseUrl: string) {
    if (pollRef.current) window.clearInterval(pollRef.current);
    pollRef.current = window.setInterval(async () => {
      try {
        const res = await fetch(`/api/ai-playground/status?url=${encodeURIComponent(statusUrl)}&mode=status`, { cache: "no-store" });
        const json = await safeParseJson(res);
        if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
        const queueStatus = String(json.data?.status ?? "").toUpperCase();
        if (queueStatus === "COMPLETED") {
          if (pollRef.current) {
            window.clearInterval(pollRef.current);
            pollRef.current = null;
          }
          await loadResult(responseUrl);
          return;
        }
        if (queueStatus === "IN_PROGRESS") {
          setStatus({ kind: "running", statusUrl, responseUrl });
        } else {
          setStatus({ kind: "queued", statusUrl, responseUrl });
        }
      } catch (error) {
        if (pollRef.current) {
          window.clearInterval(pollRef.current);
          pollRef.current = null;
        }
        setStatus({ kind: "error", message: error instanceof Error ? error.message : copy.statusError });
      }
    }, 2200);
  }

  async function loadResult(responseUrl: string) {
    try {
      const res = await fetch(`/api/ai-playground/status?url=${encodeURIComponent(responseUrl)}&mode=result`, { cache: "no-store" });
      const json = await safeParseJson(res);
      if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
      const found = extractAssets(json.data);
      if (!found.length) {
        setStatus({ kind: "error", message: copy.statusError });
        return;
      }
      const opLabel = language === "vi" ? activeOp.labelVi : activeOp.labelEn;
      const next: ResultAsset[] = found.map((asset, index) => ({
        id: `${Date.now()}-${index}`,
        url: asset.url,
        op,
        opLabel,
        createdAt: Date.now(),
      }));
      setResults((current) => [...next, ...current].slice(0, 60));
      setActiveId(next[0]?.id ?? "");
      setStatus({ kind: "idle" });
    } catch (error) {
      setStatus({ kind: "error", message: error instanceof Error ? error.message : copy.statusError });
    }
  }

  async function submit() {
    if (!sourceImage.trim()) {
      setStatus({ kind: "error", message: copy.needImage });
      return;
    }
    if (activeOp.needsPrompt && !prompt.trim()) {
      setStatus({ kind: "error", message: copy.needPrompt });
      return;
    }

    const url = sourceImage.trim();
    const payload: Record<string, unknown> = {};
    if (activeOp.id === "remove-bg") {
      payload.image_url = url;
    } else if (activeOp.id === "sharpen") {
      payload.image_url = url;
      payload.prompt = "high quality detailed photograph, crisp focus";
      payload.upscale_factor = 2;
    } else if (activeOp.id === "replace-bg") {
      payload.image_url = url;
      payload.bg_prompt = prompt.trim();
      payload.fast = true;
    } else if (activeOp.id === "face-fix") {
      payload.image_url = url;
      payload.version = "1.4";
      payload.scale = 2;
    }

    setStatus({ kind: "submitting" });
    try {
      const res = await fetch("/api/ai-playground/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modelId: activeOp.modelId, payload }),
      });
      const json = await safeParseJson(res);
      if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
      const statusUrl = json.statusUrl as string | undefined;
      const responseUrl = json.responseUrl as string | undefined;
      if (!statusUrl || !responseUrl) throw new Error(copy.statusError);
      setStatus({ kind: "queued", statusUrl, responseUrl });
      startPolling(statusUrl, responseUrl);
    } catch (error) {
      setStatus({ kind: "error", message: error instanceof Error ? error.message : copy.statusError });
    }
  }

  function handlePromptKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      void submit();
    }
  }

  function copyUrl(asset: ResultAsset) {
    void navigator.clipboard.writeText(asset.url);
    setCopiedId(asset.id);
    window.setTimeout(() => setCopiedId(""), 1500);
  }

  const isWorking =
    status.kind === "submitting" ||
    status.kind === "uploading" ||
    status.kind === "queued" ||
    status.kind === "running";

  return (
    <main className="relative flex h-screen flex-col overflow-hidden bg-[#0b0a08] text-[#e8dfd4]">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 16% 10%, rgba(214,165,72,0.16), transparent 28%), radial-gradient(circle at 78% 12%, rgba(239,68,68,0.1), transparent 24%), linear-gradient(180deg,#0d0c0a 0%,#070604 100%)",
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
            <ImageDown className="size-4" />
          </div>
          <div className="hidden min-w-0 sm:block">
            <p className="font-mono text-[0.58rem] uppercase tracking-[0.22em] text-[#d6a548]">MrNine Studio</p>
            <h1 className="truncate text-base font-black tracking-[-0.04em] text-[#f4eadc]">{copy.title}</h1>
          </div>
        </div>

        <nav className="ml-1 hidden flex-1 items-center justify-center gap-1 md:flex" aria-label="Operations">
          {OPS.map((item) => {
            const Icon = item.icon;
            const active = item.id === activeOp.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setOp(item.id)}
                aria-pressed={active}
                data-active={active}
                className={cn(
                  "playground-cap-pill flex h-10 items-center gap-2 rounded-md border px-3 font-mono text-[0.62rem] uppercase tracking-[0.16em] transition-[color,background-color,border-color,box-shadow] duration-300",
                  active
                    ? "border-[#d6a548]/50 bg-[#d6a548]/12 text-[#f0c86d] playground-capability-armed shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset]"
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
              : status.kind === "uploading"
                ? copy.statusUploading
                : status.kind === "submitting"
                  ? copy.statusSubmitting
                  : status.kind === "queued"
                    ? copy.statusQueued
                    : status.kind === "running"
                      ? copy.statusRunning
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
                  language === option.value ? "bg-[#d6a548] text-[#100b04]" : "text-[#9f968b] hover:text-[#f4eadc]",
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
          {OPS.map((item) => {
            const Icon = item.icon;
            const active = item.id === activeOp.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setOp(item.id)}
                className={cn(
                  "flex h-9 items-center gap-1.5 rounded-md border px-3 font-mono text-[0.6rem] uppercase tracking-[0.16em] transition",
                  active ? "border-[#d6a548]/50 bg-[#d6a548]/10 text-[#f0c86d]" : "border-[#25211b] text-[#9a9087]",
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
            <div className="rounded-lg border border-[#25211b] bg-[#0d0b08]/82 p-3">
              <div className="mb-2 flex items-center gap-2">
                <Layers className="size-3.5 text-[#9a9087]" />
                <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-[#d6a548]">{copy.chooseOp}</p>
              </div>
              <p className="text-[0.74rem] leading-5 text-[#b5ab9f]">
                {language === "vi" ? activeOp.taglineVi : activeOp.taglineEn}
              </p>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="block font-mono text-[0.58rem] uppercase tracking-[0.2em] text-[#d6a548]">
                  {copy.sourceImage}
                </label>
                {sourceImage ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSourceImage("");
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
                  value={sourceImage}
                  onChange={(event) => setSourceImage(event.target.value)}
                  placeholder={copy.pasteUrl}
                  className="min-w-0 flex-1 rounded-md border border-[#2a251f] bg-[#0c0a08] px-3 py-2 font-mono text-[0.78rem] text-[#f4eadc] outline-none transition focus:border-[#d6a548]/60"
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
              {sourceImage ? (
                <div className="mt-2 flex items-center gap-3 rounded-md border border-[#25211b] bg-[#0c0a08] p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={sourceImage}
                    alt="source preview"
                    className="size-16 shrink-0 rounded border border-white/8 bg-black object-cover"
                  />
                  <div className="min-w-0 flex-1 font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[#cfc4b8]">
                    {sourceImage.startsWith("https://v3.fal.media") ? copy.uploaded : copy.remoteUrl}
                  </div>
                </div>
              ) : null}
              <p className="mt-1.5 font-mono text-[0.55rem] uppercase tracking-[0.16em] text-[#756d64]">
                {copy.sourceImageHint}
              </p>
            </div>

            {activeOp.needsPrompt ? (
              <div>
                <label className="mb-1.5 block font-mono text-[0.58rem] uppercase tracking-[0.2em] text-[#d6a548]">
                  {language === "vi" ? activeOp.promptLabelVi : activeOp.promptLabelEn}
                </label>
                <textarea
                  ref={promptRef}
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  onKeyDown={handlePromptKeyDown}
                  rows={4}
                  placeholder={language === "vi" ? activeOp.promptPlaceholderVi : activeOp.promptPlaceholderEn}
                  className="playground-textarea-active min-h-[6rem] w-full resize-y rounded-md border border-[#2a251f] bg-[#0c0a08] p-3 text-sm leading-6 text-[#f4eadc] outline-none focus:border-[#d6a548]/60 focus:bg-[#120c09]"
                />
                <div className="mt-1.5 font-mono text-[0.55rem] uppercase tracking-[0.16em] text-[#756d64]">
                  {copy.runShortcut}
                </div>
              </div>
            ) : null}
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
                  {status.kind === "uploading"
                    ? copy.statusUploading
                    : status.kind === "submitting"
                      ? copy.statusSubmitting
                      : status.kind === "queued"
                        ? copy.statusQueued
                        : copy.statusRunning}
                </span>
              </div>
            ) : null}
            <button
              type="button"
              onClick={submit}
              disabled={isWorking}
              className={cn(
                "flex h-12 w-full items-center justify-center gap-2 rounded-md font-mono text-[0.72rem] font-bold uppercase tracking-[0.18em] transition-[transform,background-color,box-shadow] duration-300",
                "active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d6a548]/70",
                isWorking ? "playground-loading-shimmer" : "playground-run-armed",
                "bg-[#d6a548] text-[#100b04] hover:bg-[#e8b859]",
              )}
            >
              {isWorking ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />}
              {copy.submit}
            </button>
          </div>
        </aside>

        <section className="grid min-h-0 grid-cols-1 overflow-hidden xl:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="flex-1 overflow-y-auto px-4 py-4 md:px-6">
            {activeAsset ? (
              <div className="mx-auto flex h-full max-w-5xl flex-col">
                <div className="relative flex flex-1 items-center justify-center overflow-hidden rounded-lg border border-[#25211b] bg-black shadow-[0_24px_80px_rgba(0,0,0,0.5)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    key={activeAsset.id}
                    src={activeAsset.url}
                    alt="result"
                    className="playground-result-arrive max-h-full max-w-full object-contain"
                  />
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-md border border-[#25211b] bg-[#0c0a08] px-3 py-2.5">
                  <div className="min-w-0">
                    <span className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-[#d6a548]">{activeAsset.opLabel}</span>
                    <span className="ml-3 font-mono text-[0.5rem] uppercase tracking-[0.18em] text-[#756d64]">
                      {new Date(activeAsset.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <a
                      href={activeAsset.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex h-9 items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.03] px-3 font-mono text-[0.58rem] uppercase tracking-[0.16em] text-[#cfc4b8] transition hover:bg-white/[0.06]"
                    >
                      <Download className="size-3.5" />
                      {copy.download}
                    </a>
                    <button
                      type="button"
                      onClick={() => copyUrl(activeAsset)}
                      className={cn(
                        "flex h-9 items-center gap-1.5 rounded-md border px-3 font-mono text-[0.58rem] uppercase tracking-[0.16em] transition",
                        copiedId === activeAsset.id
                          ? "border-[#45a85d]/45 bg-[#45a85d]/14 text-[#dff8e4]"
                          : "border-white/10 bg-white/[0.03] text-[#cfc4b8] hover:bg-white/[0.06]",
                      )}
                    >
                      <Copy className="size-3.5" />
                      {copiedId === activeAsset.id ? copy.copied : copy.copyUrl}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mx-auto flex h-full max-w-3xl flex-col items-center justify-center text-center">
                <div className="playground-fade-in flex size-14 items-center justify-center rounded-md border border-[#d6a548]/35 bg-[#d6a548]/10">
                  <ImageDown className="size-6 animate-pulse text-[#d6a548]" />
                </div>
                <h3 className="playground-fade-in mt-4 max-w-xl text-2xl font-black tracking-[-0.04em] text-[#f4eadc]" style={{ animationDelay: "60ms" }}>
                  {copy.title}
                </h3>
                <p className="playground-fade-in mt-1 max-w-md text-sm leading-6 text-[#b5ab9f]" style={{ animationDelay: "120ms" }}>
                  {copy.galleryEmpty}
                </p>
              </div>
            )}
          </div>

          <aside className="hidden min-h-0 flex-col border-l border-[#25211b] bg-[#0a0907]/72 xl:flex">
            <div className="flex shrink-0 items-center justify-between border-b border-[#25211b] px-4 py-3">
              <div>
                <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-[#d6a548]">{copy.historyTitle}</p>
                <p className="mt-0.5 font-mono text-[0.5rem] uppercase tracking-[0.18em] text-[#756d64]">
                  {results.length} / 60
                </p>
              </div>
              {results.length > 0 ? (
                <button
                  type="button"
                  onClick={clearHistory}
                  aria-label={copy.historyClear}
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
                <div className="grid grid-cols-2 gap-2">
                  {results.map((asset) => {
                    const active = asset.id === (activeAsset?.id ?? "");
                    return (
                      <button
                        key={asset.id}
                        type="button"
                        onClick={() => setActiveId(asset.id)}
                        title={asset.opLabel}
                        className={cn(
                          "playground-thumb group relative aspect-square overflow-hidden rounded-md border bg-black text-left",
                          active ? "border-[#d6a548]/60 ring-2 ring-[#d6a548]/70" : "border-[#25211b] hover:border-white/20",
                        )}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={asset.url} alt={asset.opLabel} className="size-full object-cover" />
                        <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/80 to-transparent px-1.5 pb-1 pt-3 text-[0.55rem] text-[#cfc4b8]">
                          {asset.opLabel}
                        </span>
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

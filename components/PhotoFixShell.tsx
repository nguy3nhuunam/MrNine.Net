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
  TriangleAlert,
  Upload,
  Wand2,
  X,
} from "lucide-react";
import { languageOptions, useLanguage, type WebLanguage } from "@/components/LanguageProvider";
import { cn } from "@/lib/utils";

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
    labelVi: "Làm nét + nâng cấp",
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
  createdAt: number;
};

const photoCopy = {
  vi: {
    back: "Quay lại trang chủ",
    title: "Photo Fix",
    subtitle: "Sửa ảnh có sẵn: tách nền, làm nét, đổi nền và phục hồi khuôn mặt.",
    chooseOp: "Chọn thao tác",
    sourceImage: "Ảnh nguồn",
    pasteUrl: "Dán URL ảnh",
    uploadFromDevice: "Tải từ máy",
    uploading: "Đang tải lên...",
    uploadFailed: "Tải file lên thất bại",
    clearImage: "Bỏ ảnh",
    needImage: "Cần chọn ảnh đầu vào",
    needPrompt: "Cần mô tả nền mới",
    submit: "Chạy",
    statusIdle: "Sẵn sàng",
    statusSubmitting: "Đang gửi job...",
    statusQueued: "Đang chờ",
    statusRunning: "Đang xử lý",
    statusError: "Có lỗi",
    download: "Tải về",
    copyUrl: "Sao chép URL",
    copied: "Đã chép",
    sourcePreview: "Ảnh nguồn",
    resultPreview: "Kết quả",
    galleryEmpty: "Chưa có kết quả. Chọn thao tác và upload ảnh để bắt đầu.",
  },
  en: {
    back: "Back to home",
    title: "Photo Fix",
    subtitle: "Edit existing photos: remove BG, sharpen, replace BG, restore faces.",
    chooseOp: "Pick an operation",
    sourceImage: "Source image",
    pasteUrl: "Paste image URL",
    uploadFromDevice: "Upload from device",
    uploading: "Uploading...",
    uploadFailed: "Upload failed",
    clearImage: "Remove",
    needImage: "Source image is required",
    needPrompt: "New background description is required",
    submit: "Run",
    statusIdle: "Ready",
    statusSubmitting: "Submitting...",
    statusQueued: "Queued",
    statusRunning: "Processing",
    statusError: "Error",
    download: "Download",
    copyUrl: "Copy URL",
    copied: "Copied",
    sourcePreview: "Source",
    resultPreview: "Result",
    galleryEmpty: "No outputs yet. Pick an operation and upload an image to begin.",
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

export function PhotoFixShell() {
  const { language, setLanguage } = useLanguage();
  const copy = photoCopy[language];
  const [op, setOp] = useState<Op>("remove-bg");
  const [sourceImage, setSourceImage] = useState("");
  const [prompt, setPrompt] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [results, setResults] = useState<ResultAsset[]>([]);
  const [activeId, setActiveId] = useState("");
  const [copiedId, setCopiedId] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pollRef = useRef<number | null>(null);
  const activeOp = OPS.find((item) => item.id === op) ?? OPS[0];
  const activeAsset = activeId ? results.find((item) => item.id === activeId) ?? results[0] : results[0];

  useEffect(() => {
    return () => {
      if (pollRef.current) {
        window.clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, []);

  async function uploadFile(file: File) {
    setStatus({ kind: "uploading" });
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/ai-playground/upload", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok || !json?.url) {
        throw new Error(json?.error || copy.uploadFailed);
      }
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
        const json = await res.json();
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
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
      const found = extractAssets(json.data);
      if (!found.length) {
        setStatus({ kind: "error", message: copy.statusError });
        return;
      }
      const next: ResultAsset[] = found.map((asset, index) => ({
        id: `${Date.now()}-${index}`,
        url: asset.url,
        op,
        createdAt: Date.now(),
      }));
      setResults((current) => [...next, ...current].slice(0, 24));
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

    const payload: Record<string, unknown> = {};
    const url = sourceImage.trim();

    if (activeOp.id === "remove-bg") {
      payload.image_url = url;
    } else if (activeOp.id === "sharpen") {
      payload.image_url = url;
      payload.prompt = "high quality detailed photograph, crisp focus";
      payload.upscale_factor = 2;
    } else if (activeOp.id === "replace-bg") {
      payload.image_url = url;
      payload.ref_image_url = prompt.trim();
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
      const json = await res.json();
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
    <main className="relative min-h-screen overflow-x-hidden bg-[#0b0a08] pb-12 text-[#e8dfd4]">
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

      <header className="relative z-20 flex h-14 items-center border-b border-[#25211b] bg-[#0a0907]/92 px-4 backdrop-blur md:px-6">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            aria-label={copy.back}
            className="flex size-9 items-center justify-center rounded-md border border-white/10 text-[#a79d91] transition hover:border-[#d6a548]/40 hover:text-[#f4eadc]"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div className="flex size-9 items-center justify-center rounded-md border border-[#d6a548]/30 bg-[#d6a548]/10 text-[#d6a548]">
            <ImageDown className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="font-mono text-[0.6rem] uppercase tracking-[0.22em] text-[#d6a548]">MrNine Studio</p>
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

      <div className="relative z-10 mx-auto max-w-[88rem] px-4 pt-6 sm:px-6 lg:px-8">
        <div className="mb-5">
          <p className="font-mono text-[0.62rem] uppercase tracking-[0.28em] text-[#8f8579]">{copy.title}</p>
          <h2 className="mt-1 max-w-2xl text-2xl font-black leading-tight tracking-[-0.04em] text-[#f4eadc] sm:text-3xl">
            {copy.subtitle}
          </h2>
        </div>

        <div className="grid gap-5 lg:grid-cols-[19rem_minmax(0,1fr)]">
          <aside className="space-y-3">
            <div className="rounded-lg border border-[#25211b] bg-[#0d0b08]/82 p-3">
              <div className="mb-2 flex items-center gap-2">
                <Layers className="size-3.5 text-[#9a9087]" />
                <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-[#d6a548]">{copy.chooseOp}</p>
              </div>
              <div className="space-y-1.5">
                {OPS.map((item) => {
                  const Icon = item.icon;
                  const selected = item.id === activeOp.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setOp(item.id)}
                      className={cn(
                        "flex w-full items-start gap-3 rounded-md border px-3 py-2.5 text-left transition",
                        selected
                          ? "border-[#d6a548]/50 bg-[#1b1508]"
                          : "border-[#25211b] hover:border-white/20 hover:bg-white/[0.03]",
                      )}
                    >
                      <div
                        className={cn(
                          "flex size-8 shrink-0 items-center justify-center rounded-md border",
                          selected ? "border-[#d6a548]/40 bg-[#d6a548]/15 text-[#d6a548]" : "border-white/10 text-[#9a9087]",
                        )}
                      >
                        <Icon className="size-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[0.85rem] font-bold text-[#f4eadc]">
                          {language === "vi" ? item.labelVi : item.labelEn}
                        </div>
                        <p className="mt-0.5 line-clamp-2 text-[0.7rem] leading-5 text-[#b5ab9f]">
                          {language === "vi" ? item.taglineVi : item.taglineEn}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>

          <section className="space-y-4">
            <div className="rounded-lg border border-[#25211b] bg-[#0d0b08]/82 p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-[#d6a548]">{copy.sourceImage}</p>
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
                  className="min-w-0 flex-1 rounded-md border border-[#2a251f] bg-[#0c0a08] px-3 py-2 font-mono text-[0.78rem] text-[#f4eadc] outline-none focus:border-[#d6a548]/60"
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
                  className="flex h-10 shrink-0 items-center justify-center gap-2 rounded-md border border-[#45a85d]/35 bg-[#45a85d]/10 px-3 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-[#dff8e4] transition hover:border-[#45a85d]/60 hover:bg-[#45a85d]/16 disabled:opacity-60"
                >
                  {status.kind === "uploading" ? <LoaderCircle className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
                  {status.kind === "uploading" ? copy.uploading : copy.uploadFromDevice}
                </button>
              </div>

              {sourceImage ? (
                <div className="mt-3 overflow-hidden rounded-md border border-[#25211b] bg-black">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={sourceImage} alt="source" className="max-h-72 w-full object-contain" />
                </div>
              ) : null}

              {activeOp.needsPrompt ? (
                <div className="mt-3">
                  <label className="mb-1 block font-mono text-[0.58rem] uppercase tracking-[0.18em] text-[#d6a548]">
                    {language === "vi" ? activeOp.promptLabelVi : activeOp.promptLabelEn}
                  </label>
                  <textarea
                    value={prompt}
                    onChange={(event) => setPrompt(event.target.value)}
                    rows={3}
                    placeholder={language === "vi" ? activeOp.promptPlaceholderVi : activeOp.promptPlaceholderEn}
                    className="w-full resize-y rounded-md border border-[#2a251f] bg-[#0c0a08] p-3 text-sm leading-6 text-[#f4eadc] outline-none focus:border-[#d6a548]/60"
                  />
                </div>
              ) : null}

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
                  className="flex h-11 items-center gap-2 rounded-md bg-[#d6a548] px-5 font-mono text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#100b04] transition hover:bg-[#e8b859] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isWorking ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />}
                  {copy.submit}
                </button>
              </div>
            </div>

            <div className="rounded-lg border border-[#25211b] bg-[#0d0b08]/82 p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-[#45a85d]">{copy.resultPreview}</p>
                <span className="font-mono text-[0.55rem] uppercase tracking-[0.16em] text-[#756d64]">{results.length}</span>
              </div>
              {!activeAsset ? (
                <div className="rounded-md border border-dashed border-[#2a251f] bg-[#100d0a]/40 px-3 py-10 text-center text-[0.78rem] leading-6 text-[#9a9087]">
                  {copy.galleryEmpty}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="overflow-hidden rounded-md border border-[#25211b] bg-black">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={activeAsset.url} alt="result" className="max-h-[60vh] w-full object-contain" />
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-1.5">
                    <a
                      href={activeAsset.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex h-8 items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.03] px-3 font-mono text-[0.55rem] uppercase tracking-[0.16em] text-[#cfc4b8] transition hover:bg-white/[0.06]"
                    >
                      <Download className="size-3.5" />
                      {copy.download}
                    </a>
                    <button
                      type="button"
                      onClick={() => copyUrl(activeAsset)}
                      className={cn(
                        "flex h-8 items-center gap-1.5 rounded-md border px-3 font-mono text-[0.55rem] uppercase tracking-[0.16em] transition",
                        copiedId === activeAsset.id
                          ? "border-[#45a85d]/45 bg-[#45a85d]/14 text-[#dff8e4]"
                          : "border-white/10 bg-white/[0.03] text-[#cfc4b8] hover:bg-white/[0.06]",
                      )}
                    >
                      <Copy className="size-3.5" />
                      {copiedId === activeAsset.id ? copy.copied : copy.copyUrl}
                    </button>
                  </div>
                  {results.length > 1 ? (
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {results.map((asset) => (
                        <button
                          key={asset.id}
                          type="button"
                          onClick={() => setActiveId(asset.id)}
                          className={cn(
                            "size-16 shrink-0 overflow-hidden rounded-md border bg-black",
                            asset.id === activeAsset.id ? "border-[#d6a548]/60" : "border-[#25211b] hover:border-white/20",
                          )}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={asset.url} alt="thumb" className="size-full object-cover" />
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

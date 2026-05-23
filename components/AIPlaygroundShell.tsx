"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ChevronDown,
  Clapperboard,
  Copy,
  Download,
  ImageIcon,
  Layers,
  LoaderCircle,
  Send,
  Sparkles,
  Sliders,
  TriangleAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { languageOptions, useLanguage, type WebLanguage } from "@/components/LanguageProvider";
import { cn } from "@/lib/utils";
import {
  imageModels,
  videoModels,
  type FalModel,
  type FalParamSpec,
} from "@/lib/fal-models";

type Tab = "image" | "video";

type GeneratedAsset = {
  id: string;
  url: string;
  kind: "image" | "video";
  modelLabel: string;
  prompt: string;
  createdAt: number;
};

type ParamValues = Record<string, string | number | boolean>;

type Status =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "queued"; requestId: string; queuePos?: number; logs: string[] }
  | { kind: "running"; requestId: string; logs: string[] }
  | { kind: "error"; message: string };

const playgroundCopy = {
  vi: {
    back: "Quay lại trang chủ",
    title: "AI Playground",
    subtitle: "Tạo ảnh và video bằng các model mới nhất của FAL.AI",
    image: "Tạo ảnh",
    video: "Tạo video",
    modelHeader: "Chọn model",
    modelHint: "Chỉ hiển thị các model nổi bật và mới nhất",
    paramsHeader: "Thông số",
    advanced: "Nâng cao",
    advancedShow: "Hiện",
    advancedHide: "Ẩn",
    promptLabel: "Mô tả chi tiết, càng cụ thể càng tốt",
    sourceImage: "Ảnh đầu vào",
    sourceImageHint: "Dán URL ảnh công khai (jpg/png/webp)",
    submit: "Bắt đầu render",
    submitImage: "Tạo ảnh",
    submitVideo: "Render video",
    cancel: "Huỷ",
    queue: "Hàng đợi FAL",
    statusIdle: "Sẵn sàng nhận lệnh",
    statusSubmitting: "Đang gửi job...",
    statusQueued: "Đang chờ trong hàng đợi FAL",
    statusRunning: "FAL đang xử lý",
    statusError: "Có lỗi xảy ra",
    requestId: "Request ID",
    queuePos: "Vị trí",
    gallery: "Kết quả",
    galleryEmpty: "Chưa có kết quả nào. Mỗi job sẽ được lưu ở đây trong phiên hiện tại.",
    download: "Tải về",
    open: "Mở",
    copyUrl: "Sao chép URL",
    copied: "Đã chép",
    needPrompt: "Cần nhập prompt",
    needImage: "Model này yêu cầu URL ảnh nguồn",
    yes: "Bật",
    no: "Tắt",
  },
  en: {
    back: "Back to home",
    title: "AI Playground",
    subtitle: "Generate images and video with the latest FAL.AI models",
    image: "Image",
    video: "Video",
    modelHeader: "Pick a model",
    modelHint: "Curated, latest and most popular models only",
    paramsHeader: "Parameters",
    advanced: "Advanced",
    advancedShow: "Show",
    advancedHide: "Hide",
    promptLabel: "Describe what you want — be specific",
    sourceImage: "Source image",
    sourceImageHint: "Paste a public image URL (jpg/png/webp)",
    submit: "Start render",
    submitImage: "Generate image",
    submitVideo: "Render video",
    cancel: "Cancel",
    queue: "FAL queue",
    statusIdle: "Idle, ready for command",
    statusSubmitting: "Submitting job...",
    statusQueued: "Waiting in FAL queue",
    statusRunning: "FAL is processing",
    statusError: "Something went wrong",
    requestId: "Request ID",
    queuePos: "Position",
    gallery: "Output",
    galleryEmpty: "No outputs yet. Every job is saved here for this session.",
    download: "Download",
    open: "Open",
    copyUrl: "Copy URL",
    copied: "Copied",
    needPrompt: "Prompt is required",
    needImage: "This model needs a source image URL",
    yes: "On",
    no: "Off",
  },
} satisfies Record<WebLanguage, Record<string, string>>;

function buildDefaults(model: FalModel): ParamValues {
  const values: ParamValues = {};
  for (const spec of model.params) {
    if (spec.default !== undefined) {
      values[spec.key] = spec.default;
    } else if (spec.type === "boolean") {
      values[spec.key] = false;
    } else {
      values[spec.key] = "";
    }
  }
  return values;
}

function extractAssets(payload: unknown): { url: string; contentType?: string }[] {
  if (!payload || typeof payload !== "object") return [];
  const data = payload as Record<string, unknown>;
  const assets: { url: string; contentType?: string }[] = [];

  if (data.video && typeof data.video === "object") {
    const v = data.video as { url?: string; content_type?: string };
    if (v.url) assets.push({ url: v.url, contentType: v.content_type });
  }

  if (Array.isArray(data.images)) {
    for (const img of data.images) {
      if (img && typeof img === "object") {
        const i = img as { url?: string; content_type?: string };
        if (i.url) assets.push({ url: i.url, contentType: i.content_type });
      }
    }
  }

  if (data.image && typeof data.image === "object") {
    const i = data.image as { url?: string; content_type?: string };
    if (i.url) assets.push({ url: i.url, contentType: i.content_type });
  }

  return assets;
}

function ParamControl({
  spec,
  value,
  onChange,
}: Readonly<{
  spec: FalParamSpec;
  value: string | number | boolean;
  onChange: (next: string | number | boolean) => void;
}>) {
  const inputClasses =
    "w-full rounded-md border border-[#2a251f] bg-[#0c0a08] px-3 py-2 font-mono text-[0.78rem] text-[#f4eadc] outline-none transition focus:border-[#ef4444]/60 focus:bg-[#120c09]";

  if (spec.type === "boolean") {
    const on = Boolean(value);
    return (
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={() => onChange(!on)}
        className={cn(
          "flex h-9 w-full items-center justify-between rounded-md border px-3 font-mono text-[0.66rem] uppercase tracking-[0.16em] transition",
          on
            ? "border-[#45a85d]/50 bg-[#45a85d]/10 text-[#dff8e4]"
            : "border-[#2a251f] bg-[#0c0a08] text-[#9a9087] hover:border-white/20",
        )}
      >
        <span>{spec.label}</span>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[0.58rem]",
            on ? "bg-[#45a85d]/22 text-[#dff8e4]" : "bg-white/5 text-[#9a9087]",
          )}
        >
          {on ? "ON" : "OFF"}
        </span>
      </button>
    );
  }

  if (spec.type === "select" && spec.options) {
    return (
      <div className="relative">
        <select
          value={String(value)}
          onChange={(event) => onChange(event.target.value)}
          className={cn(inputClasses, "appearance-none pr-8")}
        >
          {spec.options.map((option) => (
            <option key={String(option.value)} value={String(option.value)}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-3.5 -translate-y-1/2 text-[#9a9087]" />
      </div>
    );
  }

  if (spec.type === "number") {
    return (
      <input
        type="number"
        value={value === "" ? "" : Number(value)}
        min={spec.min}
        max={spec.max}
        step={spec.step ?? 1}
        onChange={(event) => {
          const v = event.target.value;
          onChange(v === "" ? "" : Number(v));
        }}
        className={inputClasses}
      />
    );
  }

  if (spec.type === "textarea") {
    return (
      <textarea
        rows={3}
        value={String(value ?? "")}
        onChange={(event) => onChange(event.target.value)}
        className={cn(inputClasses, "min-h-[3.5rem] resize-y leading-6")}
      />
    );
  }

  return (
    <input
      type="text"
      value={String(value ?? "")}
      onChange={(event) => onChange(event.target.value)}
      className={inputClasses}
    />
  );
}

export function AIPlaygroundShell() {
  const { language, setLanguage } = useLanguage();
  const copy = playgroundCopy[language];
  const [tab, setTab] = useState<Tab>("image");
  const [imageModelId, setImageModelId] = useState(imageModels[0].id);
  const [videoModelId, setVideoModelId] = useState(videoModels[0].id);
  const [prompt, setPrompt] = useState("");
  const [sourceImage, setSourceImage] = useState("");
  const [paramsByModel, setParamsByModel] = useState<Record<string, ParamValues>>(() => {
    const map: Record<string, ParamValues> = {};
    for (const model of [...imageModels, ...videoModels]) {
      map[model.id] = buildDefaults(model);
    }
    return map;
  });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [assets, setAssets] = useState<GeneratedAsset[]>([]);
  const [copiedId, setCopiedId] = useState("");
  const pollRef = useRef<number | null>(null);

  const activeModelId = tab === "image" ? imageModelId : videoModelId;
  const activeModel = useMemo(() => {
    const list = tab === "image" ? imageModels : videoModels;
    return list.find((model) => model.id === activeModelId) ?? list[0];
  }, [tab, activeModelId]);
  const activeParams = paramsByModel[activeModel.id] ?? buildDefaults(activeModel);

  useEffect(() => {
    return () => {
      if (pollRef.current) {
        window.clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, []);

  function updateParam(key: string, value: string | number | boolean) {
    setParamsByModel((current) => ({
      ...current,
      [activeModel.id]: {
        ...(current[activeModel.id] ?? buildDefaults(activeModel)),
        [key]: value,
      },
    }));
  }

  function startPolling(modelId: string, requestId: string) {
    if (pollRef.current) {
      window.clearInterval(pollRef.current);
    }

    pollRef.current = window.setInterval(async () => {
      try {
        const res = await fetch(
          `/api/ai-playground/status?modelId=${encodeURIComponent(modelId)}&requestId=${encodeURIComponent(requestId)}&mode=status`,
          { cache: "no-store" },
        );
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json?.error || `HTTP ${res.status}`);
        }

        const data = json.data ?? {};
        const queueStatus = String(data.status ?? "").toUpperCase();
        const logs: string[] = Array.isArray(data.logs)
          ? data.logs
              .map((l: unknown) =>
                l && typeof l === "object" && "message" in (l as object)
                  ? String((l as { message: unknown }).message ?? "")
                  : "",
              )
              .filter(Boolean)
          : [];
        const queuePos: number | undefined =
          typeof data.queue_position === "number" ? data.queue_position : undefined;

        if (queueStatus === "COMPLETED") {
          if (pollRef.current) {
            window.clearInterval(pollRef.current);
            pollRef.current = null;
          }
          await loadResult(modelId, requestId);
          return;
        }

        if (queueStatus === "IN_PROGRESS") {
          setStatus({ kind: "running", requestId, logs });
        } else {
          setStatus({ kind: "queued", requestId, queuePos, logs });
        }
      } catch (error) {
        if (pollRef.current) {
          window.clearInterval(pollRef.current);
          pollRef.current = null;
        }
        setStatus({
          kind: "error",
          message: error instanceof Error ? error.message : "Polling thất bại",
        });
      }
    }, 2200);
  }

  async function loadResult(modelId: string, requestId: string) {
    try {
      const res = await fetch(
        `/api/ai-playground/status?modelId=${encodeURIComponent(modelId)}&requestId=${encodeURIComponent(requestId)}&mode=result`,
        { cache: "no-store" },
      );
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error || `HTTP ${res.status}`);
      }

      const found = extractAssets(json.data);
      const model = [...imageModels, ...videoModels].find((m) => m.id === modelId) ?? activeModel;

      if (!found.length) {
        setStatus({
          kind: "error",
          message: "FAL trả về nhưng không có file media nào",
        });
        return;
      }

      const next: GeneratedAsset[] = found.map((asset, index) => ({
        id: `${requestId}-${index}-${Date.now()}`,
        url: asset.url,
        kind: model.outputKind,
        modelLabel: model.label,
        prompt,
        createdAt: Date.now(),
      }));

      setAssets((current) => [...next, ...current].slice(0, 24));
      setStatus({ kind: "idle" });
    } catch (error) {
      setStatus({
        kind: "error",
        message: error instanceof Error ? error.message : "Không lấy được kết quả",
      });
    }
  }

  async function submit() {
    const trimmed = prompt.trim();
    if (!trimmed) {
      setStatus({ kind: "error", message: copy.needPrompt });
      return;
    }

    if (activeModel.needsImage && !sourceImage.trim()) {
      setStatus({ kind: "error", message: copy.needImage });
      return;
    }

    const payload: Record<string, unknown> = {
      [activeModel.promptKey]: trimmed,
    };
    if (activeModel.needsImage && activeModel.imageKey) {
      payload[activeModel.imageKey] = sourceImage.trim();
    }
    for (const spec of activeModel.params) {
      const value = activeParams[spec.key];
      if (value === "" || value === undefined || value === null) continue;
      payload[spec.key] = value;
    }

    setStatus({ kind: "submitting" });

    try {
      const res = await fetch("/api/ai-playground/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modelId: activeModel.id, payload }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error || `HTTP ${res.status}`);
      }
      const requestId = json.requestId as string;
      setStatus({ kind: "queued", requestId, logs: [] });
      startPolling(activeModel.id, requestId);
    } catch (error) {
      setStatus({
        kind: "error",
        message: error instanceof Error ? error.message : "Submit thất bại",
      });
    }
  }

  const isWorking = status.kind === "submitting" || status.kind === "queued" || status.kind === "running";
  const accent =
    activeModel.outputKind === "video"
      ? { text: "text-[#47c9d9]", bg: "bg-[#47c9d9]/10", border: "border-[#47c9d9]/30", dot: "bg-[#47c9d9]" }
      : { text: "text-[#ef4444]", bg: "bg-[#ef4444]/10", border: "border-[#ef4444]/30", dot: "bg-[#ef4444]" };

  const coreParams = activeModel.params.filter((p) => p.group !== "advanced");
  const advancedParams = activeModel.params.filter((p) => p.group === "advanced");

  function copyUrl(asset: GeneratedAsset) {
    void navigator.clipboard.writeText(asset.url);
    setCopiedId(asset.id);
    window.setTimeout(() => setCopiedId(""), 1500);
  }

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#0b0a08] pb-12 text-[#e8dfd4]">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 16% 10%, rgba(69,168,93,0.14), transparent 28%), radial-gradient(circle at 78% 12%, rgba(239,68,68,0.1), transparent 24%), linear-gradient(180deg,#0d0c0a 0%,#070604 100%)",
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
            className="flex size-9 items-center justify-center rounded-md border border-white/10 text-[#a79d91] transition hover:border-[#ef4444]/40 hover:text-[#f4eadc]"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div className="flex size-9 items-center justify-center rounded-md border border-[#ef4444]/30 bg-[#ef4444]/10 text-[#ef4444]">
            <Sparkles className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="font-mono text-[0.6rem] uppercase tracking-[0.22em] text-[#ef4444]">
              MrNine / FAL.AI
            </p>
            <h1 className="truncate text-lg font-black tracking-[-0.04em] text-[#f4eadc]">{copy.title}</h1>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 font-mono text-[0.58rem] uppercase tracking-[0.16em] text-[#9f968b] sm:flex">
            <span
              className={cn(
                "size-1.5 rounded-full",
                status.kind === "error"
                  ? "bg-[#ef4444]"
                  : isWorking
                    ? "bg-[#d6a548] animate-pulse"
                    : "bg-[#45a85d]",
              )}
            />
            {status.kind === "error"
              ? copy.statusError
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
                  language === option.value ? "bg-[#ef4444] text-[#090807]" : "text-[#9f968b] hover:text-[#f4eadc]",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="relative z-10 mx-auto max-w-[88rem] px-4 pt-6 sm:px-6 lg:px-8">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-[0.62rem] uppercase tracking-[0.28em] text-[#8f8579]">{copy.title}</p>
            <h2 className="mt-1 max-w-2xl text-2xl font-black leading-tight tracking-[-0.04em] text-[#f4eadc] sm:text-3xl">
              {copy.subtitle}
            </h2>
          </div>
          <div className="flex rounded-md border border-[#25211b] bg-[#0d0b08]/82 p-1 font-mono text-[0.62rem] uppercase tracking-[0.16em]">
            <button
              type="button"
              onClick={() => setTab("image")}
              className={cn(
                "flex items-center gap-2 rounded px-3 py-2 transition",
                tab === "image"
                  ? "bg-[#ef4444]/12 text-[#ffd7d3] shadow-[0_0_0_1px_rgba(239,68,68,0.4)_inset]"
                  : "text-[#9a9087] hover:text-[#f4eadc]",
              )}
            >
              <ImageIcon className="size-3.5" />
              {copy.image}
            </button>
            <button
              type="button"
              onClick={() => setTab("video")}
              className={cn(
                "flex items-center gap-2 rounded px-3 py-2 transition",
                tab === "video"
                  ? "bg-[#47c9d9]/12 text-[#cdf3fb] shadow-[0_0_0_1px_rgba(71,201,217,0.4)_inset]"
                  : "text-[#9a9087] hover:text-[#f4eadc]",
              )}
            >
              <Clapperboard className="size-3.5" />
              {copy.video}
            </button>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[19rem_minmax(0,1fr)]">
          <aside className="space-y-3">
            <div className="rounded-lg border border-[#25211b] bg-[#0d0b08]/82 p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-[#d6a548]">
                  {copy.modelHeader}
                </p>
                <Layers className="size-3.5 text-[#9a9087]" />
              </div>
              <p className="mb-3 text-[0.7rem] leading-5 text-[#9a9087]">{copy.modelHint}</p>
              <div className="space-y-1.5">
                {(tab === "image" ? imageModels : videoModels).map((model) => {
                  const selected = activeModel.id === model.id;
                  return (
                    <button
                      key={model.id}
                      type="button"
                      onClick={() => {
                        if (tab === "image") setImageModelId(model.id);
                        else setVideoModelId(model.id);
                      }}
                      className={cn(
                        "group w-full rounded-md border px-3 py-2.5 text-left transition",
                        selected
                          ? cn("bg-[#14100d]", accent.border)
                          : "border-[#25211b] hover:border-white/20 hover:bg-white/[0.03]",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-[0.86rem] font-bold text-[#f4eadc]">{model.label}</span>
                            {model.badge ? (
                              <span
                                className={cn(
                                  "rounded border px-1.5 py-0.5 font-mono text-[0.5rem] tracking-[0.18em]",
                                  selected ? cn(accent.text, accent.border) : "border-white/10 text-[#9a9087]",
                                )}
                              >
                                {model.badge}
                              </span>
                            ) : null}
                          </div>
                          <div className="mt-0.5 truncate font-mono text-[0.55rem] uppercase tracking-[0.16em] text-[#9a9087]">
                            {model.vendor}
                          </div>
                          <p className="mt-1 line-clamp-2 text-[0.7rem] leading-5 text-[#b5ab9f]">{model.tagline}</p>
                        </div>
                        <span
                          className={cn(
                            "mt-1 size-2 shrink-0 rounded-full",
                            selected ? accent.dot : "bg-[#3a322a]",
                          )}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-lg border border-[#25211b] bg-[#0d0b08]/82 p-3">
              <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-[#45a85d]">{copy.queue}</p>
              {status.kind === "idle" ? (
                <p className="mt-2 text-[0.74rem] leading-5 text-[#9a9087]">{copy.statusIdle}</p>
              ) : status.kind === "error" ? (
                <div className="mt-2 flex items-start gap-2 rounded-md border border-[#ef4444]/30 bg-[#ef4444]/10 px-2 py-2 text-[0.72rem] leading-5 text-[#ffb4ad]">
                  <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
                  <span>{status.message}</span>
                </div>
              ) : (
                <div className="mt-2 space-y-1.5">
                  <div className="flex items-center gap-2 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-[#d6a548]">
                    <LoaderCircle className="size-3.5 animate-spin" />
                    {status.kind === "submitting"
                      ? copy.statusSubmitting
                      : status.kind === "queued"
                        ? copy.statusQueued
                        : copy.statusRunning}
                  </div>
                  {"requestId" in status ? (
                    <div className="font-mono text-[0.58rem] uppercase tracking-[0.16em] text-[#9a9087]">
                      {copy.requestId}: <span className="text-[#cfc4b8]">{status.requestId.slice(0, 12)}…</span>
                    </div>
                  ) : null}
                  {status.kind === "queued" && status.queuePos !== undefined ? (
                    <div className="font-mono text-[0.58rem] uppercase tracking-[0.16em] text-[#9a9087]">
                      {copy.queuePos}: <span className="text-[#cfc4b8]">{status.queuePos}</span>
                    </div>
                  ) : null}
                  {("logs" in status ? status.logs : []).slice(-3).map((log, idx) => (
                    <div
                      key={`${log}-${idx}`}
                      className="truncate rounded border border-white/8 bg-black/30 px-2 py-1 font-mono text-[0.58rem] text-[#b5ab9f]"
                    >
                      {log}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </aside>

          <section className="space-y-4">
            <div className="rounded-lg border border-[#25211b] bg-[#0d0b08]/82 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-[#d6a548]">
                    {activeModel.label}
                  </p>
                  <h3 className="mt-1 text-base font-bold tracking-[-0.02em] text-[#f4eadc]">
                    {activeModel.promptLabel}
                  </h3>
                </div>
                <span
                  className={cn(
                    "rounded-md border px-2 py-1 font-mono text-[0.55rem] uppercase tracking-[0.16em]",
                    accent.border,
                    accent.text,
                    accent.bg,
                  )}
                >
                  {activeModel.outputKind === "video" ? "video" : "image"}
                </span>
              </div>

              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder={activeModel.promptPlaceholder}
                rows={4}
                className="min-h-[6rem] w-full resize-y rounded-md border border-[#2a251f] bg-[#0c0a08] p-3 text-sm leading-6 text-[#f4eadc] outline-none transition focus:border-[#ef4444]/60 focus:bg-[#120c09]"
              />
              <p className="mt-1.5 font-mono text-[0.55rem] uppercase tracking-[0.16em] text-[#756d64]">
                {copy.promptLabel}
              </p>

              {activeModel.needsImage ? (
                <div className="mt-3">
                  <label className="mb-1 block font-mono text-[0.58rem] uppercase tracking-[0.18em] text-[#d6a548]">
                    {activeModel.imageLabel ?? copy.sourceImage}
                  </label>
                  <input
                    type="url"
                    value={sourceImage}
                    onChange={(event) => setSourceImage(event.target.value)}
                    placeholder="https://..."
                    className="w-full rounded-md border border-[#2a251f] bg-[#0c0a08] px-3 py-2 font-mono text-[0.78rem] text-[#f4eadc] outline-none transition focus:border-[#ef4444]/60"
                  />
                  <p className="mt-1 font-mono text-[0.55rem] uppercase tracking-[0.16em] text-[#756d64]">
                    {copy.sourceImageHint}
                  </p>
                </div>
              ) : null}

              <div className="mt-4 border-t border-white/8 pt-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="flex items-center gap-2 font-mono text-[0.58rem] uppercase tracking-[0.2em] text-[#9a9087]">
                    <Sliders className="size-3.5" />
                    {copy.paramsHeader}
                  </p>
                </div>

                {coreParams.length ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {coreParams.map((spec) => (
                      <div key={spec.key}>
                        <label className="mb-1 block font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[#9a9087]">
                          {spec.label}
                          {spec.hint ? (
                            <span className="ml-1 text-[#6f675e] normal-case tracking-normal">— {spec.hint}</span>
                          ) : null}
                        </label>
                        <ParamControl
                          spec={spec}
                          value={activeParams[spec.key] ?? (spec.default ?? "")}
                          onChange={(next) => updateParam(spec.key, next)}
                        />
                      </div>
                    ))}
                  </div>
                ) : null}

                {advancedParams.length ? (
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => setShowAdvanced((current) => !current)}
                      className="flex items-center gap-2 font-mono text-[0.58rem] uppercase tracking-[0.18em] text-[#d6a548] transition hover:text-[#f4eadc]"
                    >
                      <ChevronDown className={cn("size-3.5 transition", showAdvanced && "rotate-180")} />
                      {copy.advanced} · {showAdvanced ? copy.advancedHide : copy.advancedShow}
                    </button>
                    {showAdvanced ? (
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        {advancedParams.map((spec) => (
                          <div key={spec.key}>
                            <label className="mb-1 block font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[#9a9087]">
                              {spec.label}
                            </label>
                            <ParamControl
                              spec={spec}
                              value={activeParams[spec.key] ?? (spec.default ?? "")}
                              onChange={(next) => updateParam(spec.key, next)}
                            />
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
                <Button
                  type="button"
                  onClick={submit}
                  disabled={isWorking}
                  className={cn(
                    "h-11 rounded-md px-5 font-mono text-[0.68rem] font-bold uppercase tracking-[0.18em]",
                    activeModel.outputKind === "video"
                      ? "bg-[#47c9d9] text-[#04141a] hover:bg-[#5fd6e4]"
                      : "bg-[#ef4444] text-[#090807] hover:bg-[#ff5b55]",
                  )}
                >
                  {isWorking ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />}
                  {activeModel.outputKind === "video" ? copy.submitVideo : copy.submitImage}
                </Button>
              </div>
            </div>

            <div className="rounded-lg border border-[#25211b] bg-[#0d0b08]/82 p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-[#45a85d]">{copy.gallery}</p>
                <span className="font-mono text-[0.55rem] uppercase tracking-[0.16em] text-[#756d64]">
                  {assets.length}
                </span>
              </div>
              {assets.length === 0 ? (
                <div className="rounded-md border border-dashed border-[#2a251f] bg-[#100d0a]/40 px-3 py-10 text-center">
                  <p className="text-[0.78rem] leading-6 text-[#9a9087]">{copy.galleryEmpty}</p>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {assets.map((asset) => (
                    <div
                      key={asset.id}
                      className="group overflow-hidden rounded-lg border border-[#25211b] bg-[#0c0a08]"
                    >
                      <div className="relative aspect-video bg-black">
                        {asset.kind === "video" ? (
                          <video
                            src={asset.url}
                            controls
                            playsInline
                            className="h-full w-full bg-black object-contain"
                          />
                        ) : (
                          <a href={asset.url} target="_blank" rel="noreferrer">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={asset.url}
                              alt={asset.prompt}
                              className="h-full w-full bg-black object-contain"
                            />
                          </a>
                        )}
                      </div>
                      <div className="space-y-2 px-3 py-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate font-mono text-[0.58rem] uppercase tracking-[0.16em] text-[#d6a548]">
                            {asset.modelLabel}
                          </span>
                          <span className="font-mono text-[0.5rem] uppercase tracking-[0.18em] text-[#756d64]">
                            {new Date(asset.createdAt).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="line-clamp-2 text-[0.74rem] leading-5 text-[#b5ab9f]">{asset.prompt}</p>
                        <div className="flex items-center gap-1.5">
                          <a
                            href={asset.url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md border border-white/10 bg-white/[0.03] font-mono text-[0.55rem] uppercase tracking-[0.16em] text-[#cfc4b8] transition hover:bg-white/[0.06]"
                          >
                            <Download className="size-3.5" />
                            {copy.download}
                          </a>
                          <button
                            type="button"
                            onClick={() => copyUrl(asset)}
                            className={cn(
                              "flex h-8 items-center justify-center gap-1.5 rounded-md border px-3 font-mono text-[0.55rem] uppercase tracking-[0.16em] transition",
                              copiedId === asset.id
                                ? "border-[#45a85d]/45 bg-[#45a85d]/14 text-[#dff8e4]"
                                : "border-white/10 bg-white/[0.03] text-[#cfc4b8] hover:bg-white/[0.06]",
                            )}
                          >
                            <Copy className="size-3.5" />
                            {copiedId === asset.id ? copy.copied : copy.copyUrl}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

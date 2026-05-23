"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ChevronDown,
  Clapperboard,
  Copy,
  Download,
  Image as ImageLucide,
  ImagePlus,
  Layers,
  LoaderCircle,
  PlayCircle,
  Send,
  Sparkles,
  Sliders,
  TriangleAlert,
  Upload,
  Wand2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { languageOptions, useLanguage, type WebLanguage } from "@/components/LanguageProvider";
import { cn } from "@/lib/utils";
import {
  getModelsByCapability,
  type FalCapability,
  type FalModel,
  type FalParamSpec,
  textToImageModels,
  imageToImageModels,
  textToVideoModels,
  imageToVideoModels,
} from "@/lib/fal-models";

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

const CAPABILITIES: ReadonlyArray<{
  id: FalCapability;
  shortLabelVi: string;
  shortLabelEn: string;
  longLabelVi: string;
  longLabelEn: string;
  icon: typeof ImageLucide;
  accent: "red" | "amber" | "cyan" | "lime";
}> = [
  {
    id: "text-to-image",
    shortLabelVi: "Text → Ảnh",
    shortLabelEn: "Text → Image",
    longLabelVi: "Tạo ảnh từ prompt",
    longLabelEn: "Generate image from prompt",
    icon: ImageLucide,
    accent: "red",
  },
  {
    id: "image-to-image",
    shortLabelVi: "Ảnh → Ảnh",
    shortLabelEn: "Image → Image",
    longLabelVi: "Edit / re-imagine / upscale ảnh",
    longLabelEn: "Edit / re-imagine / upscale image",
    icon: ImagePlus,
    accent: "amber",
  },
  {
    id: "text-to-video",
    shortLabelVi: "Text → Video",
    shortLabelEn: "Text → Video",
    longLabelVi: "Render video từ prompt",
    longLabelEn: "Render video from prompt",
    icon: Clapperboard,
    accent: "cyan",
  },
  {
    id: "image-to-video",
    shortLabelVi: "Ảnh → Video",
    shortLabelEn: "Image → Video",
    longLabelVi: "Animate ảnh tĩnh thành cảnh quay",
    longLabelEn: "Animate a still image",
    icon: PlayCircle,
    accent: "lime",
  },
];

const ACCENT_MAP = {
  red: { text: "text-[#ef4444]", bg: "bg-[#ef4444]/10", border: "border-[#ef4444]/35", dot: "bg-[#ef4444]", solid: "bg-[#ef4444]", solidText: "text-[#090807]", hover: "hover:bg-[#ff5b55]" },
  amber: { text: "text-[#d6a548]", bg: "bg-[#d6a548]/10", border: "border-[#d6a548]/35", dot: "bg-[#d6a548]", solid: "bg-[#d6a548]", solidText: "text-[#100b04]", hover: "hover:bg-[#e8b859]" },
  cyan: { text: "text-[#47c9d9]", bg: "bg-[#47c9d9]/10", border: "border-[#47c9d9]/35", dot: "bg-[#47c9d9]", solid: "bg-[#47c9d9]", solidText: "text-[#04141a]", hover: "hover:bg-[#5fd6e4]" },
  lime: { text: "text-[#45a85d]", bg: "bg-[#45a85d]/10", border: "border-[#45a85d]/35", dot: "bg-[#45a85d]", solid: "bg-[#45a85d]", solidText: "text-[#061009]", hover: "hover:bg-[#58c772]" },
} as const;

const playgroundCopy = {
  vi: {
    back: "Quay lại trang chủ",
    title: "AI Playground",
    subtitle: "Tạo ảnh và video bằng các model mới nhất của FAL.AI",
    modelHeader: "Chọn model",
    modelHint: "Curated, chỉ các model nổi và mới nhất",
    paramsHeader: "Thông số",
    advanced: "Nâng cao",
    advancedShow: "Hiện",
    advancedHide: "Ẩn",
    promptHint: "Mô tả càng cụ thể, kết quả càng đẹp",
    sourceImage: "Ảnh đầu vào",
    sourceImageHint: "Dán URL hoặc tải ảnh từ máy (jpg/png/webp, tối đa 32MB)",
    pasteUrl: "Dán URL ảnh",
    uploadFromDevice: "Tải từ máy",
    uploading: "Đang tải lên...",
    uploadFailed: "Tải file lên thất bại",
    clearImage: "Bỏ ảnh đã chọn",
    submitImage: "Tạo ảnh",
    submitVideo: "Render video",
    submitEdit: "Chạy chỉnh sửa",
    submitAnimate: "Animate ảnh",
    queue: "Hàng đợi FAL",
    statusIdle: "Sẵn sàng nhận lệnh",
    statusSubmitting: "Đang gửi job...",
    statusQueued: "Đang chờ trong hàng đợi",
    statusRunning: "FAL đang xử lý",
    statusError: "Có lỗi xảy ra",
    requestId: "Request ID",
    queuePos: "Vị trí",
    gallery: "Kết quả",
    galleryEmpty: "Chưa có kết quả nào trong phiên này.",
    download: "Tải về",
    copyUrl: "Sao chép URL",
    copied: "Đã chép",
    needPrompt: "Cần nhập prompt",
    needImage: "Model này cần URL ảnh nguồn",
    selectedModel: "Model đang chọn",
  },
  en: {
    back: "Back to home",
    title: "AI Playground",
    subtitle: "Generate images and video with the latest FAL.AI models",
    modelHeader: "Pick a model",
    modelHint: "Curated — latest and most popular only",
    paramsHeader: "Parameters",
    advanced: "Advanced",
    advancedShow: "Show",
    advancedHide: "Hide",
    promptHint: "The more specific your prompt, the better the result",
    sourceImage: "Source image",
    sourceImageHint: "Paste a URL or upload from your device (jpg/png/webp, up to 32MB)",
    pasteUrl: "Paste image URL",
    uploadFromDevice: "Upload from device",
    uploading: "Uploading...",
    uploadFailed: "Upload failed",
    clearImage: "Remove image",
    submitImage: "Generate image",
    submitVideo: "Render video",
    submitEdit: "Run edit",
    submitAnimate: "Animate image",
    queue: "FAL queue",
    statusIdle: "Idle, ready",
    statusSubmitting: "Submitting job...",
    statusQueued: "Waiting in queue",
    statusRunning: "FAL is processing",
    statusError: "Something went wrong",
    requestId: "Request ID",
    queuePos: "Position",
    gallery: "Output",
    galleryEmpty: "No outputs in this session yet.",
    download: "Download",
    copyUrl: "Copy URL",
    copied: "Copied",
    needPrompt: "Prompt is required",
    needImage: "This model requires a source image URL",
    selectedModel: "Selected model",
  },
} satisfies Record<WebLanguage, Record<string, string>>;

function buildDefaults(model: FalModel): ParamValues {
  const values: ParamValues = {};
  for (const spec of model.params) {
    if (spec.default !== undefined && spec.default !== "") {
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
        <span className={cn("rounded-full px-2 py-0.5 text-[0.58rem]", on ? "bg-[#45a85d]/22 text-[#dff8e4]" : "bg-white/5 text-[#9a9087]")}>
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
        placeholder={spec.default !== undefined ? String(spec.default) : ""}
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
      placeholder={spec.hint ?? ""}
    />
  );
}

export function AIPlaygroundShell() {
  const { language, setLanguage } = useLanguage();
  const copy = playgroundCopy[language];
  const [capability, setCapability] = useState<FalCapability>("text-to-image");
  const [modelByCapability, setModelByCapability] = useState<Record<FalCapability, string>>({
    "text-to-image": textToImageModels[0].id,
    "image-to-image": imageToImageModels[0].id,
    "text-to-video": textToVideoModels[0].id,
    "image-to-video": imageToVideoModels[0].id,
  });
  const [promptByCapability, setPromptByCapability] = useState<Record<FalCapability, string>>({
    "text-to-image": "",
    "image-to-image": "",
    "text-to-video": "",
    "image-to-video": "",
  });
  const [imageByCapability, setImageByCapability] = useState<Record<FalCapability, string>>({
    "text-to-image": "",
    "image-to-image": "",
    "text-to-video": "",
    "image-to-video": "",
  });

  const allModels = useMemo(
    () => [...textToImageModels, ...imageToImageModels, ...textToVideoModels, ...imageToVideoModels],
    [],
  );

  const [paramsByModel, setParamsByModel] = useState<Record<string, ParamValues>>(() => {
    const map: Record<string, ParamValues> = {};
    for (const model of allModels) {
      map[model.id] = buildDefaults(model);
    }
    return map;
  });

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [assets, setAssets] = useState<GeneratedAsset[]>([]);
  const [copiedId, setCopiedId] = useState("");
  const [uploadState, setUploadState] = useState<{ uploading: boolean; error: string }>({
    uploading: false,
    error: "",
  });
  const pollRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const capabilityModels = getModelsByCapability(capability);
  const activeModelId = modelByCapability[capability];
  const activeModel = capabilityModels.find((m) => m.id === activeModelId) ?? capabilityModels[0];
  const activeAccent = ACCENT_MAP[CAPABILITIES.find((c) => c.id === capability)?.accent ?? "red"];
  const activeParams = paramsByModel[activeModel.id] ?? buildDefaults(activeModel);
  const prompt = promptByCapability[capability];
  const sourceImage = imageByCapability[capability];

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
        if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);

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
      if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);

      const found = extractAssets(json.data);
      const model = allModels.find((m) => m.id === modelId) ?? activeModel;

      if (!found.length) {
        setStatus({ kind: "error", message: "FAL trả về nhưng không có file media" });
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
      setAssets((current) => [...next, ...current].slice(0, 32));
      setStatus({ kind: "idle" });
    } catch (error) {
      setStatus({ kind: "error", message: error instanceof Error ? error.message : "Không lấy được kết quả" });
    }
  }

  async function submit() {
    const trimmed = prompt.trim();
    if (!trimmed) {
      setStatus({ kind: "error", message: copy.needPrompt });
      return;
    }
    if (activeModel.imageKey && !sourceImage.trim()) {
      setStatus({ kind: "error", message: copy.needImage });
      return;
    }

    const payload: Record<string, unknown> = {
      [activeModel.promptKey]: trimmed,
    };
    if (activeModel.imageKey) {
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
      if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
      const requestId = json.requestId as string;
      setStatus({ kind: "queued", requestId, logs: [] });
      startPolling(activeModel.id, requestId);
    } catch (error) {
      setStatus({ kind: "error", message: error instanceof Error ? error.message : "Submit thất bại" });
    }
  }

  function copyUrl(asset: GeneratedAsset) {
    void navigator.clipboard.writeText(asset.url);
    setCopiedId(asset.id);
    window.setTimeout(() => setCopiedId(""), 1500);
  }

  async function handleUploadFile(file: File) {
    setUploadState({ uploading: true, error: "" });
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/ai-playground/upload", {
        method: "POST",
        body: form,
      });
      const json = await res.json();
      if (!res.ok || !json?.url) {
        throw new Error(json?.error || `${copy.uploadFailed} (HTTP ${res.status})`);
      }
      setImageByCapability((current) => ({ ...current, [capability]: json.url as string }));
      setUploadState({ uploading: false, error: "" });
    } catch (error) {
      setUploadState({
        uploading: false,
        error: error instanceof Error ? error.message : copy.uploadFailed,
      });
    }
  }

  function clearSourceImage() {
    setImageByCapability((current) => ({ ...current, [capability]: "" }));
    setUploadState({ uploading: false, error: "" });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  const isWorking = status.kind === "submitting" || status.kind === "queued" || status.kind === "running";
  const coreParams = activeModel.params.filter((p) => p.group !== "advanced");
  const advancedParams = activeModel.params.filter((p) => p.group === "advanced");
  const submitLabel =
    capability === "text-to-image"
      ? copy.submitImage
      : capability === "image-to-image"
        ? copy.submitEdit
        : capability === "text-to-video"
          ? copy.submitVideo
          : copy.submitAnimate;

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
            <p className="font-mono text-[0.6rem] uppercase tracking-[0.22em] text-[#ef4444]">MrNine / FAL.AI</p>
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

      <div className="relative z-10 mx-auto max-w-[92rem] px-4 pt-6 sm:px-6 lg:px-8">
        <div className="mb-4">
          <p className="font-mono text-[0.62rem] uppercase tracking-[0.28em] text-[#8f8579]">{copy.title}</p>
          <h2 className="mt-1 max-w-2xl text-2xl font-black leading-tight tracking-[-0.04em] text-[#f4eadc] sm:text-3xl">
            {copy.subtitle}
          </h2>
        </div>

        <nav className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {CAPABILITIES.map((cap) => {
            const Icon = cap.icon;
            const active = capability === cap.id;
            const accent = ACCENT_MAP[cap.accent];
            return (
              <button
                key={cap.id}
                type="button"
                onClick={() => setCapability(cap.id)}
                className={cn(
                  "group flex flex-col items-start gap-2 rounded-lg border px-3 py-2.5 text-left transition",
                  active
                    ? cn(accent.border, accent.bg, "shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset]")
                    : "border-[#25211b] bg-[#0d0b08]/82 hover:border-white/20",
                )}
              >
                <div className="flex w-full items-center justify-between">
                  <div className={cn("flex size-7 items-center justify-center rounded-md border", accent.border, accent.bg)}>
                    <Icon className={cn("size-3.5", accent.text)} />
                  </div>
                  <span
                    className={cn(
                      "font-mono text-[0.5rem] uppercase tracking-[0.18em]",
                      active ? accent.text : "text-[#756d64]",
                    )}
                  >
                    {getModelsByCapability(cap.id).length} models
                  </span>
                </div>
                <div className="min-w-0">
                  <div className={cn("text-[0.84rem] font-bold leading-tight", active ? "text-[#f4eadc]" : "text-[#cfc4b8]")}>
                    {language === "vi" ? cap.shortLabelVi : cap.shortLabelEn}
                  </div>
                  <p className="mt-0.5 text-[0.68rem] leading-4 text-[#9a9087]">
                    {language === "vi" ? cap.longLabelVi : cap.longLabelEn}
                  </p>
                </div>
              </button>
            );
          })}
        </nav>

        <div className="grid gap-5 lg:grid-cols-[19rem_minmax(0,1fr)]">
          <aside className="space-y-3">
            <div className="rounded-lg border border-[#25211b] bg-[#0d0b08]/82 p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className={cn("font-mono text-[0.58rem] uppercase tracking-[0.2em]", activeAccent.text)}>
                  {copy.modelHeader}
                </p>
                <Layers className="size-3.5 text-[#9a9087]" />
              </div>
              <p className="mb-3 text-[0.7rem] leading-5 text-[#9a9087]">{copy.modelHint}</p>
              <div className="max-h-[60vh] space-y-1.5 overflow-y-auto pr-1">
                {capabilityModels.map((model) => {
                  const selected = activeModel.id === model.id;
                  return (
                    <button
                      key={model.id}
                      type="button"
                      onClick={() =>
                        setModelByCapability((current) => ({ ...current, [capability]: model.id }))
                      }
                      className={cn(
                        "group w-full rounded-md border px-3 py-2.5 text-left transition",
                        selected
                          ? cn("bg-[#14100d]", activeAccent.border)
                          : "border-[#25211b] hover:border-white/20 hover:bg-white/[0.03]",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-[0.84rem] font-bold text-[#f4eadc]">{model.label}</span>
                            {model.badge ? (
                              <span
                                className={cn(
                                  "rounded border px-1.5 py-0.5 font-mono text-[0.5rem] tracking-[0.18em]",
                                  selected ? cn(activeAccent.text, activeAccent.border) : "border-white/10 text-[#9a9087]",
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
                            selected ? activeAccent.dot : "bg-[#3a322a]",
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
                  <p className={cn("font-mono text-[0.58rem] uppercase tracking-[0.2em]", activeAccent.text)}>
                    {copy.selectedModel} · {activeModel.label}
                  </p>
                  <h3 className="mt-1 text-base font-bold tracking-[-0.02em] text-[#f4eadc]">
                    {activeModel.promptLabel}
                  </h3>
                </div>
                <span
                  className={cn(
                    "rounded-md border px-2 py-1 font-mono text-[0.55rem] uppercase tracking-[0.16em]",
                    activeAccent.border,
                    activeAccent.text,
                    activeAccent.bg,
                  )}
                >
                  {activeModel.outputKind}
                </span>
              </div>

              <textarea
                value={prompt}
                onChange={(event) =>
                  setPromptByCapability((current) => ({ ...current, [capability]: event.target.value }))
                }
                placeholder={activeModel.promptPlaceholder}
                rows={4}
                className="min-h-[6rem] w-full resize-y rounded-md border border-[#2a251f] bg-[#0c0a08] p-3 text-sm leading-6 text-[#f4eadc] outline-none transition focus:border-[#ef4444]/60 focus:bg-[#120c09]"
              />
              <p className="mt-1.5 font-mono text-[0.55rem] uppercase tracking-[0.16em] text-[#756d64]">
                {copy.promptHint}
              </p>

              {activeModel.imageKey ? (
                <div className="mt-3">
                  <div className="mb-1 flex items-center justify-between">
                    <label className="block font-mono text-[0.58rem] uppercase tracking-[0.18em] text-[#d6a548]">
                      {activeModel.imageLabel ?? copy.sourceImage}
                    </label>
                    {sourceImage ? (
                      <button
                        type="button"
                        onClick={clearSourceImage}
                        className="flex items-center gap-1 font-mono text-[0.55rem] uppercase tracking-[0.16em] text-[#9a9087] transition hover:text-[#ffb4ad]"
                      >
                        <X className="size-3" />
                        {copy.clearImage}
                      </button>
                    ) : null}
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
                    <input
                      type="url"
                      value={sourceImage}
                      onChange={(event) =>
                        setImageByCapability((current) => ({ ...current, [capability]: event.target.value }))
                      }
                      placeholder={copy.pasteUrl}
                      className="min-w-0 flex-1 rounded-md border border-[#2a251f] bg-[#0c0a08] px-3 py-2 font-mono text-[0.78rem] text-[#f4eadc] outline-none transition focus:border-[#ef4444]/60"
                    />
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) {
                          void handleUploadFile(file);
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadState.uploading}
                      className={cn(
                        "flex h-10 shrink-0 items-center justify-center gap-2 rounded-md border px-3 font-mono text-[0.6rem] uppercase tracking-[0.16em] transition",
                        uploadState.uploading
                          ? "border-[#d6a548]/45 bg-[#d6a548]/10 text-[#f0c86d]"
                          : "border-[#45a85d]/35 bg-[#45a85d]/10 text-[#dff8e4] hover:border-[#45a85d]/60 hover:bg-[#45a85d]/16",
                      )}
                    >
                      {uploadState.uploading ? (
                        <LoaderCircle className="size-3.5 animate-spin" />
                      ) : (
                        <Upload className="size-3.5" />
                      )}
                      {uploadState.uploading ? copy.uploading : copy.uploadFromDevice}
                    </button>
                  </div>

                  {uploadState.error ? (
                    <div className="mt-2 flex items-start gap-2 rounded-md border border-[#ef4444]/30 bg-[#ef4444]/10 px-2 py-2 text-[0.7rem] leading-5 text-[#ffb4ad]">
                      <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
                      <span>{uploadState.error}</span>
                    </div>
                  ) : null}

                  {sourceImage ? (
                    <div className="mt-2 flex items-center gap-3 rounded-md border border-[#25211b] bg-[#0c0a08] p-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={sourceImage}
                        alt="source preview"
                        className="size-16 shrink-0 rounded border border-white/8 bg-black object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-mono text-[0.6rem] text-[#cfc4b8]">{sourceImage}</div>
                        <div className="mt-1 font-mono text-[0.5rem] uppercase tracking-[0.18em] text-[#756d64]">
                          {sourceImage.startsWith("https://v3.fal.media")
                            ? "uploaded · fal storage"
                            : "remote url"}
                        </div>
                      </div>
                    </div>
                  ) : null}

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
                    activeAccent.solid,
                    activeAccent.solidText,
                    activeAccent.hover,
                  )}
                >
                  {isWorking ? <LoaderCircle className="size-4 animate-spin" /> : capability.includes("image") && !capability.includes("video") ? <Wand2 className="size-4" /> : <Send className="size-4" />}
                  {submitLabel}
                </Button>
              </div>
            </div>

            <div className="rounded-lg border border-[#25211b] bg-[#0d0b08]/82 p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-[#45a85d]">{copy.gallery}</p>
                <span className="font-mono text-[0.55rem] uppercase tracking-[0.16em] text-[#756d64]">{assets.length}</span>
              </div>
              {assets.length === 0 ? (
                <div className="rounded-md border border-dashed border-[#2a251f] bg-[#100d0a]/40 px-3 py-10 text-center">
                  <p className="text-[0.78rem] leading-6 text-[#9a9087]">{copy.galleryEmpty}</p>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {assets.map((asset) => (
                    <div key={asset.id} className="group overflow-hidden rounded-lg border border-[#25211b] bg-[#0c0a08]">
                      <div className="relative aspect-video bg-black">
                        {asset.kind === "video" ? (
                          <video src={asset.url} controls playsInline className="h-full w-full bg-black object-contain" />
                        ) : (
                          <a href={asset.url} target="_blank" rel="noreferrer">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={asset.url} alt={asset.prompt} className="h-full w-full bg-black object-contain" />
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

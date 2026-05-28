"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Clapperboard,
  Copy,
  Download,
  Image as ImageLucide,
  ImagePlus,
  LoaderCircle,
  PlayCircle,
  Search,
  Send,
  Sparkles,
  Sliders,
  Trash2,
  TriangleAlert,
  Upload,
  Wand2,
  Video,
  X,
} from "lucide-react";
import { languageOptions, useLanguage, type WebLanguage } from "@/components/LanguageProvider";
import { cn } from "@/lib/utils";
import { safeParseJson } from "@/lib/fetch-json";
import {
  getModelsByCapability,
  type FalCapability,
  type FalModel,
  type FalParamSpec,
  textToImageModels,
  imageToImageModels,
  textToVideoModels,
  imageToVideoModels,
  motionControlModels,
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
  | { kind: "queued"; requestId: string; statusUrl: string; responseUrl: string; queuePos?: number; logs: string[] }
  | { kind: "running"; requestId: string; statusUrl: string; responseUrl: string; logs: string[] }
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
    shortLabelVi: "Tạo ảnh",
    shortLabelEn: "Image",
    longLabelVi: "Tạo ảnh từ mô tả",
    longLabelEn: "Generate from prompt",
    icon: ImageLucide,
    accent: "red",
  },
  {
    id: "image-to-image",
    shortLabelVi: "Sửa ảnh",
    shortLabelEn: "Edit image",
    longLabelVi: "Edit / re-imagine / upscale",
    longLabelEn: "Edit / re-imagine / upscale",
    icon: ImagePlus,
    accent: "amber",
  },
  {
    id: "text-to-video",
    shortLabelVi: "Tạo video",
    shortLabelEn: "Video",
    longLabelVi: "Render video từ mô tả",
    longLabelEn: "Render from prompt",
    icon: Clapperboard,
    accent: "cyan",
  },
  {
    id: "image-to-video",
    shortLabelVi: "Animate ảnh",
    shortLabelEn: "Animate",
    longLabelVi: "Biến ảnh thành cảnh quay",
    longLabelEn: "Animate a still image",
    icon: PlayCircle,
    accent: "lime",
  },
  {
    id: "motion-control",
    shortLabelVi: "Motion Control",
    shortLabelEn: "Motion",
    longLabelVi: "Hiệu ứng & camera control",
    longLabelEn: "Effects & camera control",
    icon: Video,
    accent: "amber",
  },
];

const ACCENT_MAP = {
  red: { text: "text-[#ef4444]", bg: "bg-[#ef4444]/10", border: "border-[#ef4444]/35", dot: "bg-[#ef4444]", solid: "bg-[#ef4444]", solidText: "text-[#090807]", hover: "hover:bg-[#ff5b55]", ring: "focus-visible:ring-[#ef4444]/70" },
  amber: { text: "text-[#d6a548]", bg: "bg-[#d6a548]/10", border: "border-[#d6a548]/35", dot: "bg-[#d6a548]", solid: "bg-[#d6a548]", solidText: "text-[#100b04]", hover: "hover:bg-[#e8b859]", ring: "focus-visible:ring-[#d6a548]/70" },
  cyan: { text: "text-[#47c9d9]", bg: "bg-[#47c9d9]/10", border: "border-[#47c9d9]/35", dot: "bg-[#47c9d9]", solid: "bg-[#47c9d9]", solidText: "text-[#04141a]", hover: "hover:bg-[#5fd6e4]", ring: "focus-visible:ring-[#47c9d9]/70" },
  lime: { text: "text-[#45a85d]", bg: "bg-[#45a85d]/10", border: "border-[#45a85d]/35", dot: "bg-[#45a85d]", solid: "bg-[#45a85d]", solidText: "text-[#061009]", hover: "hover:bg-[#58c772]", ring: "focus-visible:ring-[#45a85d]/70" },
} as const;

const playgroundCopy = {
  vi: {
    back: "Quay lại trang chủ",
    title: "AI Playground",
    subtitle: "Tạo ảnh và video bằng những model AI mới nhất",
    modelHeader: "Model",
    paramsHeader: "Thông số",
    advanced: "Nâng cao",
    advancedShow: "Hiện",
    advancedHide: "Ẩn",
    promptLabel: "Mô tả",
    promptHint: "Mô tả càng cụ thể, kết quả càng đẹp",
    sourceImage: "Ảnh đầu vào",
    sourceImageHint: "Dán URL hoặc tải ảnh từ máy (jpg/png/webp, tối đa 32MB)",
    pasteUrl: "Dán URL ảnh",
    uploadFromDevice: "Tải từ máy",
    uploading: "Đang tải lên...",
    uploadFailed: "Tải file lên thất bại",
    clearImage: "Bỏ ảnh",
    submitImage: "Tạo ảnh",
    submitVideo: "Render video",
    submitEdit: "Chạy chỉnh sửa",
    submitAnimate: "Animate ảnh",
    statusIdle: "Sẵn sàng",
    statusSubmitting: "Đang gửi...",
    statusQueued: "Đang chờ",
    statusRunning: "Đang xử lý",
    statusError: "Có lỗi",
    requestId: "ID",
    queuePos: "Vị trí hàng đợi",
    gallery: "Kết quả",
    galleryEmpty: "Chưa có kết quả. Nhập mô tả và bấm tạo để bắt đầu.",
    historyTitle: "Lịch sử",
    historyEmpty: "Lịch sử trống. Mỗi lần tạo xong sẽ lưu tại đây.",
    historyClear: "Xoá lịch sử",
    download: "Tải về",
    copyUrl: "Sao chép URL",
    copied: "Đã chép",
    needPrompt: "Cần nhập mô tả",
    needImage: "Model này cần ảnh đầu vào",
    selectModel: "Chọn model",
    searchModel: "Tìm theo tên / vendor / hiệu ứng...",
    noModelMatch: "Không tìm thấy model phù hợp",
    runShortcut: "Ctrl + Enter để chạy",
    uploaded: "Đã tải lên",
    remoteUrl: "Liên kết ngoài",
    multiModalRefs: "Tệp tham chiếu",
    referenceImages: "Ảnh tham chiếu",
    referenceVideos: "Video tham chiếu",
    referenceAudios: "Audio tham chiếu",
    csvImagePlaceholder: "Mỗi dòng/CSV một URL ảnh",
    csvVideoPlaceholder: "Mỗi dòng/CSV một URL video",
    csvAudioPlaceholder: "Mỗi dòng/CSV một URL audio",
    totalFilesMax: "Tổng tối đa",
    totalFilesUnit: "tệp",
    pricingLabel: "Giá",
    selectShort: "Chọn",
    responseMissingRequest: "Phản hồi thiếu thông tin truy vấn",
    pickerImageOnly: "Chỉ chọn ảnh",
  },
  en: {
    back: "Back to home",
    title: "AI Playground",
    subtitle: "Generate images and video with the latest AI models",
    modelHeader: "Model",
    paramsHeader: "Parameters",
    advanced: "Advanced",
    advancedShow: "Show",
    advancedHide: "Hide",
    promptLabel: "Describe",
    promptHint: "The more specific your prompt, the better the result",
    sourceImage: "Source image",
    sourceImageHint: "Paste a URL or upload from your device (jpg/png/webp, up to 32MB)",
    pasteUrl: "Paste image URL",
    uploadFromDevice: "Upload from device",
    uploading: "Uploading...",
    uploadFailed: "Upload failed",
    clearImage: "Remove",
    submitImage: "Generate image",
    submitVideo: "Render video",
    submitEdit: "Run edit",
    submitAnimate: "Animate image",
    statusIdle: "Ready",
    statusSubmitting: "Submitting...",
    statusQueued: "Queued",
    statusRunning: "Processing",
    statusError: "Error",
    requestId: "ID",
    queuePos: "Queue position",
    gallery: "Output",
    galleryEmpty: "No outputs yet. Enter a prompt and run to start.",
    historyTitle: "History",
    historyEmpty: "History is empty. Every render is saved here.",
    historyClear: "Clear history",
    download: "Download",
    copyUrl: "Copy URL",
    copied: "Copied",
    needPrompt: "Prompt is required",
    needImage: "This model needs a source image",
    selectModel: "Select model",
    searchModel: "Search by name, vendor, effect...",
    noModelMatch: "No matching model",
    runShortcut: "Press Ctrl + Enter to run",
    uploaded: "Uploaded",
    remoteUrl: "Remote URL",
    multiModalRefs: "Multi-modal references",
    referenceImages: "Reference images",
    referenceVideos: "Reference videos",
    referenceAudios: "Reference audios",
    csvImagePlaceholder: "One image URL per line / CSV",
    csvVideoPlaceholder: "One video URL per line / CSV",
    csvAudioPlaceholder: "One audio URL per line / CSV",
    totalFilesMax: "Max total",
    totalFilesUnit: "files",
    pricingLabel: "Price",
    selectShort: "Select",
    responseMissingRequest: "Response is missing request info",
    pickerImageOnly: "Pick image only",
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

function ModelDropdown({
  models,
  selected,
  language,
  accentText,
  onSelect,
  copy,
}: Readonly<{
  models: ReadonlyArray<FalModel>;
  selected: FalModel;
  language: WebLanguage;
  accentText: string;
  onSelect: (id: string) => void;
  copy: typeof playgroundCopy.vi;
}>) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    function handleDocClick(event: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleDocClick);
    return () => document.removeEventListener("mousedown", handleDocClick);
  }, []);

  useEffect(() => {
    if (!open) return;
    const id = window.requestAnimationFrame(() => searchRef.current?.focus());
    return () => {
      window.cancelAnimationFrame(id);
      setQuery("");
    };
  }, [open]);

  const normalized = query.trim().toLowerCase();
  const filtered = normalized
    ? models.filter((model) => {
        const haystack = `${model.label} ${model.vendor} ${model.tagline} ${model.badge ?? ""} ${model.id}`.toLowerCase();
        return haystack.includes(normalized);
      })
    : models;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="playground-card-soft flex h-12 w-full items-center justify-between gap-3 rounded-md border border-[#2a251f] bg-[#0c0a08] px-3 text-left hover:border-white/20"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-bold text-[#f4eadc]">{selected.label}</span>
            {selected.badge ? (
              <span className={cn("rounded border px-1.5 py-0.5 font-mono text-[0.5rem] tracking-[0.18em]", accentText, "border-current")}>
                {selected.badge}
              </span>
            ) : null}
          </div>
          <div className="truncate font-mono text-[0.55rem] uppercase tracking-[0.16em] text-[#9a9087]">
            {selected.tagline}
          </div>
        </div>
        <ChevronDown className={cn("size-4 shrink-0 text-[#9a9087] transition", open && "rotate-180")} />
      </button>

      {open ? (
        <div
          role="listbox"
          aria-label={copy.selectModel}
          className="playground-dropdown absolute left-0 right-0 top-[calc(100%+0.4rem)] z-30 max-h-[28rem] overflow-hidden rounded-md border border-[#2a251f] bg-[#0b0a08]/98 shadow-[0_24px_60px_rgba(0,0,0,0.55)] backdrop-blur-xl"
        >
          <div className="sticky top-0 z-10 border-b border-white/8 bg-[#0b0a08]/96 p-2">
            <div className="relative flex items-center">
              <Search className="pointer-events-none absolute left-2.5 size-3.5 text-[#9a9087]" />
              <input
                ref={searchRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    event.preventDefault();
                    setOpen(false);
                  }
                  if (event.key === "Enter" && filtered[0]) {
                    event.preventDefault();
                    onSelect(filtered[0].id);
                    setOpen(false);
                  }
                }}
                placeholder={copy.searchModel}
                className="h-9 w-full rounded-md border border-[#2a251f] bg-[#0c0a08] pl-8 pr-8 font-mono text-[0.78rem] text-[#f4eadc] outline-none focus:border-[#ef4444]/60"
              />
              {query ? (
                <button
                  type="button"
                  aria-label={copy.clearImage}
                  onClick={() => {
                    setQuery("");
                    searchRef.current?.focus();
                  }}
                  className="absolute right-2 flex size-5 items-center justify-center rounded text-[#9a9087] transition hover:bg-white/[0.05] hover:text-[#f4eadc]"
                >
                  <X className="size-3" />
                </button>
              ) : null}
            </div>
            <div className="mt-1 px-1 font-mono text-[0.5rem] uppercase tracking-[0.18em] text-[#756d64]">
              {filtered.length} / {models.length}
            </div>
          </div>
          <div className="max-h-[22rem] overflow-y-auto p-1.5">
            {filtered.length === 0 ? (
              <div className="px-3 py-6 text-center font-mono text-[0.66rem] uppercase tracking-[0.16em] text-[#9a9087]">
                {copy.noModelMatch}
              </div>
            ) : null}
            {filtered.map((model) => {
              const active = model.id === selected.id;
            return (
              <button
                key={model.id}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  onSelect(model.id);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-start gap-2 rounded-md px-2.5 py-2 text-left transition",
                  active ? "bg-white/[0.05]" : "hover:bg-white/[0.04]",
                )}
              >
                <span
                  className={cn(
                    "mt-1.5 size-2 shrink-0 rounded-full",
                    active ? cn(accentText, "bg-current") : "bg-[#3a322a]",
                  )}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="truncate text-[0.85rem] font-bold text-[#f4eadc]">{model.label}</span>
                    {model.badge ? (
                      <span className={cn("rounded border border-white/10 px-1.5 py-0.5 font-mono text-[0.5rem] uppercase tracking-[0.18em] text-[#cfc4b8]", active && cn(accentText, "border-current"))}>
                        {model.badge}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-[0.7rem] leading-5 text-[#b5ab9f]">{model.tagline}</p>
                </div>
                {active ? <Check className={cn("mt-1 size-3.5 shrink-0", accentText)} /> : null}
                <span className="sr-only">{language === "vi" ? "Chọn" : "Select"}</span>
              </button>
            );
          })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MultiUrlInput({
  label,
  hint,
  placeholder,
  value,
  onChange,
  accept,
  onUpload,
}: {
  label: string;
  hint?: string;
  placeholder?: string;
  value: string;
  onChange: (next: string) => void;
  accept?: string;
  onUpload?: (file: File) => Promise<void> | void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <label className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[#9a9087]">{label}</label>
        {onUpload ? (
          <>
            <input
              ref={inputRef}
              type="file"
              accept={accept}
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setBusy(true);
                try {
                  await onUpload(file);
                } finally {
                  setBusy(false);
                  if (inputRef.current) inputRef.current.value = "";
                }
              }}
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className="rounded-md border border-[#45a85d]/35 bg-[#45a85d]/10 px-2 py-0.5 font-mono text-[0.55rem] uppercase tracking-[0.16em] text-[#dff8e4] transition hover:border-[#45a85d]/60 disabled:opacity-60"
            >
              {busy ? "Uploading…" : "+ Upload"}
            </button>
          </>
        ) : null}
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="block w-full resize-y rounded-md border border-[#2a251f] bg-[#0c0a08] p-2 font-mono text-[0.7rem] text-[#f4eadc] outline-none transition focus:border-[#ef4444]/60"
      />
      {hint ? (
        <p className="mt-1 font-mono text-[0.55rem] normal-case tracking-normal text-[#6f675e]">{hint}</p>
      ) : null}
    </div>
  );
}

export function AIPlaygroundShell() {
  const { language, setLanguage } = useLanguage();
  const searchParams = useSearchParams();
  const copy = playgroundCopy[language];
  const initialCapabilityParam = searchParams?.get("capability");
  const initialModelParam = searchParams?.get("model");
  const validCapabilities: ReadonlyArray<FalCapability> = [
    "text-to-image",
    "image-to-image",
    "text-to-video",
    "image-to-video",
    "motion-control",
  ];
  const initialCapability: FalCapability = validCapabilities.includes(initialCapabilityParam as FalCapability)
    ? (initialCapabilityParam as FalCapability)
    : "text-to-image";
  const [capability, setCapability] = useState<FalCapability>(initialCapability);
  const [modelByCapability, setModelByCapability] = useState<Record<FalCapability, string>>(() => {
    const initial: Record<FalCapability, string> = {
      "text-to-image": textToImageModels[0].id,
      "image-to-image": imageToImageModels[0].id,
      "text-to-video": textToVideoModels[0].id,
      "image-to-video": imageToVideoModels[0].id,
      "motion-control": motionControlModels[0].id,
    };
    if (initialModelParam) {
      const matched = getModelsByCapability(initialCapability).find((m) => m.id === initialModelParam);
      if (matched) initial[initialCapability] = matched.id;
    }
    return initial;
  });
  const [promptByCapability, setPromptByCapability] = useState<Record<FalCapability, string>>({
    "text-to-image": "",
    "image-to-image": "",
    "text-to-video": "",
    "image-to-video": "",
    "motion-control": "",
  });
  const [imageByCapability, setImageByCapability] = useState<Record<FalCapability, string>>({
    "text-to-image": "",
    "image-to-image": "",
    "text-to-video": "",
    "image-to-video": "",
    "motion-control": "",
  });
  // CSV-string per modality, scoped to the active model id. Lets users paste
  // multiple URLs at once for endpoints like Seedance 2.0 reference-to-video
  // (up to 9 images + 3 videos + 3 audios).
  const [imagesByModel, setImagesByModel] = useState<Record<string, string>>({});
  const [videosByModel, setVideosByModel] = useState<Record<string, string>>({});
  const [audiosByModel, setAudiosByModel] = useState<Record<string, string>>({});

  const allModels = useMemo(
    () => [
      ...textToImageModels,
      ...imageToImageModels,
      ...textToVideoModels,
      ...imageToVideoModels,
      ...motionControlModels,
    ],
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

  useEffect(() => {
    const cap = searchParams?.get("capability");
    const mod = searchParams?.get("model");
    if (cap && validCapabilities.includes(cap as FalCapability)) {
      const nextCap = cap as FalCapability;
      setCapability(nextCap);
      if (mod) {
        const matched = getModelsByCapability(nextCap).find((m) => m.id === mod);
        if (matched) {
          setModelByCapability((current) => ({ ...current, [nextCap]: matched.id }));
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);
  const [assets, setAssets] = useState<GeneratedAsset[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem("mrnine-playground-history");
      if (!raw) return [];
      const parsed = JSON.parse(raw) as GeneratedAsset[];
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter(
          (item) =>
            item &&
            typeof item === "object" &&
            typeof item.url === "string" &&
            typeof item.id === "string" &&
            (item.kind === "image" || item.kind === "video"),
        )
        .slice(0, 80);
    } catch {
      return [];
    }
  });
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/playground/assets", { cache: "no-store" });
        const data = await response.json().catch(() => null);
        if (cancelled || !Array.isArray(data?.assets) || data.assets.length === 0) return;
        const remote: GeneratedAsset[] = data.assets.map(
          (entry: { assetId: string; url: string; kind: "image" | "video"; modelLabel: string; prompt: string; createdAt?: string }) => ({
            id: entry.assetId,
            url: entry.url,
            kind: entry.kind,
            modelLabel: entry.modelLabel,
            prompt: entry.prompt,
            createdAt: entry.createdAt ? new Date(entry.createdAt).getTime() : Date.now(),
          }),
        );
        setAssets((current) => {
          const map = new Map<string, GeneratedAsset>();
          [...remote, ...current].forEach((entry) => map.set(entry.id, entry));
          return Array.from(map.values()).sort((a, b) => b.createdAt - a.createdAt).slice(0, 80);
        });
      } catch {
        // not authenticated or offline — keep local
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const [activeAssetId, setActiveAssetId] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    try {
      const raw = window.localStorage.getItem("mrnine-playground-history");
      if (!raw) return "";
      const parsed = JSON.parse(raw) as GeneratedAsset[];
      if (!Array.isArray(parsed) || !parsed[0]) return "";
      return typeof parsed[0].id === "string" ? parsed[0].id : "";
    } catch {
      return "";
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem("mrnine-playground-history", JSON.stringify(assets.slice(0, 80)));
    } catch {
      // ignore
    }
  }, [assets]);

  function clearHistory() {
    setAssets([]);
    setActiveAssetId("");
    try {
      window.localStorage.removeItem("mrnine-playground-history");
    } catch {
      // ignore
    }
    void fetch("/api/playground/assets", { method: "DELETE" }).catch(() => null);
  }
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

  const activeAsset = activeAssetId
    ? assets.find((asset) => asset.id === activeAssetId) ?? assets[0]
    : assets[0];

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

  function startPolling(modelId: string, requestId: string, statusUrl: string, responseUrl: string) {
    if (pollRef.current) {
      window.clearInterval(pollRef.current);
    }
    pollRef.current = window.setInterval(async () => {
      try {
        const res = await fetch(
          `/api/ai-playground/status?url=${encodeURIComponent(statusUrl)}&mode=status`,
          { cache: "no-store" },
        );
        const json = await safeParseJson(res);
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
          await loadResult(modelId, requestId, responseUrl);
          return;
        }
        if (queueStatus === "IN_PROGRESS") {
          setStatus({ kind: "running", requestId, statusUrl, responseUrl, logs });
        } else {
          setStatus({ kind: "queued", requestId, statusUrl, responseUrl, queuePos, logs });
        }
      } catch (error) {
        if (pollRef.current) {
          window.clearInterval(pollRef.current);
          pollRef.current = null;
        }
        setStatus({
          kind: "error",
          message: error instanceof Error ? error.message : copy.statusError,
        });
      }
    }, 2200);
  }

  async function loadResult(modelId: string, requestId: string, responseUrl: string) {
    try {
      const res = await fetch(
        `/api/ai-playground/status?url=${encodeURIComponent(responseUrl)}&mode=result`,
        { cache: "no-store" },
      );
      const json = await safeParseJson(res);
      if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);

      const found = extractAssets(json.data);
      const model = allModels.find((m) => m.id === modelId) ?? activeModel;

      if (!found.length) {
        setStatus({ kind: "error", message: copy.statusError });
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
      setAssets((current) => [...next, ...current].slice(0, 80));
      setActiveAssetId(next[0]?.id ?? "");
      setStatus({ kind: "idle" });
      // fire-and-forget persist to server
      next.forEach((entry) => {
        void fetch("/api/playground/assets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            assetId: entry.id,
            url: entry.url,
            kind: entry.kind,
            modelId: model.id,
            modelLabel: entry.modelLabel,
            prompt: entry.prompt,
          }),
        }).catch(() => null);
      });
    } catch (error) {
      setStatus({ kind: "error", message: error instanceof Error ? error.message : copy.statusError });
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
    if (activeModel.imagesKey) {
      const csv = imagesByModel[activeModel.id] ?? "";
      const list = csv.split(/[\n,]/).map((s) => s.trim()).filter(Boolean);
      if (list.length) payload[activeModel.imagesKey] = list;
    }
    if (activeModel.videosKey) {
      const csv = videosByModel[activeModel.id] ?? "";
      const list = csv.split(/[\n,]/).map((s) => s.trim()).filter(Boolean);
      if (list.length) payload[activeModel.videosKey] = list;
    }
    if (activeModel.audiosKey) {
      const csv = audiosByModel[activeModel.id] ?? "";
      const list = csv.split(/[\n,]/).map((s) => s.trim()).filter(Boolean);
      if (list.length) payload[activeModel.audiosKey] = list;
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
      const json = await safeParseJson(res);
      if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
      const requestId = json.requestId as string;
      const statusUrl = json.statusUrl as string | undefined;
      const responseUrl = json.responseUrl as string | undefined;
      if (!statusUrl || !responseUrl) {
        throw new Error(copy.responseMissingRequest);
      }
      setStatus({ kind: "queued", requestId, statusUrl, responseUrl, logs: [] });
      startPolling(activeModel.id, requestId, statusUrl, responseUrl);
    } catch (error) {
      setStatus({ kind: "error", message: error instanceof Error ? error.message : copy.statusError });
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
      const json = await safeParseJson(res);
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

  // Lightweight uploader for the multi-modal panel: returns the FAL url or
  // null on failure. Surfaces errors via uploadState.error.
  async function uploadOne(file: File): Promise<string | null> {
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/ai-playground/upload", { method: "POST", body: form });
      const json = await safeParseJson(res);
      if (!res.ok || !json?.url) {
        throw new Error(json?.error || `${copy.uploadFailed} (HTTP ${res.status})`);
      }
      return String(json.url);
    } catch (error) {
      setUploadState({
        uploading: false,
        error: error instanceof Error ? error.message : copy.uploadFailed,
      });
      return null;
    }
  }

  function clearSourceImage() {
    setImageByCapability((current) => ({ ...current, [capability]: "" }));
    setUploadState({ uploading: false, error: "" });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handlePromptKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      void submit();
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
          : capability === "image-to-video"
            ? copy.submitAnimate
            : copy.submitVideo;

  return (
    <main className="relative flex h-screen flex-col overflow-hidden bg-[#0b0a08] text-[#e8dfd4]">
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

      <header className="relative z-20 flex h-14 shrink-0 items-center gap-3 border-b border-[#25211b] bg-[#0a0907]/92 px-3 backdrop-blur md:px-5">
        <Link
          href="/"
          aria-label={copy.back}
          className="flex size-9 items-center justify-center rounded-md border border-white/10 text-[#a79d91] transition hover:border-[#ef4444]/40 hover:text-[#f4eadc]"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <Link
          href="/"
          aria-label="MrNine home"
          className="font-display text-xl font-black tracking-[-0.08em] text-[#f4eadc] outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#ef4444]/70 sm:text-2xl"
        >
          Mr<span className="text-[#ef4444]">Nine</span>
        </Link>
        <span aria-hidden="true" className="hidden h-6 w-px bg-white/10 sm:block" />
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-md border border-[#ef4444]/30 bg-[#ef4444]/10 text-[#ef4444]">
            <Sparkles className="size-4" />
          </div>
          <div className="hidden min-w-0 sm:block">
            <p className="font-mono text-[0.58rem] uppercase tracking-[0.22em] text-[#ef4444]">MrNine Studio</p>
            <h1 className="truncate text-base font-black tracking-[-0.04em] text-[#f4eadc]">{copy.title}</h1>
          </div>
        </div>

        <nav className="ml-1 hidden flex-1 items-center justify-center gap-1 md:flex" aria-label="Capabilities">
          {CAPABILITIES.map((cap) => {
            const Icon = cap.icon;
            const active = capability === cap.id;
            const accent = ACCENT_MAP[cap.accent];
            return (
              <button
                key={cap.id}
                type="button"
                onClick={() => setCapability(cap.id)}
                aria-pressed={active}
                data-active={active}
                className={cn(
                  "playground-cap-pill flex h-10 items-center gap-2 rounded-md border px-3 font-mono text-[0.62rem] uppercase tracking-[0.16em] transition-[color,background-color,border-color,box-shadow] duration-300",
                  active
                    ? cn(accent.border, accent.bg, accent.text, "playground-capability-armed shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset]")
                    : "border-[#25211b] text-[#9a9087] hover:border-white/20 hover:text-[#f4eadc]",
                )}
              >
                <Icon className={cn("size-3.5 transition-transform duration-300", active && "scale-110")} />
                {language === "vi" ? cap.shortLabelVi : cap.shortLabelEn}
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

      <div className="md:hidden relative z-10 shrink-0 overflow-x-auto border-b border-[#25211b] bg-[#0a0907]/92 px-3 py-2">
        <div className="flex min-w-max items-center gap-1.5">
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
                  "flex h-9 items-center gap-1.5 rounded-md border px-3 font-mono text-[0.6rem] uppercase tracking-[0.16em] transition",
                  active
                    ? cn(accent.border, accent.bg, accent.text)
                    : "border-[#25211b] text-[#9a9087]",
                )}
              >
                <Icon className="size-3" />
                {language === "vi" ? cap.shortLabelVi : cap.shortLabelEn}
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
                {copy.modelHeader}
              </label>
              <ModelDropdown
                models={capabilityModels}
                selected={activeModel}
                language={language}
                accentText={activeAccent.text}
                onSelect={(id) =>
                  setModelByCapability((current) => ({ ...current, [capability]: id }))
                }
                copy={copy}
              />
            </div>

            <div>
              <label className="mb-1.5 block font-mono text-[0.58rem] uppercase tracking-[0.2em] text-[#d6a548]">
                {copy.promptLabel}
              </label>
              <textarea
                value={prompt}
                onChange={(event) =>
                  setPromptByCapability((current) => ({ ...current, [capability]: event.target.value }))
                }
                onKeyDown={handlePromptKeyDown}
                placeholder={activeModel.promptPlaceholder}
                rows={5}
                className="playground-textarea-active min-h-[8rem] w-full resize-y rounded-md border border-[#2a251f] bg-[#0c0a08] p-3 text-sm leading-6 text-[#f4eadc] outline-none transition focus:border-[#ef4444]/60 focus:bg-[#120c09]"
              />
              <div className="mt-1.5 flex items-center justify-between font-mono text-[0.55rem] uppercase tracking-[0.16em] text-[#756d64]">
                <span>{copy.promptHint}</span>
                <span className="hidden sm:inline">{copy.runShortcut}</span>
              </div>
            </div>

            {activeModel.imageKey ? (
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="block font-mono text-[0.58rem] uppercase tracking-[0.2em] text-[#d6a548]">
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

                <div className="flex flex-col gap-2 sm:flex-row">
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
                      if (file) void handleUploadFile(file);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadState.uploading}
                    className={cn(
                      "flex h-10 shrink-0 items-center justify-center gap-2 rounded-md border px-3 font-mono text-[0.6rem] uppercase tracking-[0.16em] transition-[color,background-color,border-color] duration-200",
                      uploadState.uploading
                        ? "playground-upload-active border-[#d6a548]/45 bg-[#d6a548]/10 text-[#f0c86d]"
                        : "border-[#45a85d]/35 bg-[#45a85d]/10 text-[#dff8e4] hover:border-[#45a85d]/60 hover:bg-[#45a85d]/16 active:scale-[0.985]",
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
                    <div className="min-w-0 flex-1 font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[#cfc4b8]">
                      {sourceImage.startsWith("https://v3.fal.media") ? copy.uploaded : copy.remoteUrl}
                    </div>
                  </div>
                ) : null}

                <p className="mt-1.5 font-mono text-[0.55rem] uppercase tracking-[0.16em] text-[#756d64]">
                  {copy.sourceImageHint}
                </p>
              </div>
            ) : null}

            {activeModel.imagesKey || activeModel.videosKey || activeModel.audiosKey ? (
              <div className="space-y-3 rounded-lg border border-[#25211b] bg-[#0c0a08] p-3">
                <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-[#d6a548]">
                  {copy.multiModalRefs}
                </p>
                {activeModel.imagesKey ? (
                  <MultiUrlInput
                    label={`${copy.referenceImages}${activeModel.inputLimits?.images ? ` (max ${activeModel.inputLimits.images.maxFiles})` : ""}`}
                    hint={activeModel.inputLimits?.images?.hint}
                    placeholder={copy.csvImagePlaceholder}
                    value={imagesByModel[activeModel.id] ?? ""}
                    onChange={(v) => setImagesByModel((s) => ({ ...s, [activeModel.id]: v }))}
                    accept="image/*"
                    onUpload={async (file) => {
                      const url = await uploadOne(file);
                      if (url) {
                        setImagesByModel((s) => {
                          const cur = s[activeModel.id] ?? "";
                          return { ...s, [activeModel.id]: cur ? `${cur}\n${url}` : url };
                        });
                      }
                    }}
                  />
                ) : null}
                {activeModel.videosKey ? (
                  <MultiUrlInput
                    label={`${copy.referenceVideos}${activeModel.inputLimits?.videos ? ` (max ${activeModel.inputLimits.videos.maxFiles})` : ""}`}
                    hint={activeModel.inputLimits?.videos?.hint}
                    placeholder={copy.csvVideoPlaceholder}
                    value={videosByModel[activeModel.id] ?? ""}
                    onChange={(v) => setVideosByModel((s) => ({ ...s, [activeModel.id]: v }))}
                    accept="video/*"
                    onUpload={async (file) => {
                      const url = await uploadOne(file);
                      if (url) {
                        setVideosByModel((s) => {
                          const cur = s[activeModel.id] ?? "";
                          return { ...s, [activeModel.id]: cur ? `${cur}\n${url}` : url };
                        });
                      }
                    }}
                  />
                ) : null}
                {activeModel.audiosKey ? (
                  <MultiUrlInput
                    label={`${copy.referenceAudios}${activeModel.inputLimits?.audios ? ` (max ${activeModel.inputLimits.audios.maxFiles})` : ""}`}
                    hint={activeModel.inputLimits?.audios?.hint}
                    placeholder={copy.csvAudioPlaceholder}
                    value={audiosByModel[activeModel.id] ?? ""}
                    onChange={(v) => setAudiosByModel((s) => ({ ...s, [activeModel.id]: v }))}
                    accept="audio/*"
                    onUpload={async (file) => {
                      const url = await uploadOne(file);
                      if (url) {
                        setAudiosByModel((s) => {
                          const cur = s[activeModel.id] ?? "";
                          return { ...s, [activeModel.id]: cur ? `${cur}\n${url}` : url };
                        });
                      }
                    }}
                  />
                ) : null}
                {activeModel.inputLimits?.totalFiles ? (
                  <p className="font-mono text-[0.55rem] uppercase tracking-[0.16em] text-[#756d64]">
                    {copy.totalFilesMax} {activeModel.inputLimits.totalFiles} {copy.totalFilesUnit}
                  </p>
                ) : null}
                {activeModel.pricing?.note ? (
                  <p className="font-mono text-[0.55rem] uppercase tracking-[0.16em] text-[#9a9087]">
                    {copy.pricingLabel}: {activeModel.pricing.note}
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="border-t border-white/8 pt-3">
              <p className="mb-2 flex items-center gap-2 font-mono text-[0.58rem] uppercase tracking-[0.2em] text-[#9a9087]">
                <Sliders className="size-3.5" />
                {copy.paramsHeader}
              </p>

              {coreParams.length ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {coreParams.map((spec) => (
                    <div key={spec.key}>
                      <label className="mb-1 block font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[#9a9087]">
                        {spec.label}
                        {spec.hint ? (
                          <span className="ml-1 normal-case tracking-normal text-[#6f675e]">— {spec.hint}</span>
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
                  {status.kind === "submitting"
                    ? copy.statusSubmitting
                    : status.kind === "queued"
                      ? copy.statusQueued
                      : copy.statusRunning}
                </span>
                {status.kind === "queued" && status.queuePos !== undefined ? (
                  <span className="text-[#cfc4b8]">
                    {copy.queuePos}: {status.queuePos}
                  </span>
                ) : null}
              </div>
            ) : null}
            <button
              type="button"
              onClick={submit}
              disabled={isWorking}
              className={cn(
                "flex h-12 w-full items-center justify-center gap-2 rounded-md font-mono text-[0.72rem] font-bold uppercase tracking-[0.18em] transition-[transform,background-color,box-shadow] duration-300",
                "active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-60",
                isWorking ? "playground-loading-shimmer" : "playground-run-armed",
                activeAccent.solid,
                activeAccent.solidText,
                activeAccent.hover,
                activeAccent.ring,
                "focus-visible:outline-none focus-visible:ring-2",
              )}
            >
              {isWorking ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : capability.includes("image") && !capability.includes("video") ? (
                <Wand2 className="size-4" />
              ) : (
                <Send className="size-4" />
              )}
              {submitLabel}
            </button>
          </div>
        </aside>

        <section className="grid min-h-0 grid-cols-1 overflow-hidden xl:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="flex-1 overflow-y-auto px-4 py-4 md:px-6">
            {activeAsset ? (
              <div className="mx-auto flex h-full max-w-5xl flex-col">
                <div className="relative flex flex-1 items-center justify-center overflow-hidden rounded-lg border border-[#25211b] bg-black shadow-[0_24px_80px_rgba(0,0,0,0.5)]">
                  {activeAsset.kind === "video" ? (
                    <video
                      key={activeAsset.id}
                      src={activeAsset.url}
                      controls
                      autoPlay
                      playsInline
                      className="playground-result-arrive max-h-full max-w-full"
                    />
                  ) : (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      key={activeAsset.id}
                      src={activeAsset.url}
                      alt={activeAsset.prompt}
                      className="playground-result-arrive max-h-full max-w-full object-contain"
                    />
                  )}
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-md border border-[#25211b] bg-[#0c0a08] px-3 py-2.5">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-[#d6a548]">
                        {activeAsset.modelLabel}
                      </span>
                      <span className="font-mono text-[0.5rem] uppercase tracking-[0.18em] text-[#756d64]">
                        {new Date(activeAsset.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 max-w-2xl text-[0.78rem] leading-5 text-[#b5ab9f]">
                      {activeAsset.prompt}
                    </p>
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

                {assets.length > 1 ? (
                  <div className="mt-3 overflow-x-auto">
                    <div className="flex min-w-max items-stretch gap-2 pb-1">
                      {assets.map((asset) => {
                        const active = asset.id === activeAsset.id;
                        return (
                          <button
                            key={asset.id}
                            type="button"
                            onClick={() => setActiveAssetId(asset.id)}
                            className={cn(
                              "playground-thumb group relative size-20 shrink-0 overflow-hidden rounded-md border bg-black",
                              active ? cn(activeAccent.border, "ring-2", activeAccent.ring) : "border-[#25211b] hover:border-white/20",
                            )}
                          >
                            {asset.kind === "video" ? (
                              <video src={asset.url} muted playsInline className="size-full object-cover" />
                            ) : (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img src={asset.url} alt={asset.prompt} className="size-full object-cover" />
                            )}
                            {asset.kind === "video" ? (
                              <span className="absolute right-1 top-1 rounded bg-black/70 px-1 font-mono text-[0.5rem] uppercase tracking-[0.18em] text-white/80">
                                video
                              </span>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="mx-auto flex h-full max-w-3xl flex-col items-center justify-center text-center">
                <div className={cn("playground-fade-in flex size-14 items-center justify-center rounded-md border", activeAccent.border, activeAccent.bg)}>
                  <Sparkles className={cn("size-6 animate-pulse", activeAccent.text)} />
                </div>
                <h3 className="playground-fade-in mt-4 max-w-xl text-2xl font-black tracking-[-0.04em] text-[#f4eadc]" style={{ animationDelay: "60ms" }}>{copy.title}</h3>
                <p className="playground-fade-in mt-1 max-w-md text-sm leading-6 text-[#b5ab9f]" style={{ animationDelay: "120ms" }}>{copy.galleryEmpty}</p>
                <div className="playground-fade-in mt-5 flex flex-wrap justify-center gap-2 font-mono text-[0.58rem] uppercase tracking-[0.16em] text-[#9a9087]" style={{ animationDelay: "180ms" }}>
                  {CAPABILITIES.map((cap) => {
                    const Icon = cap.icon;
                    const accent = ACCENT_MAP[cap.accent];
                    return (
                      <button
                        key={cap.id}
                        type="button"
                        onClick={() => setCapability(cap.id)}
                        className={cn(
                          "flex items-center gap-1.5 rounded-md border border-[#25211b] bg-[#0d0b08]/82 px-3 py-1.5 transition hover:border-white/20",
                          capability === cap.id && cn(accent.border, accent.bg, accent.text),
                        )}
                      >
                        <Icon className="size-3" />
                        {language === "vi" ? cap.shortLabelVi : cap.shortLabelEn}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <aside className="hidden min-h-0 flex-col border-l border-[#25211b] bg-[#0a0907]/72 xl:flex">
            <div className="flex shrink-0 items-center justify-between border-b border-[#25211b] px-4 py-3">
              <div>
                <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-[#d6a548]">
                  {copy.historyTitle}
                </p>
                <p className="mt-0.5 font-mono text-[0.5rem] uppercase tracking-[0.18em] text-[#756d64]">
                  {assets.length} / 80
                </p>
              </div>
              {assets.length > 0 ? (
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
              {assets.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                  <div className="flex size-10 items-center justify-center rounded-md border border-[#25211b] bg-[#100d0a]/60 text-[#9a9087]">
                    <Sparkles className="size-4" />
                  </div>
                  <p className="px-2 text-[0.7rem] leading-5 text-[#9a9087]">{copy.historyEmpty}</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {assets.map((asset) => {
                    const active = asset.id === (activeAsset?.id ?? "");
                    return (
                      <button
                        key={asset.id}
                        type="button"
                        onClick={() => setActiveAssetId(asset.id)}
                        title={asset.prompt}
                        className={cn(
                          "playground-thumb group relative aspect-square overflow-hidden rounded-md border bg-black text-left",
                          active ? cn(activeAccent.border, "ring-2", activeAccent.ring) : "border-[#25211b] hover:border-white/20",
                        )}
                      >
                        {asset.kind === "video" ? (
                          <video src={asset.url} muted playsInline className="size-full object-cover" />
                        ) : (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={asset.url} alt={asset.prompt} className="size-full object-cover" />
                        )}
                        <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/80 to-transparent px-1.5 pb-1 pt-3 text-[0.55rem] text-[#cfc4b8]">
                          {asset.modelLabel}
                        </span>
                        {asset.kind === "video" ? (
                          <span className="absolute right-1 top-1 rounded bg-black/70 px-1 font-mono text-[0.5rem] uppercase tracking-[0.18em] text-white/80">
                            video
                          </span>
                        ) : null}
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

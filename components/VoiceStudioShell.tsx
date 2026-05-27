"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  AudioLines,
  Download,
  History,
  LoaderCircle,
  Mic,
  Pause,
  Play,
  Settings2,
  Sparkles,
  Square,
  Trash2,
  TriangleAlert,
  Upload,
  Volume2,
  Wand2,
  X,
} from "lucide-react";
import { languageOptions, useLanguage, type WebLanguage } from "@/components/LanguageProvider";
import { cn } from "@/lib/utils";

type Mode = "auto" | "design" | "clone";

type Preset = {
  id: string;
  label: string;
  mode: Mode;
  instruct: string | null;
};

type Status =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "offline"; message: string }
  | { kind: "loading-model" }
  | { kind: "generating" }
  | { kind: "error"; message: string };

type HistoryEntry = {
  id: string;
  audioUrl: string;
  text: string;
  mode: Mode;
  preset?: string;
  durationSec: number;
  elapsedSec: number;
  createdAt: number;
};

const TAG_GROUPS: ReadonlyArray<{ label: string; tags: ReadonlyArray<string> }> = [
  { label: "Cảm xúc", tags: ["[laughter]", "[sigh]", "[confirmation-en]", "[dissatisfaction-hnn]"] },
  { label: "Hỏi", tags: ["[question-en]", "[question-ah]", "[question-oh]", "[question-ei]", "[question-yi]"] },
  { label: "Ngạc nhiên", tags: ["[surprise-ah]", "[surprise-oh]", "[surprise-wa]", "[surprise-yo]"] },
];

type DesignAttr = { value: string; label: string };

const DESIGN_GENDER: ReadonlyArray<DesignAttr> = [
  { value: "female", label: "Nữ" },
  { value: "male", label: "Nam" },
];

const DESIGN_AGE: ReadonlyArray<DesignAttr> = [
  { value: "child", label: "Trẻ em" },
  { value: "teenager", label: "Thiếu niên" },
  { value: "young adult", label: "Người trẻ" },
  { value: "middle-aged", label: "Trung niên" },
  { value: "elderly", label: "Lớn tuổi" },
];

const DESIGN_PITCH: ReadonlyArray<DesignAttr> = [
  { value: "very low pitch", label: "Rất trầm" },
  { value: "low pitch", label: "Trầm" },
  { value: "moderate pitch", label: "Trung bình" },
  { value: "high pitch", label: "Cao" },
  { value: "very high pitch", label: "Rất cao" },
];

const DESIGN_ACCENT: ReadonlyArray<DesignAttr> = [
  { value: "", label: "Không" },
  { value: "american accent", label: "Mỹ" },
  { value: "british accent", label: "Anh" },
  { value: "australian accent", label: "Úc" },
  { value: "canadian accent", label: "Canada" },
  { value: "indian accent", label: "Ấn Độ" },
  { value: "chinese accent", label: "Trung" },
  { value: "japanese accent", label: "Nhật" },
  { value: "korean accent", label: "Hàn" },
  { value: "russian accent", label: "Nga" },
  { value: "portuguese accent", label: "Bồ" },
];

const DESIGN_EXTRA: ReadonlyArray<DesignAttr> = [
  { value: "whisper", label: "Thì thầm" },
];

const LANGUAGES: ReadonlyArray<{ code: string; label: string }> = [
  { code: "", label: "Auto" },
  { code: "vi", label: "Tiếng Việt" },
  { code: "en", label: "English" },
  { code: "zh", label: "中文" },
  { code: "ja", label: "日本語" },
  { code: "ko", label: "한국어" },
  { code: "fr", label: "Français" },
  { code: "es", label: "Español" },
];

const voiceCopy = {
  en: {
    back: "Back to home",
    title: "Voice Studio",
    subtitle: "OmniVoice / TTS · Clone · Design",
    online: "Online",
    offline: "Offline",
    loading: "Loading model",
    generating: "Generating",
    statusError: "Error",
    statusIdle: "Ready",

    modeAuto: "Auto",
    modeDesign: "Design",
    modeClone: "Clone",
    modeAutoHint: "Model picks a voice",
    modeDesignHint: "Describe a voice in words",
    modeCloneHint: "Mimic a reference clip",

    presetTitle: "Preset voices",
    presetEmpty: "No presets — server offline",
    historyTitle: "This session",
    historyEmpty: "No clips yet — clips reset on reload",
    historyClear: "Clear all",

    referenceTitle: "Reference clip",
    referenceHint: "3–10 seconds, same language as the target",
    referenceUpload: "Upload audio",
    referenceTranscript: "Transcript (optional)",

    instructTitle: "Voice attributes",
    instructHint: "Pick attributes — only validated combinations work",
    designGender: "Gender",
    designAge: "Age",
    designPitch: "Pitch",
    designAccent: "Accent",
    designWhisper: "Whisper",

    textTitle: "Text",
    textPlaceholder: "Type or paste the text to read aloud…",
    textCharCount: "chars",
    insertTag: "Insert tag",

    settingsTitle: "Generation",
    settingsLanguage: "Language",
    settingsSpeed: "Speed",
    settingsSteps: "Diffusion steps",
    settingsGuidance: "Guidance scale",
    settingsDuration: "Fixed duration (s)",
    settingsDurationAuto: "Auto",
    settingsDenoise: "Denoise",

    generate: "Generate",
    stop: "Stop",
    download: "Download",
    play: "Play",
    pause: "Pause",

    serverOffline: "OmniVoice server isn't running. Start it on the host machine:",
    helpRunCommand: "python webai_server.py --port 7862",
    retry: "Retry",
  },
  vi: {
    back: "Về trang chủ",
    title: "Voice Studio",
    subtitle: "OmniVoice / TTS · Nhân bản · Thiết kế",
    online: "Trực tuyến",
    offline: "Offline",
    loading: "Đang nạp model",
    generating: "Đang tạo",
    statusError: "Lỗi",
    statusIdle: "Sẵn sàng",

    modeAuto: "Auto",
    modeDesign: "Thiết kế",
    modeClone: "Nhân bản",
    modeAutoHint: "Model tự chọn giọng",
    modeDesignHint: "Mô tả giọng bằng câu chữ",
    modeCloneHint: "Bắt chước giọng từ mẫu",

    presetTitle: "Giọng có sẵn",
    presetEmpty: "Chưa có preset — server offline",
    historyTitle: "Trong phiên này",
    historyEmpty: "Chưa có clip nào — reload trang sẽ xoá hết",
    historyClear: "Xoá hết",

    referenceTitle: "Mẫu giọng",
    referenceHint: "3–10 giây, cùng ngôn ngữ với text muốn đọc",
    referenceUpload: "Tải audio mẫu",
    referenceTranscript: "Phiên âm mẫu (tuỳ chọn)",

    instructTitle: "Thuộc tính giọng",
    instructHint: "Chọn thuộc tính — chỉ tổ hợp hợp lệ mới chạy được",
    designGender: "Giới tính",
    designAge: "Độ tuổi",
    designPitch: "Cao độ",
    designAccent: "Giọng vùng",
    designWhisper: "Thì thầm",

    textTitle: "Văn bản",
    textPlaceholder: "Nhập hoặc dán văn bản cần đọc…",
    textCharCount: "ký tự",
    insertTag: "Chèn tag",

    settingsTitle: "Tham số",
    settingsLanguage: "Ngôn ngữ",
    settingsSpeed: "Tốc độ",
    settingsSteps: "Diffusion steps",
    settingsGuidance: "Guidance scale",
    settingsDuration: "Độ dài cố định (giây)",
    settingsDurationAuto: "Tự động",
    settingsDenoise: "Khử noise reference",

    generate: "Tạo giọng",
    stop: "Dừng",
    download: "Tải xuống",
    play: "Phát",
    pause: "Tạm dừng",

    serverOffline: "Server OmniVoice chưa chạy. Khởi động ở máy local:",
    helpRunCommand: "python webai_server.py --port 7862",
    retry: "Thử lại",
  },
} satisfies Record<WebLanguage, Record<string, string>>;

const formatTime = (sec: number) => {
  if (!Number.isFinite(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
};

export function VoiceStudioShell() {
  const { language, setLanguage } = useLanguage();
  const copy = voiceCopy[language];

  const [mode, setMode] = useState<Mode>("auto");
  const [text, setText] = useState("");
  const [designGender, setDesignGender] = useState<string>("female");
  const [designAge, setDesignAge] = useState<string>("young adult");
  const [designPitch, setDesignPitch] = useState<string>("moderate pitch");
  const [designAccent, setDesignAccent] = useState<string>("");
  const [designWhisper, setDesignWhisper] = useState(false);
  const [refAudio, setRefAudio] = useState<File | null>(null);
  const [refText, setRefText] = useState("");
  const [genLanguage, setGenLanguage] = useState("");
  const [speed, setSpeed] = useState(1.0);
  const [numStep, setNumStep] = useState(32);
  const [guidanceScale, setGuidanceScale] = useState(2.0);
  const [duration, setDuration] = useState<number | null>(null);
  const [denoise, setDenoise] = useState(true);
  const [activePreset, setActivePreset] = useState<string | null>("auto");

  const [status, setStatus] = useState<Status>({ kind: "checking" });
  const [presets, setPresets] = useState<Preset[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [activeClipId, setActiveClipId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const checkHealth = useCallback(async () => {
    setStatus({ kind: "checking" });
    try {
      const response = await fetch("/api/voice-studio/health", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) {
        setStatus({ kind: "offline", message: data?.message ?? copy.serverOffline });
        return;
      }
      if (!data?.loaded) {
        setStatus({ kind: "loading-model" });
        return;
      }
      setStatus({ kind: "idle" });

      const voicesRes = await fetch("/api/voice-studio/voices", { cache: "no-store" });
      if (voicesRes.ok) {
        const voicesData = await voicesRes.json();
        setPresets(Array.isArray(voicesData?.presets) ? voicesData.presets : []);
      }
    } catch {
      setStatus({ kind: "offline", message: copy.serverOffline });
    }
  }, [copy.serverOffline]);

  useEffect(() => {
    void checkHealth();
  }, [checkHealth]);

  // Auto-retry while offline / loading. Stops once status is idle/generating/error.
  useEffect(() => {
    if (status.kind !== "offline" && status.kind !== "loading-model") return;
    const id = window.setInterval(() => {
      void checkHealth();
    }, 5_000);
    return () => window.clearInterval(id);
  }, [status.kind, checkHealth]);

  const isBusy = status.kind === "generating";
  const isReady = status.kind === "idle";

  const activeClip = useMemo(
    () => history.find((h) => h.id === activeClipId) ?? null,
    [history, activeClipId],
  );

  const designInstruct = useMemo(() => {
    const parts = [designGender, designAge, designPitch];
    if (designAccent) parts.push(designAccent);
    if (designWhisper) parts.push("whisper");
    return parts.filter(Boolean).join(", ");
  }, [designGender, designAge, designPitch, designAccent, designWhisper]);

  const onPickPreset = (preset: Preset) => {
    setActivePreset(preset.id);
    setMode(preset.mode);
    if (preset.instruct) {
      // Parse server preset back into picker state
      const parts = preset.instruct.split(",").map((s) => s.trim());
      const g = parts.find((p) => DESIGN_GENDER.some((x) => x.value === p));
      const a = parts.find((p) => DESIGN_AGE.some((x) => x.value === p));
      const pi = parts.find((p) => DESIGN_PITCH.some((x) => x.value === p));
      const ac = parts.find((p) => DESIGN_ACCENT.some((x) => x.value === p && x.value !== ""));
      if (g) setDesignGender(g);
      if (a) setDesignAge(a);
      if (pi) setDesignPitch(pi);
      setDesignAccent(ac ?? "");
      setDesignWhisper(parts.includes("whisper"));
    }
  };

  const insertTag = (tag: string) => {
    const el = textareaRef.current;
    if (!el) {
      setText((t) => `${t}${t.endsWith(" ") || !t ? "" : " "}${tag} `);
      return;
    }
    const start = el.selectionStart ?? text.length;
    const end = el.selectionEnd ?? text.length;
    const next = `${text.slice(0, start)}${tag} ${text.slice(end)}`;
    setText(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + tag.length + 1, start + tag.length + 1);
    });
  };

  const onGenerate = async () => {
    if (!text.trim()) return;
    if (mode === "design" && !designInstruct.trim()) return;
    if (mode === "clone" && !refAudio) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setStatus({ kind: "generating" });

    const form = new FormData();
    form.set("text", text.trim());
    form.set("mode", mode);
    if (genLanguage) form.set("language", genLanguage);
    form.set("speed", String(speed));
    form.set("num_step", String(numStep));
    form.set("guidance_scale", String(guidanceScale));
    form.set("denoise", denoise ? "true" : "false");
    if (duration !== null && duration > 0) form.set("duration", String(duration));
    if (mode === "design") form.set("instruct", designInstruct);
    if (mode === "clone" && refAudio) {
      form.set("ref_audio", refAudio);
      if (refText.trim()) form.set("ref_text", refText.trim());
    }

    try {
      const response = await fetch("/api/voice-studio/clone", {
        method: "POST",
        body: form,
        signal: controller.signal,
      });
      const data = await response.json();
      if (!response.ok || !data?.ok) {
        throw new Error(data?.message ?? `HTTP ${response.status}`);
      }
      const clip: HistoryEntry = {
        id: data.id,
        audioUrl: `/api/voice-studio/audio/${data.id}`,
        text: text.trim(),
        mode,
        preset: activePreset ?? undefined,
        durationSec: data.duration_sec ?? 0,
        elapsedSec: data.elapsed_sec ?? 0,
        createdAt: Date.now(),
      };
      setHistory((h) => [clip, ...h].slice(0, 24));
      setActiveClipId(clip.id);
      setStatus({ kind: "idle" });
    } catch (error) {
      if (controller.signal.aborted) {
        setStatus({ kind: "idle" });
        return;
      }
      setStatus({
        kind: "error",
        message: error instanceof Error ? error.message : "Generation failed",
      });
    }
  };

  const onStop = () => {
    abortRef.current?.abort();
    setStatus({ kind: "idle" });
  };

  const onPickRefAudio = (file: File | null) => {
    if (file && file.size > 25 * 1024 * 1024) return;
    setRefAudio(file);
  };

  const togglePlay = () => {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) void el.play();
    else el.pause();
  };

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onTime = () => {
      if (el.duration > 0) setAudioProgress(el.currentTime / el.duration);
    };
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("ended", onPause);
    return () => {
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("ended", onPause);
    };
  }, [activeClip?.id]);

  const statusBadge = (() => {
    switch (status.kind) {
      case "idle":
        return { dot: "bg-[#45a85d]", label: copy.statusIdle, tone: "text-[#7dd391]" };
      case "checking":
      case "loading-model":
        return { dot: "bg-[#d6a548] animate-pulse", label: copy.loading, tone: "text-[#d6a548]" };
      case "generating":
        return {
          dot: "bg-[#ef4444] animate-pulse",
          label: copy.generating,
          tone: "text-[#ff8e85]",
        };
      case "offline":
        return { dot: "bg-[#ef4444]", label: copy.offline, tone: "text-[#ff8e85]" };
      case "error":
        return { dot: "bg-[#ef4444]", label: copy.statusError, tone: "text-[#ff8e85]" };
    }
  })();

  return (
    <main className="relative flex h-screen flex-col overflow-hidden bg-[#0b0a08] text-[#e8dfd4]">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 14% 8%, rgba(239,68,68,0.14), transparent 28%), radial-gradient(circle at 86% 12%, rgba(214,165,72,0.08), transparent 26%), linear-gradient(180deg,#0d0c0a 0%,#070604 100%)",
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
            <AudioLines className="size-4" />
          </div>
          <div className="hidden min-w-0 sm:block">
            <p className="font-mono text-[0.58rem] uppercase tracking-[0.22em] text-[#ef4444]">{copy.subtitle}</p>
            <h1 className="truncate text-base font-black tracking-[-0.04em] text-[#f4eadc]">{copy.title}</h1>
          </div>
        </div>

        <nav className="ml-1 hidden flex-1 items-center justify-center gap-1 md:flex" aria-label="Voice modes">
          {(
            [
              { id: "auto" as const, label: copy.modeAuto, hint: copy.modeAutoHint, icon: Wand2 },
              { id: "design" as const, label: copy.modeDesign, hint: copy.modeDesignHint, icon: Sparkles },
              { id: "clone" as const, label: copy.modeClone, hint: copy.modeCloneHint, icon: Mic },
            ]
          ).map((item) => {
            const Icon = item.icon;
            const active = item.id === mode;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setMode(item.id)}
                aria-pressed={active}
                title={item.hint}
                className={cn(
                  "flex h-10 items-center gap-2 rounded-md border px-3 font-mono text-[0.62rem] uppercase tracking-[0.16em] transition",
                  active
                    ? "border-[#ef4444]/50 bg-[#ef4444]/12 text-[#ffe9e5] shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset]"
                    : "border-[#25211b] text-[#9a9087] hover:border-white/20 hover:text-[#f4eadc]",
                )}
              >
                <Icon className={cn("size-3.5 transition-transform duration-300", active && "scale-110")} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 font-mono text-[0.58rem] uppercase tracking-[0.16em] sm:flex">
            <span className={cn("size-1.5 rounded-full", statusBadge.dot)} />
            <span className={statusBadge.tone}>{statusBadge.label}</span>
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
                  language === option.value
                    ? "bg-[#ef4444] text-[#1a0807]"
                    : "text-[#9f968b] hover:text-[#f4eadc]",
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
          {(["auto", "design", "clone"] as const).map((id) => {
            const Icon = id === "auto" ? Wand2 : id === "design" ? Sparkles : Mic;
            const label = id === "auto" ? copy.modeAuto : id === "design" ? copy.modeDesign : copy.modeClone;
            const active = id === mode;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setMode(id)}
                className={cn(
                  "flex h-9 items-center gap-1.5 rounded-md border px-3 font-mono text-[0.6rem] uppercase tracking-[0.16em] transition",
                  active
                    ? "border-[#ef4444]/50 bg-[#ef4444]/10 text-[#ffe9e5]"
                    : "border-[#25211b] text-[#9a9087]",
                )}
              >
                <Icon className="size-3.5" />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {status.kind === "offline" ? (
        <div className="relative z-10 mx-auto mt-6 w-full max-w-3xl rounded-xl border border-[#ef4444]/30 bg-[#1a0707]/72 px-5 py-4 text-sm text-[#f4eadc] shadow-[0_18px_60px_rgba(0,0,0,0.55)]">
          <div className="flex items-start gap-3">
            <TriangleAlert className="mt-0.5 size-5 shrink-0 text-[#ef4444]" />
            <div className="flex-1">
              <p className="font-mono text-[0.6rem] uppercase tracking-[0.22em] text-[#ef4444]">
                {copy.offline}
              </p>
              <p className="mt-1 leading-6">{copy.serverOffline}</p>
              <code className="mt-2 inline-block rounded-md border border-[#ef4444]/25 bg-[#0d0504] px-2.5 py-1 font-mono text-[0.7rem] text-[#ffd7d3]">
                {copy.helpRunCommand}
              </code>
            </div>
            <button
              type="button"
              onClick={() => void checkHealth()}
              className="rounded-md border border-[#ef4444]/40 bg-[#ef4444]/12 px-3 py-1.5 font-mono text-[0.6rem] uppercase tracking-[0.18em] text-[#ffe9e5] transition hover:bg-[#ef4444]/20"
            >
              {copy.retry}
            </button>
          </div>
        </div>
      ) : null}

      <div className="relative z-10 grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[22rem_minmax(0,1fr)] xl:grid-cols-[24rem_minmax(0,1fr)]">
        {/* LEFT — presets + history */}
        <aside className="hidden min-h-0 flex-col border-r border-[#25211b] bg-[#0a0907]/72 lg:flex">
          <div className="flex shrink-0 items-center justify-between border-b border-[#25211b] px-4 py-3">
            <p className="font-mono text-[0.58rem] uppercase tracking-[0.22em] text-[#ef4444]">
              {copy.presetTitle}
            </p>
            <Volume2 className="size-3.5 text-[#9a9087]" />
          </div>
          <div className="grid shrink-0 grid-cols-1 gap-1.5 p-3">
            {presets.length === 0 ? (
              <p className="rounded-md border border-white/8 bg-white/[0.025] px-3 py-3 font-mono text-[0.58rem] uppercase tracking-[0.18em] text-[#756d64]">
                {copy.presetEmpty}
              </p>
            ) : (
              presets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => onPickPreset(preset)}
                  className={cn(
                    "group flex items-center justify-between gap-3 rounded-md border px-3 py-2.5 text-left transition",
                    activePreset === preset.id
                      ? "border-[#ef4444]/45 bg-[#ef4444]/10 text-[#ffe9e5] shadow-[0_0_0_1px_rgba(239,68,68,0.18)_inset]"
                      : "border-[#25211b] bg-white/[0.02] text-[#dfd5c7] hover:border-white/20 hover:bg-white/[0.05]",
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[0.78rem] font-bold">{preset.label}</p>
                    {preset.instruct ? (
                      <p className="mt-0.5 truncate font-mono text-[0.55rem] uppercase tracking-[0.14em] text-[#756d64]">
                        {preset.instruct}
                      </p>
                    ) : (
                      <p className="mt-0.5 font-mono text-[0.55rem] uppercase tracking-[0.14em] text-[#756d64]">
                        {preset.mode}
                      </p>
                    )}
                  </div>
                  <span
                    className={cn(
                      "size-1.5 rounded-full",
                      activePreset === preset.id ? "bg-[#ef4444]" : "bg-[#3a322a] group-hover:bg-[#9a9087]",
                    )}
                  />
                </button>
              ))
            )}
          </div>

          <div className="flex shrink-0 items-center justify-between border-y border-[#25211b] px-4 py-3">
            <p className="flex items-center gap-2 font-mono text-[0.58rem] uppercase tracking-[0.22em] text-[#d6a548]">
              <History className="size-3.5" />
              {copy.historyTitle}
            </p>
            {history.length > 0 ? (
              <button
                type="button"
                onClick={() => {
                  setHistory([]);
                  setActiveClipId(null);
                }}
                className="rounded border border-white/10 bg-white/[0.02] px-2 py-0.5 font-mono text-[0.5rem] uppercase tracking-[0.14em] text-[#9a9087] transition hover:border-[#ef4444]/40 hover:text-[#ffe9e5]"
              >
                {copy.historyClear}
              </button>
            ) : null}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {history.length === 0 ? (
              <p className="rounded-md border border-white/8 bg-white/[0.025] px-3 py-3 font-mono text-[0.58rem] uppercase tracking-[0.18em] text-[#756d64]">
                {copy.historyEmpty}
              </p>
            ) : (
              <ul className="space-y-1.5">
                {history.map((clip) => (
                  <li key={clip.id}>
                    <button
                      type="button"
                      onClick={() => setActiveClipId(clip.id)}
                      className={cn(
                        "group flex w-full items-start gap-2 rounded-md border px-3 py-2 text-left transition",
                        activeClipId === clip.id
                          ? "border-[#d6a548]/40 bg-[#d6a548]/8 text-[#fff2d3]"
                          : "border-[#25211b] bg-white/[0.02] text-[#dfd5c7] hover:border-white/20 hover:bg-white/[0.04]",
                      )}
                    >
                      <span className="mt-1 size-1.5 shrink-0 rounded-full bg-[#d6a548]" />
                      <span className="min-w-0 flex-1">
                        <span className="line-clamp-2 text-[0.74rem] leading-snug">{clip.text}</span>
                        <span className="mt-1 flex items-center gap-2 font-mono text-[0.5rem] uppercase tracking-[0.14em] text-[#756d64]">
                          <span>{clip.mode}</span>
                          <span>·</span>
                          <span>{formatTime(clip.durationSec)}</span>
                          <span>·</span>
                          <span>{clip.elapsedSec.toFixed(1)}s gen</span>
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>

        {/* CENTER — workspace */}
        <section className="flex min-h-0 flex-col overflow-y-auto px-4 py-5 sm:px-6 lg:px-7">
          <div className="mx-auto w-full max-w-3xl space-y-4">
            {mode === "clone" ? (
              <div className="rounded-xl border border-[#25211b] bg-[#0c0a08]/72 p-4 shadow-[0_12px_36px_rgba(0,0,0,0.32)]">
                <div className="mb-2 flex items-center justify-between">
                  <p className="font-mono text-[0.58rem] uppercase tracking-[0.22em] text-[#ef4444]">
                    {copy.referenceTitle}
                  </p>
                  <span className="font-mono text-[0.5rem] uppercase tracking-[0.16em] text-[#756d64]">
                    {copy.referenceHint}
                  </span>
                </div>
                <label
                  htmlFor="ref-audio-input"
                  className="flex cursor-pointer items-center gap-3 rounded-md border border-dashed border-[#ef4444]/30 bg-[#ef4444]/[0.04] px-3 py-3 transition hover:border-[#ef4444]/55 hover:bg-[#ef4444]/[0.08]"
                >
                  <Upload className="size-4 text-[#ef4444]" />
                  <span className="min-w-0 flex-1 truncate text-[0.8rem] text-[#dfd5c7]">
                    {refAudio ? refAudio.name : copy.referenceUpload}
                  </span>
                  {refAudio ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setRefAudio(null);
                      }}
                      className="rounded border border-white/10 bg-white/[0.04] p-1 text-[#9a9087] transition hover:text-[#f4eadc]"
                      aria-label="Remove"
                    >
                      <X className="size-3" />
                    </button>
                  ) : null}
                </label>
                <input
                  id="ref-audio-input"
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={(e) => onPickRefAudio(e.target.files?.[0] ?? null)}
                />
                <input
                  type="text"
                  value={refText}
                  onChange={(e) => setRefText(e.target.value)}
                  placeholder={copy.referenceTranscript}
                  className="mt-2 w-full rounded-md border border-[#25211b] bg-[#0a0907]/82 px-3 py-2 text-[0.82rem] text-[#f4eadc] placeholder:text-[#756d64] focus:border-[#ef4444]/45 focus:outline-none"
                />
              </div>
            ) : null}

            {mode === "design" ? (
              <div className="rounded-xl border border-[#25211b] bg-[#0c0a08]/72 p-4 shadow-[0_12px_36px_rgba(0,0,0,0.32)]">
                <div className="mb-3 flex items-center justify-between">
                  <p className="font-mono text-[0.58rem] uppercase tracking-[0.22em] text-[#ef4444]">
                    {copy.instructTitle}
                  </p>
                  <span className="font-mono text-[0.5rem] uppercase tracking-[0.16em] text-[#756d64]">
                    {copy.instructHint}
                  </span>
                </div>
                <div className="space-y-3">
                  {(
                    [
                      { label: copy.designGender, options: DESIGN_GENDER, value: designGender, set: setDesignGender },
                      { label: copy.designAge, options: DESIGN_AGE, value: designAge, set: setDesignAge },
                      { label: copy.designPitch, options: DESIGN_PITCH, value: designPitch, set: setDesignPitch },
                      { label: copy.designAccent, options: DESIGN_ACCENT, value: designAccent, set: setDesignAccent },
                    ]
                  ).map((row) => (
                    <div key={row.label} className="flex flex-wrap items-center gap-1.5">
                      <span className="mr-1 w-20 shrink-0 font-mono text-[0.55rem] uppercase tracking-[0.16em] text-[#9a9087]">
                        {row.label}
                      </span>
                      {row.options.map((opt) => {
                        const active = row.value === opt.value;
                        return (
                          <button
                            key={`${row.label}-${opt.value}`}
                            type="button"
                            onClick={() => row.set(opt.value)}
                            className={cn(
                              "rounded-md border px-2.5 py-1 font-mono text-[0.55rem] uppercase tracking-[0.14em] transition",
                              active
                                ? "border-[#ef4444]/55 bg-[#ef4444]/14 text-[#ffe9e5] shadow-[0_0_0_1px_rgba(239,68,68,0.2)_inset]"
                                : "border-[#25211b] bg-white/[0.025] text-[#9a9087] hover:border-white/20 hover:text-[#dfd5c7]",
                            )}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                  <label className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      checked={designWhisper}
                      onChange={(e) => setDesignWhisper(e.target.checked)}
                      className="size-3.5 accent-[#ef4444]"
                    />
                    <span className="font-mono text-[0.58rem] uppercase tracking-[0.16em] text-[#dfd5c7]">
                      {copy.designWhisper}
                    </span>
                  </label>
                </div>
                <p className="mt-3 rounded-md border border-white/8 bg-black/40 px-3 py-2 font-mono text-[0.65rem] text-[#dfd5c7]">
                  <span className="text-[#756d64]">instruct: </span>
                  {designInstruct || <span className="italic text-[#756d64]">empty</span>}
                </p>
              </div>
            ) : null}

            <div className="rounded-xl border border-[#25211b] bg-[#0c0a08]/72 p-4 shadow-[0_12px_36px_rgba(0,0,0,0.32)]">
              <div className="mb-2 flex items-center justify-between">
                <p className="font-mono text-[0.58rem] uppercase tracking-[0.22em] text-[#ef4444]">
                  {copy.textTitle}
                </p>
                <span className="font-mono text-[0.5rem] uppercase tracking-[0.16em] text-[#756d64]">
                  {text.length} {copy.textCharCount}
                </span>
              </div>
              <textarea
                ref={textareaRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={copy.textPlaceholder}
                rows={6}
                className="w-full resize-y rounded-md border border-[#25211b] bg-[#0a0907]/82 px-3 py-2.5 text-[0.92rem] leading-7 text-[#f4eadc] placeholder:text-[#756d64] focus:border-[#ef4444]/45 focus:outline-none"
              />
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <span className="font-mono text-[0.5rem] uppercase tracking-[0.16em] text-[#756d64]">
                  {copy.insertTag}:
                </span>
                {TAG_GROUPS.map((group) => (
                  <div key={group.label} className="flex items-center gap-1">
                    <span className="font-mono text-[0.48rem] uppercase tracking-[0.14em] text-[#5e574e]">
                      {group.label}
                    </span>
                    {group.tags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => insertTag(tag)}
                        title={tag}
                        className="rounded border border-white/10 bg-white/[0.025] px-2 py-0.5 font-mono text-[0.55rem] text-[#dfd5c7] transition hover:border-[#ef4444]/35 hover:bg-[#ef4444]/[0.08] hover:text-[#ffe9e5]"
                      >
                        {tag.replace(/^\[|\]$/g, "").replace(/-en$/, "").replace(/^(question|surprise|dissatisfaction)-/, "")}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-[#25211b] bg-[#0c0a08]/72 p-4 shadow-[0_12px_36px_rgba(0,0,0,0.32)]">
              <p className="mb-3 flex items-center gap-2 font-mono text-[0.58rem] uppercase tracking-[0.22em] text-[#d6a548]">
                <Settings2 className="size-3.5" />
                {copy.settingsTitle}
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="flex flex-col gap-1">
                  <span className="font-mono text-[0.55rem] uppercase tracking-[0.16em] text-[#9a9087]">
                    {copy.settingsLanguage}
                  </span>
                  <select
                    value={genLanguage}
                    onChange={(e) => setGenLanguage(e.target.value)}
                    className="rounded-md border border-[#25211b] bg-[#0a0907]/82 px-2 py-1.5 text-[0.78rem] text-[#f4eadc] focus:border-[#ef4444]/45 focus:outline-none"
                  >
                    {LANGUAGES.map((l) => (
                      <option key={l.code} value={l.code}>
                        {l.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="font-mono text-[0.55rem] uppercase tracking-[0.16em] text-[#9a9087]">
                    {copy.settingsSpeed} · {speed.toFixed(1)}x
                  </span>
                  <input
                    type="range"
                    min={0.5}
                    max={2}
                    step={0.1}
                    value={speed}
                    onChange={(e) => setSpeed(parseFloat(e.target.value))}
                    className="accent-[#ef4444]"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="font-mono text-[0.55rem] uppercase tracking-[0.16em] text-[#9a9087]">
                    {copy.settingsSteps} · {numStep}
                  </span>
                  <input
                    type="range"
                    min={8}
                    max={64}
                    step={4}
                    value={numStep}
                    onChange={(e) => setNumStep(parseInt(e.target.value, 10))}
                    className="accent-[#ef4444]"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="font-mono text-[0.55rem] uppercase tracking-[0.16em] text-[#9a9087]">
                    {copy.settingsGuidance} · {guidanceScale.toFixed(1)}
                  </span>
                  <input
                    type="range"
                    min={1}
                    max={5}
                    step={0.1}
                    value={guidanceScale}
                    onChange={(e) => setGuidanceScale(parseFloat(e.target.value))}
                    className="accent-[#ef4444]"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="font-mono text-[0.55rem] uppercase tracking-[0.16em] text-[#9a9087]">
                    {copy.settingsDuration} · {duration === null ? copy.settingsDurationAuto : `${duration.toFixed(1)}s`}
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={60}
                    step={0.5}
                    value={duration ?? 0}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      setDuration(v === 0 ? null : v);
                    }}
                    className="accent-[#ef4444]"
                  />
                </label>
                <label className="flex cursor-pointer items-center gap-2 rounded-md border border-[#25211b] bg-[#0a0907]/82 px-3 py-2">
                  <input
                    type="checkbox"
                    checked={denoise}
                    onChange={(e) => setDenoise(e.target.checked)}
                    className="size-3.5 accent-[#ef4444]"
                  />
                  <span className="font-mono text-[0.55rem] uppercase tracking-[0.16em] text-[#dfd5c7]">
                    {copy.settingsDenoise}
                  </span>
                </label>
              </div>
            </div>

            <div className="sticky bottom-0 z-10 flex items-center justify-between gap-3 rounded-xl border border-[#ef4444]/24 bg-[#0d0504]/92 px-4 py-3 shadow-[0_18px_60px_rgba(239,68,68,0.14),0_8px_30px_rgba(0,0,0,0.5)] backdrop-blur">
              {isBusy ? (
                <button
                  type="button"
                  onClick={onStop}
                  className="flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-4 py-2 font-mono text-[0.62rem] uppercase tracking-[0.18em] text-[#dfd5c7] transition hover:border-white/30 hover:text-[#f4eadc]"
                >
                  <Square className="size-3.5" />
                  {copy.stop}
                </button>
              ) : (
                <span className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[#9a9087]">
                  {mode === "clone" ? "clone" : mode === "design" ? "design" : "auto"} · {numStep} steps · {speed.toFixed(1)}x
                </span>
              )}
              <button
                type="button"
                onClick={() => void onGenerate()}
                disabled={
                  !isReady ||
                  !text.trim() ||
                  (mode === "design" && !designInstruct.trim()) ||
                  (mode === "clone" && !refAudio)
                }
                className="flex items-center gap-2 rounded-md border border-[#ef4444]/55 bg-[#ef4444] px-5 py-2 font-mono text-[0.7rem] font-bold uppercase tracking-[0.18em] text-[#1a0807] shadow-[0_12px_30px_rgba(239,68,68,0.36)] transition hover:bg-[#ff5a50] disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none"
              >
                {isBusy ? <LoaderCircle className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
                {copy.generate}
              </button>
            </div>

            {activeClip ? (
              <div className="rounded-xl border border-[#d6a548]/30 bg-[#1a1208]/64 p-4 shadow-[0_12px_36px_rgba(0,0,0,0.32)]">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-[0.58rem] uppercase tracking-[0.22em] text-[#d6a548]">
                      {activeClip.mode} · {formatTime(activeClip.durationSec)} · {activeClip.elapsedSec.toFixed(1)}s gen
                    </p>
                    <p className="mt-1 line-clamp-2 text-[0.82rem] text-[#f4eadc]">{activeClip.text}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      type="button"
                      onClick={togglePlay}
                      className="flex size-9 items-center justify-center rounded-md border border-[#d6a548]/35 bg-[#d6a548]/12 text-[#fff2d3] transition hover:bg-[#d6a548]/22"
                      aria-label={isPlaying ? copy.pause : copy.play}
                    >
                      {isPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
                    </button>
                    <a
                      href={activeClip.audioUrl}
                      download={`mrnine-voice-${activeClip.id}.wav`}
                      className="flex size-9 items-center justify-center rounded-md border border-white/10 bg-white/[0.04] text-[#dfd5c7] transition hover:border-white/30 hover:text-[#f4eadc]"
                      aria-label={copy.download}
                    >
                      <Download className="size-4" />
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        setHistory((h) => h.filter((c) => c.id !== activeClip.id));
                        setActiveClipId(null);
                      }}
                      className="flex size-9 items-center justify-center rounded-md border border-white/10 bg-white/[0.04] text-[#9a9087] transition hover:border-[#ef4444]/40 hover:text-[#ff8e85]"
                      aria-label="Delete"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
                  <div
                    className="h-full bg-gradient-to-r from-[#ef4444] via-[#d6a548] to-[#ef4444] transition-[width]"
                    style={{ width: `${audioProgress * 100}%` }}
                  />
                </div>
                <audio
                  ref={audioRef}
                  src={activeClip.audioUrl}
                  preload="auto"
                  controls={false}
                  autoPlay
                />
              </div>
            ) : null}

            {status.kind === "error" ? (
              <div className="rounded-xl border border-[#ef4444]/40 bg-[#1a0707]/72 px-4 py-3 text-sm text-[#ffd7d3]">
                <p className="font-mono text-[0.58rem] uppercase tracking-[0.22em] text-[#ef4444]">
                  {copy.statusError}
                </p>
                <p className="mt-1">{status.message}</p>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}

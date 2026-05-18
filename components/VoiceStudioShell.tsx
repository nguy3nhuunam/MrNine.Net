"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  AudioLines,
  CheckCircle2,
  Copy,
  Loader2,
  RefreshCw,
  Terminal,
  TriangleAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { languageOptions, useLanguage, type WebLanguage } from "@/components/LanguageProvider";

type StudioState = "starting" | "ready" | "setup" | "error";

type StartResponse = {
  ok?: boolean;
  installed?: boolean;
  status?: string;
  url?: string;
  message?: string;
  installCommands?: string[];
  log?: string;
};

const framedStudioUrl = "/voice-studio-runtime/";

const voiceCopy = {
  en: {
    back: "Back to MrNine home",
    title: "Voice Studio",
    online: "Online",
    starting: "Starting",
    setup: "Setup",
    reload: "Reload",
    startingMessage: "Starting OmniVoice Studio...",
    runtimeMissing: "OmniVoice runtime is not installed.",
    failed: "OmniVoice Studio failed to start.",
    ready: "OmniVoice Studio is ready.",
    runtime: "OmniVoice runtime",
    loadingLocal: "Loading local Studio",
    setupRequired: "Runtime setup required",
    couldNotStart: "Studio could not start",
    localInstall: "Local install",
    commands: "Commands for this machine",
    startupLog: "Startup log",
    copy: "Copy",
    features: ["Voice cloning", "Voice design", "600+ language TTS", "Gradio UI preserved"],
  },
  vi: {
    back: "Quay lại trang chủ MrNine",
    title: "Voice Studio",
    online: "Trực tuyến",
    starting: "Đang khởi động",
    setup: "Cài đặt",
    reload: "Tải lại",
    startingMessage: "Đang khởi động OmniVoice Studio...",
    runtimeMissing: "OmniVoice runtime chưa được cài đặt.",
    failed: "Không thể khởi động OmniVoice Studio.",
    ready: "OmniVoice Studio đã sẵn sàng.",
    runtime: "Runtime OmniVoice",
    loadingLocal: "Đang tải Studio local",
    setupRequired: "Cần cài đặt runtime",
    couldNotStart: "Không thể khởi động Studio",
    localInstall: "Cài đặt local",
    commands: "Lệnh cho máy này",
    startupLog: "Log khởi động",
    copy: "Sao chép",
    features: ["Nhân bản giọng", "Thiết kế giọng", "TTS hơn 600 ngôn ngữ", "Giữ nguyên UI Gradio"],
  },
} satisfies Record<WebLanguage, Record<string, string | string[]>>;

export function VoiceStudioShell() {
  const { language, setLanguage } = useLanguage();
  const copy = voiceCopy[language];
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [state, setState] = useState<StudioState>("starting");
  const [studioUrl, setStudioUrl] = useState(framedStudioUrl);
  const [message, setMessage] = useState(copy.startingMessage as string);
  const [commands, setCommands] = useState<string[]>([]);
  const [runtimeLog, setRuntimeLog] = useState<string | undefined>();

  useEffect(() => {
    let cancelled = false;
    let poll: number | undefined;

    async function startStudio() {
      setState("starting");
      setMessage(copy.startingMessage as string);

      try {
        const response = await fetch("/api/voice-studio/start", { method: "POST" });
        const data = (await response.json()) as StartResponse;

        if (data.url) {
          setStudioUrl(data.url);
        }

        if (response.status === 409 || data.installed === false) {
          if (!cancelled) {
            setState("setup");
            setMessage(data.message || (copy.runtimeMissing as string));
            setCommands(data.installCommands || []);
          }
          return;
        }

        if (!response.ok || data.ok === false) {
          throw new Error(data.message || (copy.failed as string));
        }

        poll = window.setInterval(async () => {
          const statusResponse = await fetch("/api/voice-studio/start", { cache: "no-store" });
          const status = (await statusResponse.json()) as StartResponse;

          if (status.url) {
            setStudioUrl(status.url);
          }
          if (status.log) {
            setRuntimeLog(status.log);
          }
          if (!cancelled && status.status === "ready") {
            window.clearInterval(poll);
            setState("ready");
            setMessage(copy.ready as string);
          }
        }, 1_250);
      } catch (error) {
        if (!cancelled) {
          setState("error");
          setMessage(error instanceof Error ? error.message : (copy.failed as string));
        }
      }
    }

    void startStudio();

    return () => {
      cancelled = true;
      if (poll) {
        window.clearInterval(poll);
      }
    };
  }, [copy.failed, copy.ready, copy.runtimeMissing, copy.startingMessage]);

  const retry = () => {
    window.location.reload();
  };

  const copyCommands = async () => {
    if (!commands.length) {
      return;
    }

    await navigator.clipboard.writeText(commands.join("\n"));
  };

  const injectTheme = useCallback(() => {
    const doc = iframeRef.current?.contentDocument;

    if (!doc) {
      return;
    }

    doc.documentElement.classList.add("webai-voice-studio");

    let style = doc.getElementById("webai-omnivoice-theme") as HTMLStyleElement | null;

    if (!style) {
      style = doc.createElement("style");
      style.id = "webai-omnivoice-theme";
      doc.head.appendChild(style);
    }

    style.textContent = `
      :root,
      .dark {
        color-scheme: dark;
        --body-background-fill: #0b0a08 !important;
        --background-fill-primary: #0b0a08 !important;
        --background-fill-secondary: rgba(20, 16, 13, 0.92) !important;
        --block-background-fill: rgba(20, 16, 13, 0.82) !important;
        --block-border-color: rgba(239, 68, 68, 0.18) !important;
        --block-border-width: 1px !important;
        --block-radius: 8px !important;
        --button-primary-background-fill: #ef4444 !important;
        --button-primary-background-fill-hover: #ff5a50 !important;
        --button-primary-text-color: #fff5eb !important;
        --button-secondary-background-fill: rgba(255,255,255,0.035) !important;
        --button-secondary-background-fill-hover: rgba(255,255,255,0.07) !important;
        --button-secondary-border-color: rgba(255,255,255,0.10) !important;
        --button-secondary-text-color: #f4eadc !important;
        --checkbox-background-color-selected: #ef4444 !important;
        --color-accent: #ef4444 !important;
        --input-background-fill: rgba(62, 72, 88, 0.52) !important;
        --input-border-color: rgba(255,255,255,0.08) !important;
        --input-radius: 6px !important;
        --link-text-color: #d6a548 !important;
        --link-text-color-hover: #ff5a50 !important;
        --neutral-50: #fff5eb !important;
        --neutral-100: #f4eadc !important;
        --neutral-200: #d8ccbf !important;
        --neutral-300: #b8ada1 !important;
        --neutral-400: #9f968b !important;
        --neutral-500: #756d64 !important;
        --neutral-600: #423a31 !important;
        --neutral-700: #25211b !important;
        --neutral-800: #17120f !important;
        --neutral-900: #0b0a08 !important;
        --primary-500: #ef4444 !important;
        --primary-600: #ef4444 !important;
        --primary-700: #c43a32 !important;
        --shadow-drop: 0 24px 80px rgba(0,0,0,0.36) !important;
      }

      html,
      body,
      gradio-app,
      .gradio-container {
        min-height: 100% !important;
        background:
          radial-gradient(circle at 14% 6%, rgba(214, 165, 72, 0.13), transparent 28rem),
          radial-gradient(circle at 86% 10%, rgba(239, 68, 68, 0.10), transparent 30rem),
          linear-gradient(90deg, rgba(69, 168, 93, 0.055), transparent 38%),
          #0b0a08 !important;
        color: #f4eadc !important;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
        letter-spacing: 0 !important;
      }

      body {
        overflow-x: hidden !important;
      }

      .gradio-container {
        max-width: none !important;
        padding: 28px 34px 44px !important;
      }

      main,
      .main,
      .wrap,
      .contain,
      .app {
        max-width: none !important;
      }

      h1 {
        margin: 0 0 14px !important;
        color: #fff5eb !important;
        font-size: clamp(2.25rem, 5vw, 5.5rem) !important;
        line-height: 0.92 !important;
        letter-spacing: 0 !important;
        font-weight: 950 !important;
      }

      h1::after {
        content: " / Voice Studio";
        color: rgba(239, 68, 68, 0.95);
      }

      h2,
      h3,
      label,
      .label,
      .prose strong {
        color: #fff5eb !important;
        letter-spacing: 0 !important;
      }

      p,
      li,
      .prose,
      .prose p,
      .markdown,
      .svelte-1ed2p3z {
        color: #c8baad !important;
      }

      .prose {
        max-width: 980px !important;
        font-size: 0.95rem !important;
        line-height: 1.6 !important;
      }

      .prose ul {
        margin: 10px 0 16px !important;
      }

      a {
        color: #d6a548 !important;
      }

      .tabs {
        border-bottom: 1px solid rgba(239, 68, 68, 0.18) !important;
        margin-top: 18px !important;
      }

      .tab-nav,
      .tabs button,
      button[role="tab"] {
        border-radius: 6px 6px 0 0 !important;
        color: #9f968b !important;
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace !important;
        font-size: 0.68rem !important;
        font-weight: 700 !important;
        letter-spacing: 0.16em !important;
        text-transform: uppercase !important;
      }

      button[role="tab"][aria-selected="true"],
      .tabs button.selected {
        color: #ef4444 !important;
        border-bottom-color: #ef4444 !important;
      }

      .block,
      .panel,
      .form,
      .form > *,
      .gradio-row > .gradio-column > .block,
      .gradio-column > .block {
        border-color: rgba(239, 68, 68, 0.16) !important;
        background: rgba(20, 16, 13, 0.76) !important;
        border-radius: 8px !important;
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.035) !important;
      }

      .block-label,
      .block-title,
      label[data-testid="block-label"],
      span[data-testid="block-info"],
      .label-wrap > span,
      .label-wrap label,
      .wrap .label {
        width: fit-content !important;
        border: 1px solid rgba(214, 165, 72, 0.26) !important;
        border-radius: 6px !important;
        background: rgba(214, 165, 72, 0.12) !important;
        color: #f7c862 !important;
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace !important;
        font-size: 0.68rem !important;
        font-weight: 800 !important;
        letter-spacing: 0.08em !important;
        text-transform: uppercase !important;
        box-shadow: none !important;
      }

      span[data-testid="block-info"] {
        display: inline-flex !important;
        align-items: center !important;
        min-height: 24px !important;
        padding: 4px 9px !important;
      }

      span[data-testid="block-info"] * {
        color: inherit !important;
        background: transparent !important;
      }

      textarea,
      input,
      select,
      .wrap textarea,
      .wrap input,
      .wrap select,
      [data-testid="textbox"] textarea {
        min-height: auto !important;
        border: 1px solid rgba(69, 168, 93, 0.16) !important;
        background: rgba(11, 10, 8, 0.62) !important;
        color: #f4eadc !important;
        border-radius: 6px !important;
        box-shadow: none !important;
      }

      textarea::placeholder,
      input::placeholder {
        color: rgba(159, 150, 139, 0.70) !important;
      }

      button,
      .button,
      .primary {
        border-radius: 7px !important;
        font-weight: 800 !important;
        letter-spacing: 0 !important;
        transition: transform 160ms ease, border-color 160ms ease, background-color 160ms ease !important;
      }

      button:hover {
        transform: translateY(-1px);
      }

      button.primary,
      .primary,
      button[type="submit"],
      button:has(+ .generating) {
        border: 1px solid rgba(255,255,255,0.14) !important;
        background: linear-gradient(180deg, #ef4444, #b72d28) !important;
        color: #fff5eb !important;
        box-shadow: 0 0 28px rgba(239, 68, 68, 0.22) !important;
      }

      .upload,
      .file-preview,
      [data-testid="file"] {
        border: 1px dashed rgba(214, 165, 72, 0.30) !important;
        background: rgba(11, 10, 8, 0.42) !important;
      }

      .upload .wrap,
      [data-testid="file"] .wrap,
      .file-preview .wrap {
        color: #f7c862 !important;
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace !important;
        font-size: 0.75rem !important;
        font-weight: 800 !important;
        letter-spacing: 0.12em !important;
        text-transform: uppercase !important;
      }

      .upload .wrap .or,
      [data-testid="file"] .wrap .or {
        color: #9f968b !important;
      }

      .upload .wrap svg,
      [data-testid="file"] .wrap svg {
        color: #ef4444 !important;
      }

      [data-testid="block-info"][style],
      span[data-testid="block-info"][style],
      label[data-testid="block-label"],
      label[data-testid="block-label"][style] {
        background: rgba(214, 165, 72, 0.12) !important;
        color: #f7c862 !important;
      }

      label[data-testid="block-label"] svg,
      label[data-testid="block-label"] span {
        color: inherit !important;
        background: transparent !important;
      }

      audio,
      .audio-container,
      [data-testid="audio"] {
        color-scheme: dark !important;
        border-radius: 8px !important;
      }

      .empty,
      .empty span,
      .icon {
        color: #9f968b !important;
      }

      .accordion,
      details {
        border-color: rgba(255,255,255,0.10) !important;
        background: rgba(20, 16, 13, 0.58) !important;
        border-radius: 8px !important;
      }

      @media (max-width: 760px) {
        .gradio-container {
          padding: 18px 14px 32px !important;
        }

        h1 {
          font-size: clamp(2rem, 14vw, 3.8rem) !important;
        }
      }
    `;

    const restyle = () => {
      const labels = Array.from(doc.querySelectorAll("span, label, button, .block-label, .block-title"));

      for (const element of labels) {
        const text = element.textContent?.trim();

        if (!text) {
          continue;
        }

        if (text.includes("Generate") || text.includes("生成")) {
          element.classList.add("webai-generate-control");
        }
      }
    };

    restyle();
    const interval = window.setInterval(restyle, 700);
    window.setTimeout(() => window.clearInterval(interval), 8_000);
  }, []);

  return (
    <main className="relative h-screen overflow-hidden bg-[#0b0a08] text-[#f4eadc]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_22%_8%,rgba(214,165,72,0.14),transparent_28rem),radial-gradient(circle_at_88%_10%,rgba(239,68,68,0.10),transparent_30rem),linear-gradient(90deg,rgba(69,168,93,0.06),transparent_42%)]" />
      <div className="relative z-10 flex h-full flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-[#ef4444]/14 bg-[#0b0a08]/88 px-4 backdrop-blur md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/"
              aria-label={copy.back as string}
              className="flex size-9 shrink-0 items-center justify-center rounded-md border border-white/10 text-[#a79d91] transition hover:border-[#ef4444]/40 hover:text-[#f4eadc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ef4444]/70"
            >
              <ArrowLeft className="size-4" />
            </Link>
            <div className="hidden size-9 items-center justify-center rounded-md border border-[#d6a548]/30 bg-[#d6a548]/10 text-[#d6a548] sm:flex">
              <AudioLines className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="font-mono text-[0.6rem] uppercase tracking-[0.22em] text-[#d6a548]">
                MrNine / OmniVoice Studio
              </p>
              <h1 className="truncate text-lg font-black tracking-[-0.04em] text-[#f4eadc]">
                {copy.title as string}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 font-mono text-[0.58rem] uppercase tracking-[0.16em] text-[#9f968b] sm:flex">
              <span
                className={`size-1.5 rounded-full ${
                  state === "ready"
                    ? "bg-[#45a85d]"
                    : state === "setup" || state === "error"
                      ? "bg-[#ef4444]"
                      : "bg-[#d6a548]"
                }`}
              />
              {state === "ready" ? copy.online as string : state === "starting" ? copy.starting as string : copy.setup as string}
            </div>
            <div className="flex rounded-full border border-white/10 bg-white/[0.03] p-0.5 font-mono text-[0.58rem] uppercase tracking-[0.16em]">
              {languageOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  title={option.title}
                  aria-pressed={language === option.value}
                  onClick={() => setLanguage(option.value)}
                  className={`rounded-full px-2.5 py-1 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ef4444]/70 ${
                    language === option.value ? "bg-[#ef4444] text-white" : "text-[#9f968b] hover:text-[#f4eadc]"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={retry}
              className="h-9 rounded-md border-white/10 bg-white/[0.03] px-3 text-[#cfc4b8] hover:bg-white/[0.06]"
            >
              <RefreshCw className="size-4" />
              <span className="hidden sm:inline">{copy.reload as string}</span>
            </Button>
          </div>
        </header>

        <section className="relative min-h-0 flex-1">
          {state === "ready" ? (
            <iframe
              ref={iframeRef}
              title="OmniVoice Voice Studio"
              src={studioUrl}
              onLoad={injectTheme}
              className="h-full w-full border-0 bg-[#0b0a08]"
              allow="microphone; clipboard-read; clipboard-write"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-[#0b0a08]/96 p-4">
              <div className="grid w-full max-w-5xl gap-4 lg:grid-cols-[0.8fr_1.2fr]">
                <div className="rounded-lg border border-[#d6a548]/18 bg-[#11100d]/90 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
                  <div className="flex items-start gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-md border border-[#d6a548]/28 bg-[#d6a548]/10 text-[#d6a548]">
                      {state === "starting" ? (
                        <Loader2 className="size-5 animate-spin" />
                      ) : state === "setup" ? (
                        <Terminal className="size-5" />
                      ) : (
                        <TriangleAlert className="size-5 text-[#ef4444]" />
                      )}
                    </div>
                    <div>
                      <p className="font-mono text-[0.62rem] uppercase tracking-[0.22em] text-[#d6a548]">
                        {copy.runtime as string}
                      </p>
                      <h2 className="mt-2 text-xl font-black tracking-[-0.04em] text-[#fff5eb]">
                        {state === "starting"
                          ? copy.loadingLocal as string
                          : state === "setup"
                            ? copy.setupRequired as string
                            : copy.couldNotStart as string}
                      </h2>
                      <p className="mt-3 text-sm leading-6 text-[#a79d91]">{message}</p>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-2 font-mono text-[0.64rem] uppercase tracking-[0.16em] text-[#9f968b]">
                    {(copy.features as string[]).map((item) => (
                      <div key={item} className="flex items-center gap-2">
                        <CheckCircle2 className="size-3.5 text-[#45a85d]" />
                        {item}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg border border-[#ef4444]/18 bg-[#140f0d]/86 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-[0.62rem] uppercase tracking-[0.22em] text-[#ef4444]">
                        {copy.localInstall as string}
                      </p>
                      <h3 className="mt-2 text-base font-black text-[#f4eadc]">
                        {commands.length ? copy.commands as string : copy.startupLog as string}
                      </h3>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={!commands.length}
                      onClick={copyCommands}
                      className="h-9 rounded-md border-white/10 bg-white/[0.03] px-3 text-[#cfc4b8] hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      <Copy className="size-4" />
                      {copy.copy as string}
                    </Button>
                  </div>

                  {commands.length ? (
                    <pre className="mt-4 overflow-x-auto rounded-md border border-white/10 bg-[#080706] p-4 text-xs leading-6 text-[#f4eadc]">
                      <code>{commands.join("\n")}</code>
                    </pre>
                  ) : (
                    <div className="mt-4 rounded-md border border-white/10 bg-[#080706] p-4 text-sm leading-6 text-[#9f968b]">
                      OmniVoice can take a while on the first run because it loads the model and may download weights from HuggingFace.
                    </div>
                  )}

                  {runtimeLog ? (
                    <pre className="mt-4 max-h-40 overflow-auto rounded-md border border-[#d6a548]/16 bg-[#0b0a08] p-4 text-[0.68rem] leading-5 text-[#b8ada1]">
                      <code>{runtimeLog}</code>
                    </pre>
                  ) : null}
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

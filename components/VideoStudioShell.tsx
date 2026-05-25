"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Clapperboard,
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

const defaultStudioUrl = "http://127.0.0.1:8501";

const videoCopy = {
  en: {
    back: "Back to MrNine home",
    title: "Video Studio",
    online: "Online",
    starting: "Starting",
    setup: "Setup",
    reload: "Reload",
    startingMessage: "Starting Pixelle-Video Studio...",
    runtimeNotReady: "Pixelle-Video runtime is not ready.",
    failed: "Pixelle-Video Studio failed to start.",
    ready: "Pixelle-Video Studio is ready.",
    runtime: "Pixelle runtime",
    loadingLocal: "Loading local Studio",
    setupRequired: "Runtime setup required",
    couldNotStart: "Studio could not start",
    features: ["Script to video", "Image and video workflows", "Voice narration", "Streamlit UI preserved"],
    localRuntime: "Local runtime",
    commands: "Commands for this machine",
    startupLog: "Startup log",
    copy: "Copy",
  },
  vi: {
    back: "Quay lại trang chủ MrNine",
    title: "Video Studio",
    online: "Trực tuyến",
    starting: "Đang khởi động",
    setup: "Cài đặt",
    reload: "Tải lại",
    startingMessage: "Đang khởi động Pixelle-Video Studio...",
    runtimeNotReady: "Runtime Pixelle-Video chưa sẵn sàng.",
    failed: "Không thể khởi động Pixelle-Video Studio.",
    ready: "Pixelle-Video Studio đã sẵn sàng.",
    runtime: "Runtime Pixelle",
    loadingLocal: "Đang tải Studio local",
    setupRequired: "Cần cài đặt runtime",
    couldNotStart: "Không thể khởi động Studio",
    features: ["Kịch bản sang video", "Quy trình ảnh và video", "Thuyết minh giọng nói", "Giữ nguyên UI Streamlit"],
    localRuntime: "Runtime local",
    commands: "Lệnh cho máy này",
    startupLog: "Log khởi động",
    copy: "Sao chép",
  },
} satisfies Record<WebLanguage, Record<string, string | string[]>>;

export function VideoStudioShell() {
  const { language, setLanguage } = useLanguage();
  const copy = videoCopy[language];
  const [state, setState] = useState<StudioState>("starting");
  const [studioUrl, setStudioUrl] = useState(defaultStudioUrl);
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
        const response = await fetch("/api/video-studio/start", { method: "POST" });
        const data = (await response.json()) as StartResponse;

        if (data.url) {
          setStudioUrl(data.url);
        }
        if (data.log) {
          setRuntimeLog(data.log);
        }

        if (data.installed === false) {
          if (!cancelled) {
            setState("setup");
            setMessage(data.message || (copy.runtimeNotReady as string));
            setCommands(data.installCommands || []);
          }
          return;
        }

        if (!response.ok || data.ok === false) {
          throw new Error(data.message || (copy.failed as string));
        }

        poll = window.setInterval(async () => {
          const statusResponse = await fetch("/api/video-studio/start", { cache: "no-store" });
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
          if (!cancelled && status.installed === false) {
            window.clearInterval(poll);
            setState("setup");
            setMessage(status.message || (copy.runtimeNotReady as string));
            setCommands(status.installCommands || []);
          }
        }, 1_500);
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
  }, [copy.failed, copy.ready, copy.runtimeNotReady, copy.startingMessage]);

  const copyCommands = async () => {
    if (!commands.length) {
      return;
    }

    await navigator.clipboard.writeText(commands.join("\n"));
  };

  return (
    <main className="relative h-screen overflow-hidden bg-[#0b0a08] text-[#f4eadc]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_8%,rgba(69,168,93,0.14),transparent_30rem),radial-gradient(circle_at_88%_10%,rgba(239,68,68,0.12),transparent_30rem),linear-gradient(90deg,rgba(214,165,72,0.06),transparent_44%)]" />
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
            <Link
              href="/"
              aria-label="MrNine home"
              className="font-display text-xl font-black tracking-[-0.08em] text-[#f4eadc] outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#45a85d]/70 sm:text-2xl"
            >
              Mr<span className="text-[#45a85d]">Nine</span>
            </Link>
            <span aria-hidden="true" className="hidden h-6 w-px bg-white/10 sm:block" />
            <div className="flex min-w-0 items-center gap-3">
              <div className="hidden size-9 items-center justify-center rounded-md border border-[#45a85d]/30 bg-[#45a85d]/10 text-[#45a85d] sm:flex">
                <Clapperboard className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="font-mono text-[0.6rem] uppercase tracking-[0.22em] text-[#45a85d]">
                  MrNine / Pixelle-Video
                </p>
                <h1 className="truncate text-lg font-black tracking-[-0.04em] text-[#f4eadc]">
                  {copy.title as string}
                </h1>
              </div>
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
              onClick={() => window.location.reload()}
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
              title="Pixelle-Video Studio"
              src={studioUrl}
              className="h-full w-full border-0 bg-[#0b0a08]"
              allow="clipboard-read; clipboard-write"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-[#0b0a08]/96 p-4">
              <div className="grid w-full max-w-5xl gap-4 lg:grid-cols-[0.8fr_1.2fr]">
                <div className="rounded-lg border border-[#45a85d]/18 bg-[#11100d]/90 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
                  <div className="flex items-start gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-md border border-[#45a85d]/28 bg-[#45a85d]/10 text-[#45a85d]">
                      {state === "starting" ? (
                        <Loader2 className="size-5 animate-spin" />
                      ) : state === "setup" ? (
                        <Terminal className="size-5" />
                      ) : (
                        <TriangleAlert className="size-5 text-[#ef4444]" />
                      )}
                    </div>
                    <div>
                      <p className="font-mono text-[0.62rem] uppercase tracking-[0.22em] text-[#45a85d]">
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
                        {copy.localRuntime as string}
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
                      First launch can take several minutes while uv creates the Python environment and installs Pixelle-Video dependencies.
                    </div>
                  )}

                  {runtimeLog ? (
                    <pre className="mt-4 max-h-44 overflow-auto rounded-md border border-[#45a85d]/16 bg-[#0b0a08] p-4 text-[0.68rem] leading-5 text-[#b8ada1]">
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

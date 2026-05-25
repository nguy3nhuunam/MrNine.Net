"use client";

import { useEffect, useRef, useState } from "react";
import { AudioLines, Square } from "lucide-react";
import { cn } from "@/lib/utils";

type VisualizerState = "idle" | "starting" | "active" | "error";

const BAR_COUNT = 24;

export function TabAudioVisualizer() {
  const [state, setState] = useState<VisualizerState>("idle");
  const [error, setError] = useState("");
  const [bars, setBars] = useState<number[]>(() => new Array(BAR_COUNT).fill(0.05));

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => () => stop(), []);

  function stop() {
    if (rafRef.current !== null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    sourceRef.current?.disconnect();
    sourceRef.current = null;
    analyserRef.current?.disconnect();
    analyserRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
      void audioCtxRef.current.close();
    }
    audioCtxRef.current = null;
    setBars(new Array(BAR_COUNT).fill(0.05));
    setState("idle");
  }

  async function start() {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getDisplayMedia) {
      setError("Trình duyệt không hỗ trợ chia sẻ audio tab.");
      setState("error");
      return;
    }
    setError("");
    setState("starting");

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        audio: { suppressLocalAudioPlayback: false } as MediaTrackConstraints,
        video: { width: 1, height: 1, frameRate: 1 } as MediaTrackConstraints,
      });
      const audioTracks = stream.getAudioTracks();
      stream.getVideoTracks().forEach((track) => track.stop());
      if (audioTracks.length === 0) {
        stream.getTracks().forEach((track) => track.stop());
        setError("Tab này không chia sẻ audio. Hãy tick 'Share tab audio'.");
        setState("error");
        return;
      }

      audioTracks[0].addEventListener("ended", () => stop());

      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const source = ctx.createMediaStreamSource(new MediaStream(audioTracks));
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.78;
      source.connect(analyser);

      audioCtxRef.current = ctx;
      sourceRef.current = source;
      analyserRef.current = analyser;
      streamRef.current = stream;

      const buffer = new Uint8Array(analyser.frequencyBinCount);

      const tick = () => {
        const a = analyserRef.current;
        if (!a) return;
        a.getByteFrequencyData(buffer);
        const step = Math.floor(buffer.length / BAR_COUNT);
        const next: number[] = [];
        for (let i = 0; i < BAR_COUNT; i += 1) {
          let sum = 0;
          for (let j = 0; j < step; j += 1) {
            sum += buffer[i * step + j];
          }
          const avg = sum / step;
          next.push(Math.max(0.05, Math.min(1, avg / 255)));
        }
        setBars(next);
        rafRef.current = window.requestAnimationFrame(tick);
      };
      rafRef.current = window.requestAnimationFrame(tick);
      setState("active");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Không thể bắt đầu chia sẻ audio.";
      if (!/permission|denied|NotAllowed/i.test(message)) {
        setError(message);
        setState("error");
      } else {
        setState("idle");
      }
    }
  }

  if (state === "idle" || state === "error" || state === "starting") {
    return (
      <button
        type="button"
        onClick={start}
        disabled={state === "starting"}
        title="Chia sẻ tab có nhạc — vẽ sóng theo audio của tab đó"
        className="flex h-9 items-center gap-2 rounded-full border border-[#1db954]/35 bg-[#071109]/82 px-3 font-mono text-[0.58rem] uppercase tracking-[0.14em] text-[#cfeed6] transition hover:border-[#1db954]/65 hover:bg-[#0a1a0d] hover:text-[#dff8e4] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <AudioLines className="size-3.5 text-[#1db954]" />
        <span className="hidden md:flex md:flex-col md:leading-tight md:text-left">
          <span className="text-[0.58rem] font-bold normal-case tracking-normal text-[#dff8e4]">
            {state === "starting" ? "Đang yêu cầu..." : "Trực quan hoá"}
          </span>
          <span className="text-[0.46rem] normal-case tracking-normal text-[#7da38a]">
            {state === "error" && error ? error : "audio của tab"}
          </span>
        </span>
      </button>
    );
  }

  return (
    <div
      title="Audio tab đang phát — bấm Stop để dừng"
      className="flex h-9 max-w-[16rem] items-center gap-2 rounded-full border border-[#1db954]/45 bg-[#071109]/88 px-3 font-mono text-[0.58rem] uppercase tracking-[0.14em] text-[#dff8e4] shadow-[0_0_22px_rgba(29,185,84,0.18)]"
    >
      <button
        type="button"
        onClick={stop}
        aria-label="Dừng trực quan hoá audio"
        className="flex size-6 shrink-0 items-center justify-center rounded-full border border-[#1db954]/45 bg-[#0a1a0d] text-[#1db954] transition hover:bg-[#0e1f12]"
      >
        <Square className="size-3" />
      </button>
      <div className="flex h-7 flex-1 items-end gap-[2px]">
        {bars.map((value, idx) => (
          <span
            key={idx}
            className={cn(
              "block w-[3px] rounded-sm bg-gradient-to-t from-[#0e8a3f] to-[#22d29a]",
              value < 0.08 && "opacity-50",
            )}
            style={{ height: `${Math.max(8, value * 100)}%` }}
          />
        ))}
      </div>
      <span className="hidden font-bold normal-case tracking-normal text-[#9bd1a8] md:inline">LIVE</span>
    </div>
  );
}
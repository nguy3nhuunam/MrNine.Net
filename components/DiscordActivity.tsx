"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Gamepad2, Headphones, Music2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Activity = {
  id: string;
  name: string;
  type: number;
  state?: string;
  details?: string;
  application_id?: string;
  timestamps?: { start?: number; end?: number };
  assets?: {
    large_image?: string;
    large_text?: string;
    small_image?: string;
    small_text?: string;
  };
  sync_id?: string;
};

type Spotify = {
  track_id: string;
  song: string;
  artist: string;
  album: string;
  album_art_url: string;
  timestamps: { start: number; end: number };
};

type LanyardData = {
  discord_user: { id: string; username: string; avatar: string | null; global_name?: string };
  discord_status: "online" | "idle" | "dnd" | "offline";
  activities: Activity[];
  listening_to_spotify: boolean;
  spotify: Spotify | null;
};

type LanyardEvent = {
  op: number;
  t?: string;
  d?: unknown;
};

const STATUS_COLOR: Record<LanyardData["discord_status"], string> = {
  online: "#22c55e",
  idle: "#eab308",
  dnd: "#ef4444",
  offline: "#6b7280",
};

function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
}

function discordCdnAsset(activity: Activity, image: string): string {
  if (image.startsWith("mp:external/")) {
    const rest = image.slice("mp:external/".length);
    return `https://media.discordapp.net/external/${rest}`;
  }
  if (image.startsWith("spotify:")) {
    return `https://i.scdn.co/image/${image.slice("spotify:".length)}`;
  }
  if (activity.application_id) {
    return `https://cdn.discordapp.com/app-assets/${activity.application_id}/${image}.png`;
  }
  return image;
}

export function DiscordActivity({ userId }: Readonly<{ userId: string }>) {
  const [data, setData] = useState<LanyardData | null>(null);
  const [now, setNow] = useState<number>(() => Date.now());
  const wsRef = useRef<WebSocket | null>(null);
  const heartbeatRef = useRef<number | null>(null);
  const reconnectRef = useRef<number | null>(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    function clearHeartbeat() {
      if (heartbeatRef.current !== null) {
        window.clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
    }

    function clearReconnect() {
      if (reconnectRef.current !== null) {
        window.clearTimeout(reconnectRef.current);
        reconnectRef.current = null;
      }
    }

    function scheduleReconnect() {
      clearReconnect();
      if (cancelled) return;
      reconnectRef.current = window.setTimeout(() => {
        connect();
      }, 4000);
    }

    function connect() {
      if (cancelled) return;
      try {
        const ws = new WebSocket("wss://api.lanyard.rest/socket");
        wsRef.current = ws;

        ws.addEventListener("open", () => {
          // wait for HELLO
        });

        ws.addEventListener("message", (event) => {
          let msg: LanyardEvent;
          try {
            msg = JSON.parse(event.data) as LanyardEvent;
          } catch {
            return;
          }

          if (msg.op === 1 && msg.d) {
            const helloDelay = (msg.d as { heartbeat_interval?: number }).heartbeat_interval ?? 30000;
            ws.send(
              JSON.stringify({
                op: 2,
                d: { subscribe_to_id: userId },
              }),
            );
            clearHeartbeat();
            heartbeatRef.current = window.setInterval(() => {
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ op: 3 }));
              }
            }, helloDelay);
          } else if (msg.op === 0) {
            if (msg.t === "INIT_STATE" || msg.t === "PRESENCE_UPDATE") {
              const payload = msg.d as LanyardData | { [k: string]: LanyardData };
              const state = (payload && typeof payload === "object" && "discord_user" in payload)
                ? (payload as LanyardData)
                : null;
              if (state) setData(state);
            }
          }
        });

        ws.addEventListener("close", () => {
          clearHeartbeat();
          scheduleReconnect();
        });

        ws.addEventListener("error", () => {
          try {
            ws.close();
          } catch {
            // ignore
          }
        });
      } catch {
        scheduleReconnect();
      }
    }

    connect();

    return () => {
      cancelled = true;
      clearHeartbeat();
      clearReconnect();
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch {
          // ignore
        }
        wsRef.current = null;
      }
    };
  }, [userId]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  if (!data) {
    return (
      <div
        className="flex h-9 items-center gap-2 rounded-full border border-white/10 bg-[#0b0a08]/72 px-3 font-mono text-[0.58rem] uppercase tracking-[0.18em] text-[#9a9087]"
        title="Loading Discord presence"
      >
        <span className="size-1.5 animate-pulse rounded-full bg-[#9a9087]" />
        Discord …
      </div>
    );
  }

  const status = data.discord_status;
  const dot = STATUS_COLOR[status];

  if (data.listening_to_spotify && data.spotify) {
    const sp = data.spotify;
    const elapsed = Math.max(0, Math.min(now - sp.timestamps.start, sp.timestamps.end - sp.timestamps.start));
    const total = Math.max(1, sp.timestamps.end - sp.timestamps.start);
    const pct = Math.min(100, Math.max(0, (elapsed / total) * 100));
    const trackUrl = `https://open.spotify.com/track/${sp.track_id}`;

    return (
      <a
        href={trackUrl}
        target="_blank"
        rel="noreferrer"
        title={`Spotify · ${sp.song} — ${sp.artist}`}
        className="group relative flex h-9 max-w-[18rem] items-center gap-2.5 overflow-hidden rounded-full border border-[#1db954]/40 bg-[#071109]/82 pl-1 pr-3 font-mono text-[0.58rem] uppercase tracking-[0.14em] text-[#dff8e4] shadow-[0_0_22px_rgba(29,185,84,0.18)] transition hover:border-[#1db954]/70"
      >
        <span
          className="pointer-events-none absolute inset-y-0 left-0 z-0 bg-[#1db954]/22 transition-[width] duration-1000 ease-linear"
          style={{ width: `${pct}%` }}
          aria-hidden="true"
        />
        <span className="relative z-10 flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-[#0b1a0d]">
          {sp.album_art_url ? (
            <Image
              src={sp.album_art_url}
              alt=""
              width={28}
              height={28}
              className="size-full object-cover"
              unoptimized
            />
          ) : (
            <Music2 className="size-3.5 text-[#1db954]" />
          )}
        </span>
        <span className="relative z-10 flex flex-col leading-tight">
          <span className="truncate text-[0.62rem] font-bold normal-case tracking-normal text-[#f4fff6]">
            {sp.song}
          </span>
          <span className="truncate text-[0.5rem] normal-case tracking-normal text-[#9bd1a8]">
            {sp.artist}
          </span>
        </span>
        <span className="relative z-10 flex items-end gap-[2px]" aria-hidden="true">
          <span className="block w-[2px] animate-[discordWave_900ms_ease-in-out_infinite] rounded-sm bg-[#1db954]" style={{ animationDelay: "0ms", height: 6 }} />
          <span className="block w-[2px] animate-[discordWave_900ms_ease-in-out_infinite] rounded-sm bg-[#1db954]" style={{ animationDelay: "120ms", height: 9 }} />
          <span className="block w-[2px] animate-[discordWave_900ms_ease-in-out_infinite] rounded-sm bg-[#1db954]" style={{ animationDelay: "240ms", height: 12 }} />
          <span className="block w-[2px] animate-[discordWave_900ms_ease-in-out_infinite] rounded-sm bg-[#1db954]" style={{ animationDelay: "360ms", height: 7 }} />
        </span>
      </a>
    );
  }

  const game = data.activities.find((a) => a.type === 0);
  if (game) {
    const elapsedMs = game.timestamps?.start ? now - game.timestamps.start : 0;
    const largeImg = game.assets?.large_image ? discordCdnAsset(game, game.assets.large_image) : null;
    return (
      <div
        title={`${game.name}${game.details ? ` · ${game.details}` : ""}${game.state ? ` · ${game.state}` : ""}`}
        className="flex h-9 max-w-[18rem] items-center gap-2.5 rounded-full border border-[#bfa1ff]/35 bg-[#120a26]/78 pl-1 pr-3 font-mono text-[0.58rem] uppercase tracking-[0.14em] text-[#e3d6ff]"
      >
        <span className="flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-[#1a0e36]">
          {largeImg ? (
            <Image src={largeImg} alt="" width={28} height={28} className="size-full object-cover" unoptimized />
          ) : (
            <Gamepad2 className="size-3.5 text-[#bfa1ff]" />
          )}
        </span>
        <span className="flex min-w-0 flex-col leading-tight">
          <span className="truncate text-[0.62rem] font-bold normal-case tracking-normal text-[#f3eaff]">
            {game.name}
          </span>
          <span className="truncate text-[0.5rem] normal-case tracking-normal text-[#a98fe6]">
            {game.details || game.state || (elapsedMs > 0 ? formatElapsed(elapsedMs) : "playing")}
          </span>
        </span>
      </div>
    );
  }

  const custom = data.activities.find((a) => a.type === 4);
  const username = data.discord_user.global_name || data.discord_user.username;

  return (
    <div
      title={`${username} · ${status}${custom?.state ? ` · ${custom.state}` : ""}`}
      className={cn(
        "flex h-9 items-center gap-2 rounded-full border bg-[#0b0a08]/82 px-3 font-mono text-[0.58rem] uppercase tracking-[0.14em]",
        status === "offline"
          ? "border-white/10 text-[#6f675e]"
          : "border-white/12 text-[#cfc4b8]",
      )}
    >
      <span
        className={cn("size-2 rounded-full", status !== "offline" && "shadow-[0_0_8px_currentColor]")}
        style={{ backgroundColor: dot, color: dot }}
      />
      <Headphones className="size-3.5 opacity-70" />
      <span className="flex flex-col leading-tight">
        <span className="text-[0.6rem] font-bold normal-case tracking-normal text-[#efe6dc]">
          {username}
        </span>
        <span className="truncate text-[0.5rem] normal-case tracking-normal text-[#9a9087]">
          {custom?.state ? custom.state : status === "offline" ? "offline" : status}
        </span>
      </span>
    </div>
  );
}

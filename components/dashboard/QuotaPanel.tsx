"use client";

import { useEffect, useState } from "react";

type KeyState = {
  id: string;
  name: string;
  prefix: string;
  status: string;
  rpm: { limit: number; remaining: number };
  tpm: { limit: number; remaining: number };
  daily_tokens_limit: number;
};

export function QuotaPanel() {
  const [keys, setKeys] = useState<KeyState[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let stop = false;
    async function load() {
      try {
        const res = await fetch("/api/quota", { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body = (await res.json()) as { keys: KeyState[] };
        if (!stop) setKeys(body.keys);
      } catch (e: unknown) {
        if (!stop) setErr(e instanceof Error ? e.message : String(e));
      }
    }
    load();
    const id = setInterval(load, 5000);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, []);

  if (err) return <p className="font-mono text-xs text-[#ef4444]">Lỗi: {err}</p>;
  if (!keys) return <p className="font-mono text-xs text-[#5d544a]">Đang tải...</p>;
  if (keys.length === 0) {
    return <p className="font-mono text-xs text-[#5d544a]">Chưa có key.</p>;
  }

  return (
    <div className="space-y-3">
      {keys.map((k) => (
        <div key={k.id} className="space-y-2 rounded-lg border border-white/8 bg-[#0c0a08] p-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-medium">{k.name}</span>
              <span className="ml-2 font-mono text-[0.65rem] text-[#5d544a]">{k.prefix}</span>
            </div>
            <span
              className={
                "rounded-full px-2 py-0.5 font-mono text-[0.55rem] uppercase tracking-[0.16em] " +
                (k.status === "active"
                  ? "bg-[#45a85d]/15 text-[#dff8e4]"
                  : "bg-white/5 text-[#9a9087]")
              }
            >
              {k.status}
            </span>
          </div>
          <Bar label="RPM" remaining={k.rpm.remaining} limit={k.rpm.limit} />
          <Bar label="TPM" remaining={k.tpm.remaining} limit={k.tpm.limit} />
        </div>
      ))}
      <p className="text-center font-mono text-[0.6rem] text-[#5d544a]">
        Auto-refresh 5s · token bucket reload đầy mỗi phút
      </p>
    </div>
  );
}

function Bar({ label, remaining, limit }: { label: string; remaining: number; limit: number }) {
  const pct = limit === 0 ? 0 : Math.min(100, (remaining / limit) * 100);
  const color =
    pct < 10 ? "bg-[#ef4444]" : pct < 30 ? "bg-[#d6a548]" : "bg-gradient-to-r from-[#45a85d] to-[#4f8ef7]";
  return (
    <div className="space-y-1">
      <div className="flex justify-between font-mono text-[0.65rem] uppercase tracking-[0.16em]">
        <span className="text-[#9a9087]">{label}</span>
        <span className="text-[#dff8e4]">
          {remaining.toLocaleString("vi-VN")} / {limit.toLocaleString("vi-VN")}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

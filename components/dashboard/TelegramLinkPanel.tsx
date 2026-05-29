"use client";

import { useState } from "react";

export function TelegramLinkPanel({ linked }: { linked: boolean }) {
  const [busy, setBusy] = useState(false);
  const [deeplink, setDeeplink] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function onGenerate() {
    setBusy(true);
    setErr(null);
    const res = await fetch("/api/settings/telegram-link", { method: "POST" });
    setBusy(false);
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErr(body.error ?? `HTTP ${res.status}`);
      return;
    }
    setDeeplink(body.deeplink);
    setToken(body.token);
  }

  if (linked) {
    return (
      <p className="font-mono text-xs text-[#dff8e4]">
        ✅ Đã liên kết Telegram. Gõ <code className="text-[#dff8e4]">/balance</code> hoặc <code className="text-[#dff8e4]">/usage</code> trên bot.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={onGenerate}
        disabled={busy}
        className="rounded-md border border-[#4f8ef7]/40 bg-[#4f8ef7]/15 px-4 py-2 font-mono text-xs uppercase tracking-wider text-[#dff8e4] disabled:opacity-50"
      >
        {busy ? "..." : "Tạo deeplink Telegram"}
      </button>
      {deeplink ? (
        <div className="space-y-2">
          <a
            href={deeplink}
            target="_blank"
            rel="noopener noreferrer"
            className="block break-all rounded-md border border-[#45a85d]/30 bg-[#45a85d]/5 px-3 py-2 font-mono text-xs text-[#dff8e4]"
          >
            {deeplink}
          </a>
          <p className="font-mono text-[0.65rem] text-[#5d544a]">
            Click link → Telegram mở bot → bấm Start. Token{" "}
            <code className="text-[#9a9087]">{token?.slice(0, 12)}…</code> hết hạn sau 10 phút.
          </p>
        </div>
      ) : null}
      {err ? <p className="font-mono text-xs text-[#ef4444]">{err}</p> : null}
    </div>
  );
}

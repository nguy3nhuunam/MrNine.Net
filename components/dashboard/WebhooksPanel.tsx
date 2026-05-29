"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const EVENTS = ["topup_completed", "balance_low", "coupon_redeemed", "refund_issued"] as const;

type Hook = {
  id: string;
  url: string;
  secretMasked: string;
  events: string[];
  enabled: boolean;
  lastFiredAt: string | null;
  lastStatus: number | null;
  lastError: string | null;
  createdAt: string | null;
};

export function WebhooksPanel({ initial }: { initial: Hook[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [picked, setPicked] = useState<string[]>(["topup_completed", "balance_low"]);

  function toggleEvent(e: string) {
    setPicked((cur) => (cur.includes(e) ? cur.filter((x) => x !== e) : [...cur, e]));
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    setCreatedSecret(null);
    const res = await fetch("/api/webhooks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, events: picked }),
    });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setErr(body.error ?? `HTTP ${res.status}`);
      return;
    }
    setCreatedSecret(body.webhook?.secret ?? null);
    setUrl("");
    startTransition(() => router.refresh());
  }

  async function onDelete(id: string) {
    if (!confirm("Xoá webhook này?")) return;
    const res = await fetch(`/api/webhooks?id=${id}`, { method: "DELETE" });
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      alert(b.error ?? `HTTP ${res.status}`);
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Webhooks</h1>
          <p className="mt-1 text-sm text-[#9a9087]">
            POST sự kiện vào URL của bạn. Header <code className="text-[#dff8e4]">X-MrNine-Signature: t=&lt;ts&gt;,v1=&lt;hex&gt;</code>{" "}
            với <code className="text-[#dff8e4]">v1 = HMAC_SHA256(secret, &quot;t.body&quot;)</code>.
          </p>
        </div>
        <Link
          href="/dashboard/webhooks/deliveries"
          className="rounded-md border border-white/10 px-3 py-2 font-mono text-xs uppercase tracking-wider text-[#9a9087] hover:border-white/30"
        >
          Deliveries log →
        </Link>
      </div>

      {createdSecret ? (
        <div className="rounded-xl border border-[#45a85d]/30 bg-[#45a85d]/5 p-4">
          <p className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-[#dff8e4]">
            Secret mới — sao chép ngay, sau đó hệ thống chỉ hiển thị tiền tố
          </p>
          <code className="mt-2 block break-all rounded bg-[#0c0a08] px-3 py-2 text-sm text-[#f4eadc]">
            {createdSecret}
          </code>
        </div>
      ) : null}

      <form onSubmit={onCreate} className="space-y-3 rounded-xl border border-white/8 bg-[#0c0a08] p-4">
        <label className="block">
          <span className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-[#9a9087]">URL nhận POST</span>
          <input
            required
            type="url"
            placeholder="https://example.com/mrnine-hook"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="mt-1 block w-full rounded-md border border-[#2a251f] bg-[#090807] px-3 py-2 text-sm text-[#f4eadc] outline-none focus:border-[#ef4444]/60"
          />
        </label>
        <div>
          <span className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-[#9a9087]">Events</span>
          <div className="mt-2 flex flex-wrap gap-2">
            {EVENTS.map((ev) => (
              <label
                key={ev}
                className={
                  "flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 font-mono text-xs " +
                  (picked.includes(ev)
                    ? "border-[#45a85d]/40 bg-[#45a85d]/10 text-[#dff8e4]"
                    : "border-white/10 text-[#9a9087]")
                }
              >
                <input
                  type="checkbox"
                  checked={picked.includes(ev)}
                  onChange={() => toggleEvent(ev)}
                  className="hidden"
                />
                {ev}
              </label>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between">
          {err ? <span className="font-mono text-xs text-[#ef4444]">{err}</span> : <span />}
          <button
            type="submit"
            disabled={busy || pending || picked.length === 0}
            className="rounded-md border border-[#45a85d]/40 bg-[#45a85d]/15 px-4 py-2 font-mono text-xs uppercase tracking-wider text-[#dff8e4] disabled:opacity-50"
          >
            {busy ? "..." : "Tạo webhook"}
          </button>
        </div>
      </form>

      <div className="overflow-hidden rounded-xl border border-white/8">
        <table className="w-full text-sm">
          <thead className="bg-[#120c09] text-[0.65rem] uppercase tracking-[0.16em] text-[#5d544a]">
            <tr>
              <th className="px-3 py-2 text-left">URL</th>
              <th className="px-3 py-2 text-left">Events</th>
              <th className="px-3 py-2 text-left">Secret</th>
              <th className="px-3 py-2 text-left">Last fired</th>
              <th className="px-3 py-2 text-right"></th>
            </tr>
          </thead>
          <tbody>
            {initial.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-[#5d544a]">
                  Chưa có webhook.
                </td>
              </tr>
            ) : (
              initial.map((h) => (
                <tr key={h.id} className="border-t border-white/5">
                  <td className="px-3 py-2 font-mono text-[0.78rem] text-[#dff8e4]">{h.url}</td>
                  <td className="px-3 py-2 font-mono text-[0.7rem] text-[#9a9087]">
                    {h.events.join(", ")}
                  </td>
                  <td className="px-3 py-2 font-mono text-[0.7rem] text-[#9a9087]">{h.secretMasked}</td>
                  <td className="px-3 py-2 font-mono text-[0.7rem] text-[#9a9087]">
                    {h.lastFiredAt
                      ? `${new Date(h.lastFiredAt).toLocaleString("vi-VN")} · ${h.lastStatus ?? "?"}`
                      : "—"}
                    {h.lastError ? (
                      <div className="text-[0.6rem] text-[#ef4444]">{h.lastError.slice(0, 80)}</div>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => onDelete(h.id)}
                      className="rounded-md border border-[#ef4444]/40 bg-[#ef4444]/10 px-2 py-1 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-[#ef4444]"
                    >
                      Xoá
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

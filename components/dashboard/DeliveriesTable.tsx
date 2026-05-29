"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Row = {
  id: number;
  webhookId: string;
  url: string;
  event: string;
  status: "pending" | "succeeded" | "failed";
  attempts: number;
  nextRetryAt: string | null;
  lastStatus: number | null;
  lastError: string | null;
  createdAt: string | null;
  completedAt: string | null;
};

export function DeliveriesTable({ initial }: { initial: Row[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<number | null>(null);

  async function onRetry(id: number) {
    setBusy(id);
    const res = await fetch(`/api/webhooks/deliveries/${id}/retry`, { method: "POST" });
    setBusy(null);
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
          <h1 className="text-2xl font-semibold">Deliveries</h1>
          <p className="mt-1 text-sm text-[#9a9087]">
            200 deliveries gần nhất. Retry exponential 30s/2min/10min, max 3 attempts.
          </p>
        </div>
        <Link
          href="/dashboard/webhooks"
          className="rounded-md border border-white/10 px-3 py-2 font-mono text-xs uppercase tracking-wider text-[#9a9087] hover:border-white/30"
        >
          ← Webhooks
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-white/8">
        <table className="w-full text-sm">
          <thead className="bg-[#120c09] text-[0.65rem] uppercase tracking-[0.16em] text-[#5d544a]">
            <tr>
              <th className="px-3 py-2 text-left">Tạo</th>
              <th className="px-3 py-2 text-left">Event</th>
              <th className="px-3 py-2 text-left">URL</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-right">Attempts</th>
              <th className="px-3 py-2 text-left">Last result</th>
              <th className="px-3 py-2 text-right"></th>
            </tr>
          </thead>
          <tbody>
            {initial.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-[#5d544a]">
                  Chưa có delivery nào.
                </td>
              </tr>
            ) : (
              initial.map((r) => (
                <tr key={r.id} className="border-t border-white/5">
                  <td className="px-3 py-2 font-mono text-[0.7rem] text-[#9a9087]">
                    {r.createdAt ? new Date(r.createdAt).toLocaleString("vi-VN") : "—"}
                  </td>
                  <td className="px-3 py-2 font-mono text-[0.78rem] text-[#dff8e4]">{r.event}</td>
                  <td className="px-3 py-2 font-mono text-[0.7rem] text-[#9a9087] max-w-[240px] truncate" title={r.url}>
                    {r.url}
                  </td>
                  <td className="px-3 py-2">
                    <StatusPill status={r.status} />
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-[0.78rem]">{r.attempts}/3</td>
                  <td className="px-3 py-2 font-mono text-[0.7rem] text-[#9a9087]">
                    {r.lastStatus !== null ? <span>HTTP {r.lastStatus}</span> : "—"}
                    {r.lastError ? (
                      <div className="text-[0.6rem] text-[#ef4444]">{r.lastError.slice(0, 80)}</div>
                    ) : null}
                    {r.status === "pending" && r.nextRetryAt ? (
                      <div className="text-[0.6rem] text-[#d6a548]">
                        Retry: {new Date(r.nextRetryAt).toLocaleString("vi-VN")}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {r.status === "failed" ? (
                      <button
                        type="button"
                        onClick={() => onRetry(r.id)}
                        disabled={busy === r.id || pending}
                        className="rounded-md border border-[#d6a548]/40 bg-[#d6a548]/10 px-2 py-1 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-[#d6a548] disabled:opacity-50"
                      >
                        {busy === r.id ? "..." : "Retry"}
                      </button>
                    ) : null}
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

function StatusPill({ status }: { status: Row["status"] }) {
  const styles: Record<string, string> = {
    pending: "bg-[#d6a548]/15 text-[#d6a548]",
    succeeded: "bg-[#45a85d]/15 text-[#dff8e4]",
    failed: "bg-[#ef4444]/15 text-[#ef4444]",
  };
  return (
    <span
      className={`rounded-full px-2 py-0.5 font-mono text-[0.6rem] uppercase tracking-[0.16em] ${styles[status]}`}
    >
      {status}
    </span>
  );
}

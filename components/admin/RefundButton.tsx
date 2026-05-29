"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function RefundButton({ id, providerRef }: { id: string; providerRef: string | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  async function onClick() {
    setErr(null);
    if (!confirm(`Hoàn tiền giao dịch ${providerRef ?? id}?`)) return;
    const res = await fetch(`/api/admin/transactions/${id}/refund`, { method: "POST" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErr(body.error ?? `HTTP ${res.status}`);
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="rounded-md border border-[#ef4444]/40 bg-[#ef4444]/10 px-2 py-1 font-mono text-[0.65rem] uppercase tracking-[0.16em] text-[#ef4444] transition hover:bg-[#ef4444]/20 disabled:opacity-50"
      >
        {pending ? "..." : "Refund"}
      </button>
      {err ? <span className="font-mono text-[0.6rem] text-[#ef4444]">{err}</span> : null}
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function CouponRedeemPanel() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setBusy(true);
    const res = await fetch("/api/coupons/redeem", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      const map: Record<string, string> = {
        invalid_or_expired: "Mã không hợp lệ hoặc đã hết hạn.",
        exhausted: "Mã đã hết lượt sử dụng.",
        already_redeemed: "Bạn đã dùng mã này rồi.",
      };
      setMsg({ kind: "err", text: map[body.error] ?? body.error ?? `HTTP ${res.status}` });
      return;
    }
    setMsg({
      kind: "ok",
      text: `+$${(body.credited_micro_usd / 1_000_000).toFixed(4)} → số dư mới $${(body.new_balance_micro_usd / 1_000_000).toFixed(4)}`,
    });
    setCode("");
    startTransition(() => router.refresh());
  }

  return (
    <section className="rounded-xl border border-white/8 bg-[#0c0a08] p-4">
      <h2 className="text-sm font-mono uppercase tracking-[0.2em] text-[#9a9087]">Nhập mã coupon</h2>
      <form onSubmit={onSubmit} className="mt-3 flex gap-2">
        <input
          required
          placeholder="VD: WELCOME"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          className="flex-1 rounded-md border border-white/8 bg-[#120c09] px-3 py-2 font-mono text-sm uppercase tracking-wider"
        />
        <button
          type="submit"
          disabled={busy || pending}
          className="rounded-md border border-[#45a85d]/40 bg-[#45a85d]/15 px-4 py-2 font-mono text-xs uppercase tracking-wider text-[#dff8e4] disabled:opacity-50"
        >
          {busy ? "..." : "Áp dụng"}
        </button>
      </form>
      {msg ? (
        <p
          className={`mt-2 font-mono text-xs ${
            msg.kind === "ok" ? "text-[#dff8e4]" : "text-[#ef4444]"
          }`}
        >
          {msg.text}
        </p>
      ) : null}
    </section>
  );
}

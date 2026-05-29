"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Coupon = {
  id: string;
  code: string;
  kind: "fixed_micro_usd" | "fixed_vnd";
  valueMicroUsd: number;
  maxRedemptions: number;
  redeemedCount: number;
  expiresAt: string | null;
  note: string | null;
  createdAt: string | null;
};

export function CouponAdmin({ initial }: { initial: Coupon[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState({
    code: "",
    kind: "fixed_micro_usd" as "fixed_micro_usd" | "fixed_vnd",
    value: "1",
    maxRedemptions: "1",
    expiresAt: "",
    note: "",
  });

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    const res = await fetch("/api/admin/coupons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: form.code,
        kind: form.kind,
        value: Number(form.value),
        maxRedemptions: Number(form.maxRedemptions),
        expiresAt: form.expiresAt || null,
        note: form.note || null,
      }),
    });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setErr(body.error ?? `HTTP ${res.status}`);
      return;
    }
    setForm({ ...form, code: "", note: "" });
    startTransition(() => router.refresh());
  }

  async function onDelete(id: string) {
    if (!confirm("Xoá coupon này?")) return;
    const res = await fetch(`/api/admin/coupons?id=${id}`, { method: "DELETE" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(body.error ?? `HTTP ${res.status}`);
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={onCreate}
        className="grid grid-cols-2 gap-3 rounded-xl border border-white/8 bg-[#0c0a08] p-4 md:grid-cols-6"
      >
        <input
          required
          placeholder="CODE"
          value={form.code}
          onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
          className="col-span-2 rounded-md border border-white/8 bg-[#120c09] px-3 py-2 font-mono text-sm uppercase tracking-wider"
        />
        <select
          value={form.kind}
          onChange={(e) => setForm({ ...form, kind: e.target.value as "fixed_micro_usd" | "fixed_vnd" })}
          className="rounded-md border border-white/8 bg-[#120c09] px-3 py-2 text-sm"
        >
          <option value="fixed_micro_usd">USD</option>
          <option value="fixed_vnd">VND</option>
        </select>
        <input
          required
          type="number"
          min="0.0001"
          step="0.0001"
          placeholder="value"
          value={form.value}
          onChange={(e) => setForm({ ...form, value: e.target.value })}
          className="rounded-md border border-white/8 bg-[#120c09] px-3 py-2 text-sm"
        />
        <input
          type="number"
          min="1"
          step="1"
          placeholder="max"
          value={form.maxRedemptions}
          onChange={(e) => setForm({ ...form, maxRedemptions: e.target.value })}
          className="rounded-md border border-white/8 bg-[#120c09] px-3 py-2 text-sm"
        />
        <input
          type="datetime-local"
          value={form.expiresAt}
          onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
          className="rounded-md border border-white/8 bg-[#120c09] px-3 py-2 text-sm"
        />
        <input
          placeholder="ghi chú"
          value={form.note}
          onChange={(e) => setForm({ ...form, note: e.target.value })}
          className="col-span-5 rounded-md border border-white/8 bg-[#120c09] px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={busy || pending}
          className="rounded-md border border-[#45a85d]/40 bg-[#45a85d]/15 px-3 py-2 font-mono text-xs uppercase tracking-wider text-[#dff8e4] disabled:opacity-50"
        >
          {busy ? "..." : "Tạo"}
        </button>
        {err ? <p className="col-span-6 font-mono text-xs text-[#ef4444]">{err}</p> : null}
      </form>

      <div className="overflow-hidden rounded-xl border border-white/8">
        <table className="w-full text-sm">
          <thead className="bg-[#120c09] text-[0.65rem] uppercase tracking-[0.16em] text-[#5d544a]">
            <tr>
              <th className="px-3 py-2 text-left">Code</th>
              <th className="px-3 py-2 text-left">Loại</th>
              <th className="px-3 py-2 text-right">Giá trị</th>
              <th className="px-3 py-2 text-right">Đã/Tối đa</th>
              <th className="px-3 py-2 text-left">Hết hạn</th>
              <th className="px-3 py-2 text-left">Ghi chú</th>
              <th className="px-3 py-2 text-right"></th>
            </tr>
          </thead>
          <tbody>
            {initial.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-[#5d544a]">
                  Chưa có coupon.
                </td>
              </tr>
            ) : (
              initial.map((c) => (
                <tr key={c.id} className="border-t border-white/5">
                  <td className="px-3 py-2 font-mono text-[#dff8e4]">{c.code}</td>
                  <td className="px-3 py-2 font-mono text-[0.7rem] text-[#9a9087]">{c.kind}</td>
                  <td className="px-3 py-2 text-right">
                    {c.kind === "fixed_micro_usd"
                      ? `$${(c.valueMicroUsd / 1_000_000).toFixed(4)}`
                      : `${c.valueMicroUsd.toLocaleString("vi-VN")}đ`}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {c.redeemedCount}/{c.maxRedemptions}
                  </td>
                  <td className="px-3 py-2 text-[#9a9087]">
                    {c.expiresAt ? new Date(c.expiresAt).toLocaleString("vi-VN") : "—"}
                  </td>
                  <td className="px-3 py-2 text-[#9a9087]">{c.note ?? "—"}</td>
                  <td className="px-3 py-2 text-right">
                    {c.redeemedCount === 0 ? (
                      <button
                        type="button"
                        onClick={() => onDelete(c.id)}
                        className="rounded-md border border-[#ef4444]/40 bg-[#ef4444]/10 px-2 py-1 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-[#ef4444]"
                      >
                        Xoá
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

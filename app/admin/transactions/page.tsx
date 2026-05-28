import { desc, eq } from "drizzle-orm";

import { db } from "@/lib/pg/db";
import { transactions, users } from "@/lib/pg/schema";

export const metadata = { title: "Giao dịch · Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function TransactionsAdminPage() {
  const rows = await db
    .select({
      id: transactions.id,
      providerRef: transactions.providerRef,
      provider: transactions.provider,
      amountVnd: transactions.amountVnd,
      amountMicroUsd: transactions.amountMicroUsd,
      status: transactions.status,
      createdAt: transactions.createdAt,
      completedAt: transactions.completedAt,
      email: users.email,
    })
    .from(transactions)
    .leftJoin(users, eq(users.id, transactions.userId))
    .orderBy(desc(transactions.createdAt))
    .limit(200);

  const totalCompletedVnd = rows
    .filter((r) => r.status === "completed")
    .reduce((s, r) => s + r.amountVnd, 0);
  const pending = rows.filter((r) => r.status === "pending").length;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Giao dịch</h1>
          <p className="mt-1 text-sm text-[#9a9087]">200 giao dịch nạp gần nhất.</p>
        </div>
        <div className="flex gap-3 text-sm">
          <Stat label="Tổng đã nạp (200)" value={`${totalCompletedVnd.toLocaleString("vi-VN")}đ`} />
          <Stat label="Pending" value={String(pending)} />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-white/8">
        <table className="w-full text-sm">
          <thead className="bg-[#120c09] text-[0.65rem] uppercase tracking-[0.16em] text-[#5d544a]">
            <tr>
              <th className="px-3 py-2 text-left">Mã</th>
              <th className="px-3 py-2 text-left">User</th>
              <th className="px-3 py-2 text-right">VND</th>
              <th className="px-3 py-2 text-right">USD</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Provider</th>
              <th className="px-3 py-2 text-left">Tạo</th>
              <th className="px-3 py-2 text-left">Hoàn tất</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-[#5d544a]">
                  Chưa có giao dịch.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-t border-white/5">
                  <td className="px-3 py-2 font-mono text-[0.75rem] text-[#dff8e4]">{r.providerRef ?? "—"}</td>
                  <td className="px-3 py-2">{r.email ?? "—"}</td>
                  <td className="px-3 py-2 text-right">{r.amountVnd.toLocaleString("vi-VN")}đ</td>
                  <td className="px-3 py-2 text-right">${(r.amountMicroUsd / 1_000_000).toFixed(2)}</td>
                  <td className="px-3 py-2">
                    <StatusPill status={r.status} />
                  </td>
                  <td className="px-3 py-2 font-mono text-[0.7rem] text-[#9a9087]">{r.provider}</td>
                  <td className="px-3 py-2 text-[#9a9087]">
                    {r.createdAt ? new Date(r.createdAt).toLocaleString("vi-VN") : "—"}
                  </td>
                  <td className="px-3 py-2 text-[#9a9087]">
                    {r.completedAt ? new Date(r.completedAt).toLocaleString("vi-VN") : "—"}
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/8 bg-[#0c0a08] px-4 py-2">
      <div className="font-mono text-[0.55rem] uppercase tracking-[0.16em] text-[#5d544a]">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-[#d6a548]/15 text-[#d6a548]",
    completed: "bg-[#45a85d]/15 text-[#dff8e4]",
    failed: "bg-[#ef4444]/15 text-[#ef4444]",
    refunded: "bg-white/5 text-[#9a9087]",
  };
  return (
    <span
      className={`rounded-full px-2 py-0.5 font-mono text-[0.6rem] uppercase tracking-[0.16em] ${
        styles[status] ?? "bg-white/5 text-[#9a9087]"
      }`}
    >
      {status}
    </span>
  );
}

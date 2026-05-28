import Link from "next/link";

import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin-config";
import { redirect } from "next/navigation";
import { db } from "@/lib/pg/db";
import { emailEvents } from "@/lib/pg/schema";
import { desc } from "drizzle-orm";

export const metadata = { title: "Gmail biên lai · Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function GmailLogPage() {
  const session = await auth();
  if (!(await isAdminEmail(session?.user?.email ?? null))) redirect("/");

  const events = await db
    .select()
    .from(emailEvents)
    .orderBy(desc(emailEvents.receivedAt))
    .limit(100);

  const counts = events.reduce<Record<string, number>>((acc, e) => {
    acc[e.status] = (acc[e.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Gmail biên lai</h1>
          <p className="mt-1 text-sm text-[#9a9087]">
            100 email biên lai gần nhất từ MB Bank. Cron poll mỗi phút qua{" "}
            <code className="rounded bg-[#120c09] px-1.5 py-0.5 text-[0.78rem] text-[#dff8e4]">
              /api/billing/gmail/poll
            </code>
            .
          </p>
        </div>
        <Link
          href={`/api/billing/gmail/poll?key=${encodeURIComponent(process.env.CRON_SECRET ?? "")}`}
          target="_blank"
          rel="noopener"
          className="rounded-lg border border-[#ef4444]/40 bg-[#ef4444]/10 px-3 py-2 font-mono text-[0.65rem] uppercase tracking-[0.2em] text-[#f4eadc]"
        >
          Poll ngay
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Credited" value={String(counts["credited"] ?? 0)} accent="green" />
        <Stat label="Skipped (đã credit / not_inbound / no_match)" value={String(events.length - (counts["credited"] ?? 0))} />
        <Stat label="Total seen" value={String(events.length)} />
      </div>

      <div className="overflow-hidden rounded-xl border border-white/8">
        <table className="w-full text-sm">
          <thead className="bg-[#120c09] text-[0.65rem] uppercase tracking-[0.16em] text-[#5d544a]">
            <tr>
              <th className="px-3 py-2 text-left">Thời gian</th>
              <th className="px-3 py-2 text-left">Ref</th>
              <th className="px-3 py-2 text-right">Số tiền</th>
              <th className="px-3 py-2 text-left">Direction</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Note</th>
            </tr>
          </thead>
          <tbody>
            {events.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-[#5d544a]">
                  Chưa có email biên lai nào.
                </td>
              </tr>
            ) : (
              events.map((e) => (
                <tr key={e.messageId} className="border-t border-white/5">
                  <td className="whitespace-nowrap px-3 py-2 text-[#9a9087]">
                    {e.receivedAt ? new Date(e.receivedAt).toLocaleString("vi-VN") : "—"}
                  </td>
                  <td className="px-3 py-2 font-mono text-[0.75rem] text-[#dff8e4]">{e.parsedRef ?? "—"}</td>
                  <td className="px-3 py-2 text-right">
                    {e.parsedAmountVnd ? `${e.parsedAmountVnd.toLocaleString("vi-VN")}đ` : "—"}
                  </td>
                  <td className="px-3 py-2 font-mono text-[0.7rem]">{e.direction ?? "—"}</td>
                  <td className="px-3 py-2">
                    <StatusPill status={e.status} />
                  </td>
                  <td className="px-3 py-2 text-[0.7rem] text-[#9a9087]">{e.note ?? "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: "green" }) {
  return (
    <div className="rounded-xl border border-white/8 bg-[#0c0a08] p-4">
      <div className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-[#5d544a]">{label}</div>
      <div className={"mt-1 text-2xl font-semibold " + (accent === "green" ? "text-[#dff8e4]" : "")}>
        {value}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    credited: "bg-[#45a85d]/15 text-[#dff8e4]",
    no_match: "bg-white/5 text-[#9a9087]",
    ref_not_found: "bg-[#d6a548]/15 text-[#d6a548]",
    amount_mismatch: "bg-[#ef4444]/15 text-[#ef4444]",
    txn_already_completed: "bg-white/5 text-[#9a9087]",
    outbound_ignored: "bg-white/5 text-[#9a9087]",
  };
  return (
    <span
      className={`rounded-full px-2 py-0.5 font-mono text-[0.6rem] uppercase tracking-[0.16em] ${
        map[status] ?? "bg-white/5 text-[#9a9087]"
      }`}
    >
      {status}
    </span>
  );
}

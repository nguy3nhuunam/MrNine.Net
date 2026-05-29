import { and, desc, eq, gte, sql } from "drizzle-orm";
import Link from "next/link";

import { db } from "@/lib/pg/db";
import { apiKeys, dailyUsage, requests } from "@/lib/pg/schema";
import { formatVnd, microUsdToUsd, microUsdToVnd, requireUser } from "@/lib/pg/session";
import { QuotaPanel } from "@/components/dashboard/QuotaPanel";

export const metadata = { title: "Dashboard · MrNine" };
export const dynamic = "force-dynamic";

export default async function DashboardOverview() {
  const user = await requireUser();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [keyCountRow, dailyRows, recent] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(apiKeys)
      .where(and(eq(apiKeys.userId, user.id), eq(apiKeys.status, "active"))),
    db
      .select({
        day: dailyUsage.day,
        totalTokens: dailyUsage.totalTokens,
        cost: dailyUsage.costUserMicroUsd,
        requestsOk: dailyUsage.requestsOk,
      })
      .from(dailyUsage)
      .where(and(eq(dailyUsage.userId, user.id), gte(dailyUsage.day, sevenDaysAgo)))
      .orderBy(dailyUsage.day),
    db
      .select({
        requestId: requests.requestId,
        publicModel: requests.publicModel,
        totalTokens: requests.totalTokens,
        costUser: requests.costUserMicroUsd,
        statusCode: requests.statusCode,
        latencyMs: requests.latencyMs,
        createdAt: requests.createdAt,
      })
      .from(requests)
      .where(eq(requests.userId, user.id))
      .orderBy(desc(requests.createdAt))
      .limit(10),
  ]);

  const activeKeys = keyCountRow[0]?.count ?? 0;
  const last7Tokens = dailyRows.reduce((sum, r) => sum + Number(r.totalTokens ?? 0), 0);
  const last7Cost = dailyRows.reduce((sum, r) => sum + Number(r.cost ?? 0), 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Xin chào{user.displayName ? `, ${user.displayName}` : ""}</h1>
        <p className="mt-1 text-sm text-[#9a9087]">
          Tổng quan tài khoản. Endpoint API:{" "}
          <code className="rounded bg-[#120c09] px-1.5 py-0.5 text-[0.78rem] text-[#dff8e4]">
            https://api.mrnine.net/v1
          </code>
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card label="Số dư">
          <div className="text-2xl font-semibold text-[#f4eadc]">${microUsdToUsd(user.balanceMicroUsd)}</div>
          <div className="mt-1 text-[0.7rem] text-[#5d544a]">≈ {formatVnd(microUsdToVnd(user.balanceMicroUsd))}</div>
          <Link href="/dashboard/billing" className="mt-2 inline-block text-xs text-[#ef4444] hover:underline">
            Nạp thêm →
          </Link>
        </Card>
        <Card label="API keys active">
          <div className="text-2xl font-semibold">{activeKeys}</div>
          <Link href="/dashboard/api-keys" className="mt-2 inline-block text-xs text-[#ef4444] hover:underline">
            Quản lý →
          </Link>
        </Card>
        <Card label="Tokens (7 ngày)">
          <div className="text-2xl font-semibold">{last7Tokens.toLocaleString("vi-VN")}</div>
        </Card>
        <Card label="Chi phí (7 ngày)">
          <div className="text-2xl font-semibold">${(last7Cost / 1_000_000).toFixed(4)}</div>
          <div className="mt-1 text-[0.7rem] text-[#5d544a]">≈ {formatVnd(microUsdToVnd(last7Cost))}</div>
        </Card>
      </div>

      <section>
        <h2 className="text-sm font-mono uppercase tracking-[0.2em] text-[#9a9087]">
          Rate limit (RPM/TPM) live
        </h2>
        <div className="mt-3">
          <QuotaPanel />
        </div>
      </section>

      <section className="rounded-xl border border-[#d6a548]/30 bg-[#d6a548]/5 p-4">
        <h2 className="font-mono text-[0.7rem] uppercase tracking-[0.24em] text-[#d6a548]">
          Referral
        </h2>
        <p className="mt-2 text-sm text-[#c8bdaf]">
          Mời bạn bè qua link riêng — bạn nhận <span className="text-[#dff8e4]">10% topup</span> (tối đa $5),
          họ nhận <span className="text-[#dff8e4]">$1 welcome</span> khi nạp lần đầu.
        </p>
        {user.referralCode ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <code className="rounded-md border border-white/10 bg-[#0c0a08] px-3 py-2 font-mono text-sm text-[#f4eadc]">
              https://mrnine.net/r/{user.referralCode}
            </code>
            <code className="rounded-md border border-white/10 bg-[#0c0a08] px-3 py-2 font-mono text-xs text-[#9a9087]">
              code: {user.referralCode}
            </code>
          </div>
        ) : (
          <p className="mt-2 font-mono text-xs text-[#9a9087]">Đang tạo mã referral…</p>
        )}
      </section>

      <section>
        <h2 className="text-sm font-mono uppercase tracking-[0.2em] text-[#9a9087]">Request gần đây</h2>
        <div className="mt-3 overflow-hidden rounded-lg border border-white/8">
          <table className="w-full text-sm">
            <thead className="bg-[#120c09] text-[0.65rem] uppercase tracking-[0.16em] text-[#5d544a]">
              <tr>
                <th className="px-3 py-2 text-left">Thời gian</th>
                <th className="px-3 py-2 text-left">Model</th>
                <th className="px-3 py-2 text-right">Tokens</th>
                <th className="px-3 py-2 text-right">Chi phí</th>
                <th className="px-3 py-2 text-right">Latency</th>
                <th className="px-3 py-2 text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {recent.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-[#5d544a]">
                    Chưa có request nào. Tạo API key và bắt đầu gọi.
                  </td>
                </tr>
              ) : (
                recent.map((r) => (
                  <tr key={r.requestId} className="border-t border-white/5">
                    <td className="px-3 py-2 text-[#9a9087]">
                      {r.createdAt ? new Date(r.createdAt).toLocaleString("vi-VN") : "-"}
                    </td>
                    <td className="px-3 py-2 font-mono">{r.publicModel}</td>
                    <td className="px-3 py-2 text-right">{(r.totalTokens ?? 0).toLocaleString("vi-VN")}</td>
                    <td className="px-3 py-2 text-right">${(Number(r.costUser ?? 0) / 1_000_000).toFixed(4)}</td>
                    <td className="px-3 py-2 text-right text-[#9a9087]">{r.latencyMs}ms</td>
                    <td className="px-3 py-2 text-right">
                      <StatusPill code={r.statusCode} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Card({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/8 bg-[#0c0a08] p-4">
      <div className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-[#5d544a]">{label}</div>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function StatusPill({ code }: { code: number }) {
  const ok = code >= 200 && code < 300;
  return (
    <span
      className={
        "rounded-full px-2 py-0.5 font-mono text-[0.6rem] uppercase " +
        (ok ? "bg-[#45a85d]/15 text-[#dff8e4]" : "bg-[#ef4444]/15 text-[#ef4444]")
      }
    >
      {code}
    </span>
  );
}

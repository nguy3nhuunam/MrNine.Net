import { and, desc, eq, gte, sql } from "drizzle-orm";

import { db } from "@/lib/pg/db";
import { apiKeys, requests } from "@/lib/pg/schema";
import { microUsdToUsd, requireUser } from "@/lib/pg/session";

export const metadata = { title: "Usage · MrNine" };
export const dynamic = "force-dynamic";

const RANGES = {
  "24h": 1,
  "7d": 7,
  "30d": 30,
} as const;

type RangeKey = keyof typeof RANGES;

export default async function UsagePage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const range = (sp.range ?? "7d") as RangeKey;
  const days = RANGES[range] ?? 7;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const rows = await db
    .select({
      requestId: requests.requestId,
      endpoint: requests.endpoint,
      publicModel: requests.publicModel,
      stream: requests.stream,
      promptTokens: requests.promptTokens,
      completionTokens: requests.completionTokens,
      totalTokens: requests.totalTokens,
      costUserMicroUsd: requests.costUserMicroUsd,
      latencyMs: requests.latencyMs,
      statusCode: requests.statusCode,
      createdAt: requests.createdAt,
    })
    .from(requests)
    .where(and(eq(requests.userId, user.id), gte(requests.createdAt, since)))
    .orderBy(desc(requests.createdAt))
    .limit(200);

  const totalCost = rows.reduce((s, r) => s + Number(r.costUserMicroUsd ?? 0), 0);
  const totalTokens = rows.reduce((s, r) => s + (r.totalTokens ?? 0), 0);
  const okCount = rows.filter((r) => (r.statusCode ?? 0) < 400).length;

  // Per-key breakdown trong cùng range
  const perKey = await db
    .select({
      keyId: apiKeys.id,
      keyName: apiKeys.name,
      keyPrefix: apiKeys.keyPrefix,
      requestCount: sql<number>`count(${requests.id})`,
      totalTokens: sql<number>`coalesce(sum(${requests.totalTokens}), 0)`,
      costMicroUsd: sql<number>`coalesce(sum(${requests.costUserMicroUsd}), 0)`,
    })
    .from(apiKeys)
    .leftJoin(
      requests,
      and(
        eq(requests.apiKeyId, apiKeys.id),
        gte(requests.createdAt, since),
      ),
    )
    .where(eq(apiKeys.userId, user.id))
    .groupBy(apiKeys.id, apiKeys.name, apiKeys.keyPrefix)
    .orderBy(desc(sql`coalesce(sum(${requests.costUserMicroUsd}), 0)`));

  const totalsForBars = perKey.reduce((s, k) => s + Number(k.costMicroUsd), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Usage</h1>
          <p className="mt-1 text-sm text-[#9a9087]">Lịch sử request — 200 request gần nhất.</p>
        </div>
        <div className="flex gap-2">
          {(["24h", "7d", "30d"] as RangeKey[]).map((r) => (
            <a
              key={r}
              href={`/dashboard/usage?range=${r}`}
              className={
                "rounded-md border px-3 py-1.5 font-mono text-[0.65rem] uppercase tracking-[0.16em] " +
                (r === range
                  ? "border-[#ef4444]/50 bg-[#ef4444]/10 text-[#f4eadc]"
                  : "border-white/10 text-[#9a9087] hover:border-white/30")
              }
            >
              {r}
            </a>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Request thành công" value={`${okCount}/${rows.length}`} />
        <Stat label="Tổng tokens" value={totalTokens.toLocaleString("vi-VN")} />
        <Stat label="Tổng chi phí" value={`$${microUsdToUsd(totalCost)}`} />
      </div>

      <section className="rounded-xl border border-white/8 bg-[#0c0a08] p-4">
        <h2 className="font-mono text-[0.7rem] uppercase tracking-[0.24em] text-[#9a9087]">
          Theo API key ({range})
        </h2>
        <div className="mt-3 space-y-2">
          {perKey.length === 0 ? (
            <p className="font-mono text-xs text-[#5d544a]">Chưa có key nào.</p>
          ) : (
            perKey.map((k) => {
              const cost = Number(k.costMicroUsd);
              const pct = totalsForBars === 0 ? 0 : (cost / totalsForBars) * 100;
              return (
                <div key={k.keyId} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{k.keyName}</span>
                      <span className="font-mono text-[0.65rem] text-[#5d544a]">{k.keyPrefix}</span>
                    </div>
                    <div className="flex items-center gap-3 font-mono text-[0.78rem]">
                      <span className="text-[#9a9087]">{Number(k.requestCount).toLocaleString("vi-VN")} req</span>
                      <span className="text-[#9a9087]">{Number(k.totalTokens).toLocaleString("vi-VN")} tok</span>
                      <span className="text-[#dff8e4]">${(cost / 1_000_000).toFixed(4)}</span>
                    </div>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                    <div
                      className="h-full bg-gradient-to-r from-[#ef4444] to-[#d6a548]"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      <div className="overflow-x-auto rounded-xl border border-white/8">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="bg-[#120c09] text-[0.65rem] uppercase tracking-[0.16em] text-[#5d544a]">
            <tr>
              <th className="px-3 py-2 text-left">Thời gian</th>
              <th className="px-3 py-2 text-left">Endpoint</th>
              <th className="px-3 py-2 text-left">Model</th>
              <th className="px-3 py-2 text-right">Prompt</th>
              <th className="px-3 py-2 text-right">Completion</th>
              <th className="px-3 py-2 text-right">Total</th>
              <th className="px-3 py-2 text-right">Cost</th>
              <th className="px-3 py-2 text-right">Latency</th>
              <th className="px-3 py-2 text-right">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-3 py-8 text-center text-[#5d544a]">
                  Chưa có request nào trong khoảng thời gian này.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.requestId} className="border-t border-white/5">
                  <td className="whitespace-nowrap px-3 py-2 text-[#9a9087]">
                    {r.createdAt ? new Date(r.createdAt).toLocaleString("vi-VN") : "-"}
                  </td>
                  <td className="px-3 py-2">
                    <span className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[0.65rem] uppercase">
                      {r.endpoint}
                    </span>
                    {r.stream ? <span className="ml-1 text-[0.6rem] text-[#dff8e4]">stream</span> : null}
                  </td>
                  <td className="px-3 py-2 font-mono">{r.publicModel ?? "-"}</td>
                  <td className="px-3 py-2 text-right text-[#9a9087]">{(r.promptTokens ?? 0).toLocaleString("vi-VN")}</td>
                  <td className="px-3 py-2 text-right text-[#9a9087]">
                    {(r.completionTokens ?? 0).toLocaleString("vi-VN")}
                  </td>
                  <td className="px-3 py-2 text-right">{(r.totalTokens ?? 0).toLocaleString("vi-VN")}</td>
                  <td className="px-3 py-2 text-right">${(Number(r.costUserMicroUsd ?? 0) / 1_000_000).toFixed(4)}</td>
                  <td className="px-3 py-2 text-right text-[#9a9087]">{r.latencyMs}ms</td>
                  <td className="px-3 py-2 text-right">
                    <span
                      className={
                        "rounded-full px-2 py-0.5 font-mono text-[0.6rem] uppercase " +
                        ((r.statusCode ?? 0) < 400
                          ? "bg-[#45a85d]/15 text-[#dff8e4]"
                          : "bg-[#ef4444]/15 text-[#ef4444]")
                      }
                    >
                      {r.statusCode ?? 0}
                    </span>
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
    <div className="rounded-xl border border-white/8 bg-[#0c0a08] p-4">
      <div className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-[#5d544a]">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}

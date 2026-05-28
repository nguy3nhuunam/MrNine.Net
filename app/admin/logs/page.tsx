import { and, desc, eq, gte, sql } from "drizzle-orm";

import { db } from "@/lib/pg/db";
import { apiKeys, requests, users } from "@/lib/pg/schema";

export const metadata = { title: "Logs · Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

const RANGES = { "1h": 1 / 24, "24h": 1, "7d": 7 } as const;
type RangeKey = keyof typeof RANGES;

export default async function AdminLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; status?: string; email?: string }>;
}) {
  const sp = await searchParams;
  const range = (sp.range ?? "24h") as RangeKey;
  const days = RANGES[range] ?? 1;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const statusFilter = sp.status; // "ok" | "err"
  const emailFilter = (sp.email ?? "").trim().toLowerCase();

  const where = and(
    gte(requests.createdAt, since),
    statusFilter === "err"
      ? sql`${requests.statusCode} >= 400`
      : statusFilter === "ok"
        ? sql`${requests.statusCode} < 400`
        : sql`true`,
    emailFilter ? sql`${users.email} ILIKE ${"%" + emailFilter + "%"}` : sql`true`,
  );

  const rows = await db
    .select({
      requestId: requests.requestId,
      email: users.email,
      apiKeyPrefix: apiKeys.keyPrefix,
      endpoint: requests.endpoint,
      publicModel: requests.publicModel,
      stream: requests.stream,
      totalTokens: requests.totalTokens,
      cost: requests.costUserMicroUsd,
      profit: requests.profitMicroUsd,
      statusCode: requests.statusCode,
      latencyMs: requests.latencyMs,
      errorMessage: requests.errorMessage,
      createdAt: requests.createdAt,
    })
    .from(requests)
    .leftJoin(users, eq(users.id, requests.userId))
    .leftJoin(apiKeys, eq(apiKeys.id, requests.apiKeyId))
    .where(where)
    .orderBy(desc(requests.createdAt))
    .limit(300);

  const okCount = rows.filter((r) => (r.statusCode ?? 0) < 400).length;
  const errCount = rows.length - okCount;
  const totalProfit = rows.reduce((s, r) => s + Number(r.profit ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Request logs</h1>
          <p className="mt-1 text-sm text-[#9a9087]">300 request gần nhất qua gateway.</p>
        </div>
        <form className="flex flex-wrap items-end gap-2">
          <select
            name="range"
            defaultValue={range}
            className="rounded-md border border-[#2a251f] bg-[#0c0a08] px-3 py-1.5 text-xs text-[#f4eadc] outline-none"
          >
            <option value="1h">Last 1h</option>
            <option value="24h">Last 24h</option>
            <option value="7d">Last 7d</option>
          </select>
          <select
            name="status"
            defaultValue={statusFilter ?? ""}
            className="rounded-md border border-[#2a251f] bg-[#0c0a08] px-3 py-1.5 text-xs text-[#f4eadc] outline-none"
          >
            <option value="">All status</option>
            <option value="ok">Only OK</option>
            <option value="err">Only error</option>
          </select>
          <input
            name="email"
            defaultValue={emailFilter}
            placeholder="Email..."
            className="rounded-md border border-[#2a251f] bg-[#0c0a08] px-3 py-1.5 text-xs text-[#f4eadc] outline-none"
          />
          <button className="rounded-md border border-white/10 px-3 py-1.5 font-mono text-[0.65rem] uppercase tracking-[0.16em] text-[#9a9087] hover:border-white/30">
            Lọc
          </button>
        </form>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="OK" value={String(okCount)} />
        <Stat label="Error" value={String(errCount)} />
        <Stat label="Profit (300 req)" value={`$${(totalProfit / 1_000_000).toFixed(4)}`} />
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/8">
        <table className="w-full min-w-[1100px] text-sm">
          <thead className="bg-[#120c09] text-[0.65rem] uppercase tracking-[0.16em] text-[#5d544a]">
            <tr>
              <th className="px-3 py-2 text-left">Thời gian</th>
              <th className="px-3 py-2 text-left">User</th>
              <th className="px-3 py-2 text-left">Key</th>
              <th className="px-3 py-2 text-left">Endpoint</th>
              <th className="px-3 py-2 text-left">Model</th>
              <th className="px-3 py-2 text-right">Tokens</th>
              <th className="px-3 py-2 text-right">Cost</th>
              <th className="px-3 py-2 text-right">Profit</th>
              <th className="px-3 py-2 text-right">Latency</th>
              <th className="px-3 py-2 text-right">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-3 py-8 text-center text-[#5d544a]">
                  Không có request nào.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.requestId} className="border-t border-white/5">
                  <td className="whitespace-nowrap px-3 py-2 text-[#9a9087]">
                    {r.createdAt ? new Date(r.createdAt).toLocaleString("vi-VN") : "—"}
                  </td>
                  <td className="px-3 py-2">{r.email ?? "—"}</td>
                  <td className="px-3 py-2 font-mono text-[0.7rem] text-[#9a9087]">{r.apiKeyPrefix ?? "—"}</td>
                  <td className="px-3 py-2 font-mono text-[0.7rem]">
                    {r.endpoint}
                    {r.stream ? <span className="ml-1 text-[#dff8e4]">·s</span> : null}
                  </td>
                  <td className="px-3 py-2 font-mono">{r.publicModel ?? "—"}</td>
                  <td className="px-3 py-2 text-right">{(r.totalTokens ?? 0).toLocaleString("vi-VN")}</td>
                  <td className="px-3 py-2 text-right">${(Number(r.cost ?? 0) / 1_000_000).toFixed(4)}</td>
                  <td className="px-3 py-2 text-right text-[#dff8e4]">
                    ${(Number(r.profit ?? 0) / 1_000_000).toFixed(4)}
                  </td>
                  <td className="px-3 py-2 text-right text-[#9a9087]">{r.latencyMs}ms</td>
                  <td className="px-3 py-2 text-right">
                    <StatusPill code={r.statusCode ?? 0} />
                    {r.errorMessage ? (
                      <div className="mt-0.5 text-[0.6rem] text-[#ef4444]">{r.errorMessage.slice(0, 40)}</div>
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-[#0c0a08] p-4">
      <div className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-[#5d544a]">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
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

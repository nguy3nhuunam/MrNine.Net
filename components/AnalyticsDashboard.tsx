"use client";

import { useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";

type Range = { from: string; to: string; days: number };
type DauPoint = { day: string; users: number };
type ModuleRow = { module: string; opens: number };
type ErrorRow = { message: string; count: number };
type FunnelData = {
  opens: number;
  callStarts: number;
  callSuccesses: number;
  callErrors: number;
};

type Payload = {
  range: Range;
  dau: DauPoint[];
  topModules: ModuleRow[];
  topErrors: ErrorRow[];
  funnel: FunnelData;
  eventCounts: Record<string, number>;
  empty?: boolean;
};

const DAY_OPTIONS = [1, 7, 14, 30] as const;

export function AnalyticsDashboard() {
  const [days, setDays] = useState<(typeof DAY_OPTIONS)[number]>(7);
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    setError(null);
    fetch(`/api/admin/analytics?days=${days}`, { signal: ctrl.signal, cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (j?.error) setError(String(j.error));
        else setData(j as Payload);
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      })
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, [days]);

  const successRate =
    data && data.funnel.callStarts > 0
      ? Math.round((data.funnel.callSuccesses / data.funnel.callStarts) * 100)
      : null;
  const errorRate =
    data && data.funnel.callStarts > 0
      ? Math.round((data.funnel.callErrors / data.funnel.callStarts) * 100)
      : null;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        {DAY_OPTIONS.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDays(d)}
            className={`rounded-md border px-3 py-1.5 text-[0.78rem] transition ${
              days === d
                ? "border-amber-400/60 bg-amber-500/15 text-amber-200"
                : "border-white/12 text-white/70 hover:bg-white/[0.05]"
            }`}
          >
            {d === 1 ? "24h" : `${d} ngày`}
          </button>
        ))}
        {loading ? (
          <span className="ml-2 inline-flex items-center gap-1.5 text-[0.78rem] text-white/55">
            <LoaderCircle size={14} className="animate-spin" /> đang tải
          </span>
        ) : null}
      </div>

      {error ? (
        <div className="rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 text-[0.85rem] text-red-200">
          Lỗi: {error}
        </div>
      ) : null}

      {data ? (
        <>
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Opens" value={data.funnel.opens} />
            <Stat label="AI calls" value={data.funnel.callStarts} />
            <Stat label="Success rate" value={successRate === null ? "—" : `${successRate}%`} />
            <Stat label="Error rate" value={errorRate === null ? "—" : `${errorRate}%`} tone={errorRate && errorRate > 10 ? "warn" : undefined} />
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <Card title="DAU 7 ngày">
              {data.dau.length === 0 ? (
                <Empty>Chưa có dữ liệu.</Empty>
              ) : (
                <table className="w-full text-[0.85rem]">
                  <thead className="text-[0.7rem] uppercase tracking-wider text-white/45">
                    <tr>
                      <th className="py-1 text-left">Ngày</th>
                      <th className="py-1 text-right">Users</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.dau.map((row) => (
                      <tr key={row.day} className="border-t border-white/5">
                        <td className="py-1.5 font-mono text-white/80">{row.day}</td>
                        <td className="py-1.5 text-right text-white/90">{row.users}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>

            <Card title="Top module">
              {data.topModules.length === 0 ? (
                <Empty>Chưa có module_open events.</Empty>
              ) : (
                <table className="w-full text-[0.85rem]">
                  <thead className="text-[0.7rem] uppercase tracking-wider text-white/45">
                    <tr>
                      <th className="py-1 text-left">Module</th>
                      <th className="py-1 text-right">Opens</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topModules.map((row) => (
                      <tr key={row.module} className="border-t border-white/5">
                        <td className="py-1.5 text-white/85">{row.module}</td>
                        <td className="py-1.5 text-right text-white/90">{row.opens}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
          </section>

          <Card title="Top errors">
            {data.topErrors.length === 0 ? (
              <Empty>Không có error gần đây — tốt.</Empty>
            ) : (
              <ul className="space-y-2 text-[0.85rem]">
                {data.topErrors.map((row, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 border-t border-white/5 pt-2">
                    <span className="line-clamp-1 flex-1 text-white/80">{row.message || "(empty)"}</span>
                    <span className="font-mono text-amber-300/85">{row.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Event counts">
            <div className="flex flex-wrap gap-2 text-[0.78rem]">
              {Object.entries(data.eventCounts).map(([name, count]) => (
                <span
                  key={name}
                  className="rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1 font-mono text-white/85"
                >
                  {name}: <strong className="ml-1 text-amber-300/95">{count}</strong>
                </span>
              ))}
            </div>
          </Card>
        </>
      ) : null}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number | string; tone?: "warn" }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="text-[0.7rem] font-mono uppercase tracking-wider text-white/55">{label}</div>
      <div
        className={`mt-1 text-2xl font-semibold tracking-tight ${
          tone === "warn" ? "text-amber-300" : "text-white"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <h2 className="mb-3 text-[0.78rem] font-mono uppercase tracking-[0.18em] text-white/55">
        {title}
      </h2>
      {children}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-[0.85rem] text-white/45">{children}</p>;
}

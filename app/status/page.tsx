import { gte, sql } from "drizzle-orm";

import { db } from "@/lib/pg/db";
import { providerKeys, requests } from "@/lib/pg/schema";

export const metadata = {
  title: "Status · MrNine",
  description: "Live status của API gateway, provider keys và error rate.",
};

export const dynamic = "force-dynamic";
export const revalidate = 30;

const GATEWAY_URL = process.env.GATEWAY_HEALTH_URL ?? "https://api.mrnine.net/health";

type Health = { ok: boolean; status: string; issues?: string[]; error?: string };

async function gatewayHealth(): Promise<Health> {
  try {
    const res = await fetch(GATEWAY_URL, {
      next: { revalidate: 30 },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return { ok: false, status: `http_${res.status}` };
    const body = (await res.json()) as { status: string; issues?: string[] };
    return { ok: body.status === "ok", status: body.status, issues: body.issues };
  } catch (e: unknown) {
    return { ok: false, status: "unreachable", error: e instanceof Error ? e.message : String(e) };
  }
}

export default async function StatusPage() {
  const [health, providerStats, errorWindow] = await Promise.all([
    gatewayHealth(),
    db
      .select({
        provider: providerKeys.provider,
        status: providerKeys.status,
        count: sql<number>`count(*)`,
      })
      .from(providerKeys)
      .groupBy(providerKeys.provider, providerKeys.status),
    (async () => {
      const since = new Date(Date.now() - 5 * 60_000);
      const rows = await db
        .select({
          total: sql<number>`count(*)`,
          ok: sql<number>`sum(case when ${requests.statusCode} < 400 then 1 else 0 end)`,
          err5xx: sql<number>`sum(case when ${requests.statusCode} >= 500 then 1 else 0 end)`,
          err4xx: sql<number>`sum(case when ${requests.statusCode} >= 400 and ${requests.statusCode} < 500 then 1 else 0 end)`,
        })
        .from(requests)
        .where(gte(requests.createdAt, since));
      return rows[0];
    })(),
  ]);

  const total = Number(errorWindow.total ?? 0);
  const errRate = total === 0 ? 0 : (Number(errorWindow.err5xx) / total) * 100;

  // Group provider keys: one row per provider with active/cooling/disabled counts
  const providers = new Map<string, { active: number; cooling: number; disabled: number }>();
  for (const r of providerStats) {
    const cur = providers.get(r.provider) ?? { active: 0, cooling: 0, disabled: 0 };
    if (r.status === "active") cur.active = Number(r.count);
    else if (r.status === "cooling") cur.cooling = Number(r.count);
    else if (r.status === "disabled") cur.disabled = Number(r.count);
    providers.set(r.provider, cur);
  }

  const overallOk = health.ok && errRate < 10 && Array.from(providers.values()).some((p) => p.active > 0);

  return (
    <main className="min-h-screen bg-[#090807] text-[#f4eadc]">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <a href="/" className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[#9a9087]">
          ← mrnine.net
        </a>
        <h1 className="mt-3 text-4xl font-semibold">Status</h1>

        <div
          className={
            "mt-6 flex items-center justify-between rounded-2xl border p-6 " +
            (overallOk
              ? "border-[#45a85d]/40 bg-[#45a85d]/8"
              : "border-[#ef4444]/40 bg-[#ef4444]/8")
          }
        >
          <div>
            <div className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-[#9a9087]">
              Tổng quan hệ thống
            </div>
            <div className="mt-1 text-2xl font-semibold">
              {overallOk ? "Tất cả hoạt động bình thường" : "Đang có vấn đề"}
            </div>
          </div>
          <div
            className={
              "size-3 rounded-full " + (overallOk ? "bg-[#45a85d]" : "bg-[#ef4444]")
            }
            aria-hidden
          />
        </div>

        <section className="mt-8 space-y-3">
          <h2 className="font-mono text-[0.7rem] uppercase tracking-[0.24em] text-[#9a9087]">
            Components
          </h2>
          <Row
            label="API Gateway"
            sub={GATEWAY_URL}
            status={health.ok ? "ok" : "down"}
            note={
              health.ok
                ? "200 OK"
                : health.status === "unreachable"
                  ? `Không kết nối được — ${health.error ?? ""}`
                  : `${health.status}${health.issues?.length ? ` · ${health.issues.join(", ")}` : ""}`
            }
          />
          {Array.from(providers.entries()).map(([name, c]) => (
            <Row
              key={name}
              label={`Provider: ${name}`}
              sub={`${c.active} active · ${c.cooling} cooling · ${c.disabled} disabled`}
              status={c.active > 0 ? "ok" : c.cooling > 0 ? "degraded" : "down"}
              note={
                c.active > 0
                  ? `${c.active} key sẵn sàng`
                  : c.cooling > 0
                    ? "Tất cả key đang cooldown"
                    : "Không còn key khả dụng"
              }
            />
          ))}
          {providers.size === 0 ? (
            <Row label="Provider keys" sub="provider_keys" status="down" note="Chưa có key nào." />
          ) : null}
          <Row
            label="Error rate (5 phút)"
            sub={`${total} requests · ${Number(errorWindow.err5xx)} 5xx · ${Number(errorWindow.err4xx)} 4xx`}
            status={errRate >= 10 ? "down" : errRate >= 2 ? "degraded" : "ok"}
            note={total === 0 ? "Không có traffic." : `${errRate.toFixed(2)}% server errors`}
          />
        </section>

        <p className="mt-12 text-center text-xs text-[#5d544a]">
          Auto refresh mỗi 30s · cập nhật{" "}
          {new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </p>
      </div>
    </main>
  );
}

function Row({
  label,
  sub,
  status,
  note,
}: {
  label: string;
  sub: string;
  status: "ok" | "degraded" | "down";
  note: string;
}) {
  const color =
    status === "ok"
      ? "bg-[#45a85d]"
      : status === "degraded"
        ? "bg-[#d6a548]"
        : "bg-[#ef4444]";
  const textCls =
    status === "ok"
      ? "text-[#dff8e4]"
      : status === "degraded"
        ? "text-[#d6a548]"
        : "text-[#ef4444]";

  return (
    <div className="flex items-start justify-between rounded-xl border border-white/8 bg-[#0c0a08] px-4 py-3">
      <div className="min-w-0">
        <div className="font-mono text-sm text-[#f4eadc]">{label}</div>
        <div className="mt-0.5 truncate font-mono text-[0.65rem] text-[#5d544a]">{sub}</div>
      </div>
      <div className="flex items-center gap-2">
        <span className={`font-mono text-[0.65rem] uppercase tracking-[0.2em] ${textCls}`}>{note}</span>
        <span className={`size-2.5 shrink-0 rounded-full ${color}`} aria-hidden />
      </div>
    </div>
  );
}

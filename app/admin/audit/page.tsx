import { desc } from "drizzle-orm";

import { db } from "@/lib/pg/db";
import { auditLog } from "@/lib/pg/schema";

export const metadata = { title: "Audit log · Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const rows = await db
    .select()
    .from(auditLog)
    .orderBy(desc(auditLog.createdAt))
    .limit(300);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Audit log</h1>
        <p className="mt-1 text-sm text-[#9a9087]">
          300 hành động admin gần nhất. Không thể chỉnh sửa hoặc xoá.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-white/8">
        <table className="w-full text-sm">
          <thead className="bg-[#120c09] text-[0.65rem] uppercase tracking-[0.16em] text-[#5d544a]">
            <tr>
              <th className="px-3 py-2 text-left">Thời gian</th>
              <th className="px-3 py-2 text-left">Actor</th>
              <th className="px-3 py-2 text-left">Action</th>
              <th className="px-3 py-2 text-left">Target</th>
              <th className="px-3 py-2 text-left">Metadata</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-[#5d544a]">
                  Chưa có audit entry.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-t border-white/5 align-top">
                  <td className="px-3 py-2 font-mono text-[0.7rem] text-[#9a9087]">
                    {r.createdAt ? new Date(r.createdAt).toLocaleString("vi-VN") : "—"}
                  </td>
                  <td className="px-3 py-2 font-mono text-[0.78rem] text-[#dff8e4]">
                    {r.actorEmail ?? "system"}
                  </td>
                  <td className="px-3 py-2 font-mono text-[0.78rem]">{r.action}</td>
                  <td className="px-3 py-2 font-mono text-[0.7rem] text-[#9a9087]">
                    {r.targetType ? `${r.targetType}/` : ""}
                    {r.targetId ?? "—"}
                  </td>
                  <td className="px-3 py-2">
                    {r.metadata ? (
                      <pre className="max-w-[360px] overflow-x-auto rounded bg-[#0c0a08] px-2 py-1 font-mono text-[0.6rem] text-[#9a9087]">
                        {JSON.stringify(r.metadata, null, 2)}
                      </pre>
                    ) : (
                      <span className="text-[#5d544a]">—</span>
                    )}
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

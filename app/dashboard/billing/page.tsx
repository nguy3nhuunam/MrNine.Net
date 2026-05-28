import { desc, eq } from "drizzle-orm";

import { db } from "@/lib/pg/db";
import { transactions } from "@/lib/pg/schema";
import { requireUser } from "@/lib/pg/session";
import { BillingPanel } from "@/components/dashboard/BillingPanel";
import {
  bankAccount,
  buildSepayQr,
  microUsdToVnd as _u,
  minTopupVnd,
  newProviderRef,
  vndRate,
  vndToMicroUsd,
} from "@/lib/billing/sepay";

export const metadata = { title: "Nạp tiền · MrNine" };
export const dynamic = "force-dynamic";

async function createIntent(formData: FormData): Promise<
  | { ref: string; qrUrl: string; vnd: number }
  | { error: string }
> {
  "use server";
  const user = await requireUser();
  const vnd = Math.round(Number(formData.get("amountVnd")));
  if (!Number.isFinite(vnd) || vnd <= 0) return { error: "Số tiền không hợp lệ" };
  if (vnd < minTopupVnd()) return { error: `Tối thiểu ${minTopupVnd().toLocaleString("vi-VN")}đ` };

  const ref = newProviderRef();
  const microUsd = vndToMicroUsd(vnd);

  await db.insert(transactions).values({
    userId: user.id,
    provider: "sepay",
    providerRef: ref,
    amountVnd: vnd,
    amountMicroUsd: microUsd,
    fxRate: vndRate(),
    status: "pending",
  });

  return {
    ref,
    qrUrl: buildSepayQr({ amount: vnd, ref }),
    vnd,
  };
}

export default async function BillingPage() {
  const user = await requireUser();
  const { account, bank } = bankAccount();

  const txns = await db
    .select({
      id: transactions.id,
      providerRef: transactions.providerRef,
      amountVnd: transactions.amountVnd,
      status: transactions.status,
      createdAt: transactions.createdAt,
      completedAt: transactions.completedAt,
    })
    .from(transactions)
    .where(eq(transactions.userId, user.id))
    .orderBy(desc(transactions.createdAt))
    .limit(20);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Nạp tiền</h1>
        <p className="mt-1 text-sm text-[#9a9087]">
          Chuyển khoản qua VietQR — số dư cập nhật tự động khi giao dịch hoàn tất.
        </p>
      </div>

      <BillingPanel
        initialBalanceMicroUsd={user.balanceMicroUsd}
        bankAccount={account || "(chưa cấu hình SEPAY_BANK_ACCOUNT)"}
        bankName={bank || "(chưa cấu hình SEPAY_BANK_NAME)"}
        vndRate={vndRate()}
        minVnd={minTopupVnd()}
        createIntent={createIntent}
      />

      <section>
        <h2 className="text-sm font-mono uppercase tracking-[0.2em] text-[#9a9087]">Lịch sử nạp</h2>
        <div className="mt-3 overflow-hidden rounded-xl border border-white/8">
          <table className="w-full text-sm">
            <thead className="bg-[#120c09] text-[0.65rem] uppercase tracking-[0.16em] text-[#5d544a]">
              <tr>
                <th className="px-3 py-2 text-left">Mã giao dịch</th>
                <th className="px-3 py-2 text-right">Số tiền</th>
                <th className="px-3 py-2 text-left">Trạng thái</th>
                <th className="px-3 py-2 text-left">Tạo</th>
                <th className="px-3 py-2 text-left">Hoàn tất</th>
              </tr>
            </thead>
            <tbody>
              {txns.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-[#5d544a]">
                    Chưa có giao dịch.
                  </td>
                </tr>
              ) : (
                txns.map((t) => (
                  <tr key={t.id} className="border-t border-white/5">
                    <td className="px-3 py-2 font-mono text-[0.78rem] text-[#dff8e4]">{t.providerRef}</td>
                    <td className="px-3 py-2 text-right">
                      {t.amountVnd.toLocaleString("vi-VN")}đ
                    </td>
                    <td className="px-3 py-2">
                      <StatusPill status={t.status} />
                    </td>
                    <td className="px-3 py-2 text-[#9a9087]">
                      {t.createdAt ? new Date(t.createdAt).toLocaleString("vi-VN") : "-"}
                    </td>
                    <td className="px-3 py-2 text-[#9a9087]">
                      {t.completedAt ? new Date(t.completedAt).toLocaleString("vi-VN") : "—"}
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

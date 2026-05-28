import { desc, eq, ilike, sql } from "drizzle-orm";

import { db } from "@/lib/pg/db";
import { balanceLedger, users } from "@/lib/pg/schema";
import { isAdminEmail } from "@/lib/admin-config";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export const metadata = { title: "Users · Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

async function adjustBalance(formData: FormData) {
  "use server";
  const session = await auth();
  const adminEmail = session?.user?.email ?? null;
  if (!(await isAdminEmail(adminEmail))) return;

  const userId = String(formData.get("userId") ?? "");
  const usd = parseFloat(String(formData.get("usd") ?? "0"));
  const note = String(formData.get("note") ?? "manual adjust").slice(0, 240);
  if (!userId || !Number.isFinite(usd) || usd === 0) return;

  const delta = Math.round(usd * 1_000_000);
  const u = (await db.select().from(users).where(eq(users.id, userId)).limit(1))[0];
  if (!u) return;
  const newBal = u.balanceMicroUsd + delta;

  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({
        balanceMicroUsd: newBal,
        lifetimeTopupMicroUsd: delta > 0
          ? sql`${users.lifetimeTopupMicroUsd} + ${delta}`
          : users.lifetimeTopupMicroUsd,
      })
      .where(eq(users.id, userId));
    await tx.insert(balanceLedger).values({
      userId,
      kind: delta > 0 ? "adjust" : "adjust",
      deltaMicroUsd: delta,
      balanceAfterMicroUsd: newBal,
      note: `[admin:${adminEmail}] ${note}`,
    });
  });
  revalidatePath("/admin/users");
}

async function toggleStatus(formData: FormData) {
  "use server";
  const session = await auth();
  if (!(await isAdminEmail(session?.user?.email ?? null))) return;
  const userId = String(formData.get("userId") ?? "");
  const next = String(formData.get("status") ?? "active") as "active" | "suspended";
  if (!userId) return;
  await db.update(users).set({ status: next }).where(eq(users.id, userId));
  revalidatePath("/admin/users");
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();

  const list = await db
    .select({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
      isAdmin: users.isAdmin,
      status: users.status,
      balance: users.balanceMicroUsd,
      lifetimeTopup: users.lifetimeTopupMicroUsd,
      lifetimeSpend: users.lifetimeSpendMicroUsd,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(q ? ilike(users.email, `%${q}%`) : sql`true`)
    .orderBy(desc(users.createdAt))
    .limit(100);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Users</h1>
          <p className="mt-1 text-sm text-[#9a9087]">100 user gần nhất.</p>
        </div>
        <form className="flex gap-2">
          <input
            name="q"
            defaultValue={q}
            placeholder="Tìm theo email..."
            className="rounded-md border border-[#2a251f] bg-[#0c0a08] px-3 py-1.5 text-sm text-[#f4eadc] outline-none focus:border-[#ef4444]/60"
          />
          <button className="rounded-md border border-white/10 px-3 py-1.5 font-mono text-[0.65rem] uppercase tracking-[0.16em] text-[#9a9087] hover:border-white/30">
            Tìm
          </button>
        </form>
      </div>

      <div className="overflow-hidden rounded-xl border border-white/8">
        <table className="w-full text-sm">
          <thead className="bg-[#120c09] text-[0.65rem] uppercase tracking-[0.16em] text-[#5d544a]">
            <tr>
              <th className="px-3 py-2 text-left">Email</th>
              <th className="px-3 py-2 text-right">Balance</th>
              <th className="px-3 py-2 text-right">Topup</th>
              <th className="px-3 py-2 text-right">Spend</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Tạo</th>
              <th className="px-3 py-2 text-right">Adjust</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-[#5d544a]">
                  Không có user nào.
                </td>
              </tr>
            ) : (
              list.map((u) => (
                <tr key={u.id} className="border-t border-white/5">
                  <td className="px-3 py-2">
                    <div className="font-mono text-[0.78rem]">{u.email}</div>
                    <div className="text-[0.65rem] text-[#5d544a]">
                      {u.displayName ?? "—"} {u.isAdmin ? "· admin" : ""}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right">${(u.balance / 1_000_000).toFixed(4)}</td>
                  <td className="px-3 py-2 text-right text-[#9a9087]">
                    ${(u.lifetimeTopup / 1_000_000).toFixed(2)}
                  </td>
                  <td className="px-3 py-2 text-right text-[#9a9087]">
                    ${(u.lifetimeSpend / 1_000_000).toFixed(2)}
                  </td>
                  <td className="px-3 py-2">
                    <form action={toggleStatus} className="inline">
                      <input type="hidden" name="userId" value={u.id} />
                      <input type="hidden" name="status" value={u.status === "active" ? "suspended" : "active"} />
                      <button
                        className={
                          "rounded-full px-2 py-0.5 font-mono text-[0.6rem] uppercase tracking-[0.16em] " +
                          (u.status === "active"
                            ? "bg-[#45a85d]/15 text-[#dff8e4]"
                            : "bg-[#ef4444]/15 text-[#ef4444]")
                        }
                      >
                        {u.status}
                      </button>
                    </form>
                  </td>
                  <td className="px-3 py-2 text-[#9a9087]">
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString("vi-VN") : "-"}
                  </td>
                  <td className="px-3 py-2">
                    <form action={adjustBalance} className="flex items-center justify-end gap-1">
                      <input type="hidden" name="userId" value={u.id} />
                      <input
                        type="number"
                        name="usd"
                        step="0.01"
                        placeholder="$"
                        className="w-20 rounded border border-[#2a251f] bg-[#0c0a08] px-2 py-1 text-right text-xs"
                      />
                      <input
                        type="text"
                        name="note"
                        placeholder="ghi chú"
                        className="w-28 rounded border border-[#2a251f] bg-[#0c0a08] px-2 py-1 text-xs"
                      />
                      <button className="rounded border border-[#ef4444]/40 bg-[#ef4444]/10 px-2 py-1 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-[#f4eadc]">
                        Apply
                      </button>
                    </form>
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

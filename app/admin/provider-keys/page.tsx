import { desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin-config";
import { db } from "@/lib/pg/db";
import { providerKeys } from "@/lib/pg/schema";

export const metadata = { title: "Provider keys · Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

async function createKey(formData: FormData) {
  "use server";
  if (!(await isAdminEmail((await auth())?.user?.email ?? null))) return;
  const provider = String(formData.get("provider") ?? "aiyan").trim();
  const name = String(formData.get("name") ?? "").trim().slice(0, 120);
  const secret = String(formData.get("secret") ?? "").trim();
  const weight = Math.max(1, Math.min(1000, parseInt(String(formData.get("weight") ?? "100"), 10) || 100));
  if (!name || !secret) return;
  await db.insert(providerKeys).values({ provider, name, keyEncrypted: secret, weight });
  revalidatePath("/admin/provider-keys");
}

async function setStatus(formData: FormData) {
  "use server";
  if (!(await isAdminEmail((await auth())?.user?.email ?? null))) return;
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "active") as "active" | "cooling" | "disabled";
  if (!id) return;
  await db.update(providerKeys).set({ status, cooldownUntil: null, lastError: null }).where(eq(providerKeys.id, id));
  revalidatePath("/admin/provider-keys");
}

async function deleteKey(formData: FormData) {
  "use server";
  if (!(await isAdminEmail((await auth())?.user?.email ?? null))) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await db.delete(providerKeys).where(eq(providerKeys.id, id));
  revalidatePath("/admin/provider-keys");
}

export default async function ProviderKeysPage() {
  const list = await db
    .select({
      id: providerKeys.id,
      provider: providerKeys.provider,
      name: providerKeys.name,
      secret: providerKeys.keyEncrypted,
      weight: providerKeys.weight,
      status: providerKeys.status,
      cooldownUntil: providerKeys.cooldownUntil,
      lastUsedAt: providerKeys.lastUsedAt,
      lastError: providerKeys.lastError,
    })
    .from(providerKeys)
    .orderBy(desc(providerKeys.createdAt));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Provider keys</h1>
        <p className="mt-1 text-sm text-[#9a9087]">
          Quản lý key gateway dùng để gọi aiyan và provider tương lai. Gateway cooldown tự động khi 401/429/5xx.
        </p>
      </div>

      <form action={createKey} className="grid gap-3 rounded-xl border border-white/8 bg-[#0c0a08] p-4 sm:grid-cols-[140px_1fr_1fr_100px_auto]">
        <Field label="Provider" name="provider" defaultValue="aiyan" />
        <Field label="Tên" name="name" placeholder="aiyan-prod-01" />
        <Field label="Secret" name="secret" placeholder="sk-..." mono />
        <Field label="Weight" name="weight" type="number" defaultValue="100" />
        <button className="self-end rounded-lg bg-[#ef4444] px-4 py-2.5 font-mono text-xs uppercase tracking-[0.2em] text-[#090807] hover:bg-[#dc2626]">
          Thêm key
        </button>
      </form>

      <div className="overflow-hidden rounded-xl border border-white/8">
        <table className="w-full text-sm">
          <thead className="bg-[#120c09] text-[0.65rem] uppercase tracking-[0.16em] text-[#5d544a]">
            <tr>
              <th className="px-3 py-2 text-left">Tên</th>
              <th className="px-3 py-2 text-left">Provider</th>
              <th className="px-3 py-2 text-left">Secret</th>
              <th className="px-3 py-2 text-right">Weight</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Last used</th>
              <th className="px-3 py-2 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-[#5d544a]">
                  Chưa có provider key.
                </td>
              </tr>
            ) : (
              list.map((k) => (
                <tr key={k.id} className="border-t border-white/5">
                  <td className="px-3 py-2">{k.name}</td>
                  <td className="px-3 py-2 font-mono text-[0.78rem] text-[#dff8e4]">{k.provider}</td>
                  <td className="px-3 py-2 font-mono text-[0.7rem] text-[#9a9087]">
                    {k.secret.slice(0, 6)}…{k.secret.slice(-4)}
                  </td>
                  <td className="px-3 py-2 text-right">{k.weight}</td>
                  <td className="px-3 py-2">
                    <StatusPill status={k.status} cooldown={k.cooldownUntil} />
                    {k.lastError ? (
                      <div className="mt-0.5 truncate text-[0.6rem] text-[#ef4444]">{k.lastError.slice(0, 80)}</div>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-[#9a9087]">
                    {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString("vi-VN") : "—"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {k.status !== "active" ? (
                      <FormBtn action={setStatus} fields={{ id: k.id, status: "active" }} label="Activate" />
                    ) : (
                      <FormBtn action={setStatus} fields={{ id: k.id, status: "disabled" }} label="Disable" />
                    )}
                    <FormBtn action={deleteKey} fields={{ id: k.id }} label="Delete" danger />
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

function Field({
  label,
  name,
  type = "text",
  defaultValue,
  placeholder,
  mono,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  placeholder?: string;
  mono?: boolean;
}) {
  return (
    <label className="block">
      <span className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[#9a9087]">{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className={`mt-1 block w-full rounded-md border border-[#2a251f] bg-[#090807] px-3 py-2 text-sm text-[#f4eadc] outline-none focus:border-[#ef4444]/60 ${mono ? "font-mono" : ""}`}
      />
    </label>
  );
}

function FormBtn({
  action,
  fields,
  label,
  danger,
}: {
  action: (fd: FormData) => void | Promise<void>;
  fields: Record<string, string>;
  label: string;
  danger?: boolean;
}) {
  return (
    <form action={action} className="ml-1 inline">
      {Object.entries(fields).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <button
        className={`rounded border px-2 py-1 font-mono text-[0.6rem] uppercase tracking-[0.16em] ${
          danger
            ? "border-[#ef4444]/30 text-[#ef4444] hover:bg-[#ef4444]/10"
            : "border-white/10 text-[#9a9087] hover:border-white/30"
        }`}
      >
        {label}
      </button>
    </form>
  );
}

function StatusPill({ status, cooldown }: { status: string; cooldown: Date | null }) {
  const styles: Record<string, string> = {
    active: "bg-[#45a85d]/15 text-[#dff8e4]",
    cooling: "bg-[#d6a548]/15 text-[#d6a548]",
    disabled: "bg-white/5 text-[#9a9087]",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 font-mono text-[0.6rem] uppercase tracking-[0.16em] ${styles[status]}`}>
      {status}
      {cooldown && cooldown > new Date()
        ? ` · until ${cooldown.toLocaleTimeString("vi-VN")}`
        : ""}
    </span>
  );
}

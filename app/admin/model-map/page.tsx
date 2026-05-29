import { desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin-config";
import { db } from "@/lib/pg/db";
import { modelMap } from "@/lib/pg/schema";
import { EditButton, ToggleEnabled } from "@/components/admin/ModelMapClient";

export const metadata = { title: "Model map · Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

async function upsertModel(formData: FormData) {
  "use server";
  if (!(await isAdminEmail((await auth())?.user?.email ?? null))) return;

  const id = String(formData.get("id") ?? "");
  const publicName = String(formData.get("publicName") ?? "").trim();
  const provider = String(formData.get("provider") ?? "aiyan").trim();
  const providerModel = String(formData.get("providerModel") ?? publicName).trim();
  const inputCost = Number(formData.get("inputCost") ?? 0);
  const outputCost = Number(formData.get("outputCost") ?? 0);
  const markup = Math.max(1, Number(formData.get("markup") ?? 1.2));
  const enabled = formData.get("enabled") === "on";
  if (!publicName) return;

  if (id) {
    await db
      .update(modelMap)
      .set({
        publicName,
        provider,
        providerModel,
        inputCostPerMtok: String(inputCost),
        outputCostPerMtok: String(outputCost),
        markup: String(markup),
        enabled,
      })
      .where(eq(modelMap.id, id));
  } else {
    await db.insert(modelMap).values({
      publicName,
      provider,
      providerModel,
      inputCostPerMtok: String(inputCost),
      outputCostPerMtok: String(outputCost),
      markup: String(markup),
      enabled,
    });
  }
  revalidatePath("/admin/model-map");
}

async function deleteModel(formData: FormData) {
  "use server";
  if (!(await isAdminEmail((await auth())?.user?.email ?? null))) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await db.delete(modelMap).where(eq(modelMap.id, id));
  revalidatePath("/admin/model-map");
}

export default async function ModelMapPage() {
  const list = await db.select().from(modelMap).orderBy(desc(modelMap.createdAt));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Model map</h1>
        <p className="mt-1 text-sm text-[#9a9087]">
          Map tên public (user thấy) → tên thật của provider, kèm pricing per-million-token và markup.
        </p>
      </div>

      <form id="model-upsert" action={upsertModel} className="grid gap-3 rounded-xl border border-white/8 bg-[#0c0a08] p-4 sm:grid-cols-7">
        <Field label="Public name" name="publicName" placeholder="gpt-5.4" />
        <Field label="Provider" name="provider" defaultValue="aiyan" />
        <Field label="Provider model" name="providerModel" placeholder="gpt-5.4" />
        <Field label="Input $/MTok" name="inputCost" type="number" step="0.0001" defaultValue="0" />
        <Field label="Output $/MTok" name="outputCost" type="number" step="0.0001" defaultValue="0" />
        <Field label="Markup" name="markup" type="number" step="0.01" defaultValue="1.20" />
        <label className="flex items-end gap-2 pb-1">
          <input type="checkbox" name="enabled" defaultChecked className="size-4" />
          <span className="font-mono text-[0.6rem] uppercase tracking-[0.16em] text-[#dff8e4]">Enabled</span>
        </label>
        <button className="col-span-7 rounded-lg bg-[#ef4444] px-4 py-2.5 font-mono text-xs uppercase tracking-[0.2em] text-[#090807] hover:bg-[#dc2626]">
          Thêm / cập nhật model
        </button>
      </form>

      <div className="overflow-hidden rounded-xl border border-white/8">
        <table className="w-full text-sm">
          <thead className="bg-[#120c09] text-[0.65rem] uppercase tracking-[0.16em] text-[#5d544a]">
            <tr>
              <th className="px-3 py-2 text-left">Public name</th>
              <th className="px-3 py-2 text-left">Provider</th>
              <th className="px-3 py-2 text-left">Provider model</th>
              <th className="px-3 py-2 text-right">In $/MTok</th>
              <th className="px-3 py-2 text-right">Out $/MTok</th>
              <th className="px-3 py-2 text-right">Markup</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-[#5d544a]">
                  Chưa có model — gateway sẽ auto pass-through model name từ user request.
                </td>
              </tr>
            ) : (
              list.map((m) => (
                <tr key={m.id} className="border-t border-white/5">
                  <td className="px-3 py-2 font-mono">{m.publicName}</td>
                  <td className="px-3 py-2 font-mono text-[0.78rem] text-[#dff8e4]">{m.provider}</td>
                  <td className="px-3 py-2 font-mono text-[0.78rem] text-[#9a9087]">{m.providerModel}</td>
                  <td className="px-3 py-2 text-right">{Number(m.inputCostPerMtok).toFixed(4)}</td>
                  <td className="px-3 py-2 text-right">{Number(m.outputCostPerMtok).toFixed(4)}</td>
                  <td className="px-3 py-2 text-right">{Number(m.markup).toFixed(3)}×</td>
                  <td className="px-3 py-2">
                    <ToggleEnabled id={m.id} enabled={m.enabled} />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex justify-end gap-2">
                      <EditButton
                        model={{
                          id: m.id,
                          publicName: m.publicName,
                          provider: m.provider,
                          providerModel: m.providerModel,
                          inputCostPerMtok: String(m.inputCostPerMtok),
                          outputCostPerMtok: String(m.outputCostPerMtok),
                          markup: String(m.markup),
                          enabled: m.enabled,
                        }}
                      />
                      <form action={deleteModel} className="inline">
                        <input type="hidden" name="id" value={m.id} />
                        <button className="rounded border border-[#ef4444]/30 px-2 py-1 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-[#ef4444] hover:bg-[#ef4444]/10">
                          Xoá
                        </button>
                      </form>
                    </div>
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
  step,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  placeholder?: string;
  step?: string;
}) {
  return (
    <label className="block">
      <span className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[#9a9087]">{label}</span>
      <input
        name={name}
        type={type}
        step={step}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="mt-1 block w-full rounded-md border border-[#2a251f] bg-[#090807] px-3 py-2 text-sm text-[#f4eadc] outline-none focus:border-[#ef4444]/60"
      />
    </label>
  );
}

"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

type Model = {
  id: string;
  publicName: string;
  provider: string;
  providerModel: string;
  inputCostPerMtok: string;
  outputCostPerMtok: string;
  markup: string;
  enabled: boolean;
};

export function ToggleEnabled({ id, enabled }: { id: string; enabled: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  async function onToggle() {
    const res = await fetch(`/api/admin/model-map/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !enabled }),
    });
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      alert(b.error ?? `HTTP ${res.status}`);
      return;
    }
    startTransition(() => router.refresh());
  }
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={pending}
      className={
        "rounded-full px-2 py-0.5 font-mono text-[0.6rem] uppercase tracking-[0.16em] transition disabled:opacity-50 " +
        (enabled
          ? "bg-[#45a85d]/15 text-[#dff8e4] hover:bg-[#45a85d]/25"
          : "bg-white/5 text-[#9a9087] hover:bg-white/10")
      }
    >
      {enabled ? "enabled" : "disabled"}
    </button>
  );
}

export function EditButton({ model }: { model: Model }) {
  function onEdit() {
    const form = document.getElementById("model-upsert") as HTMLFormElement | null;
    if (!form) return;
    const set = (name: string, val: string) => {
      const el = form.elements.namedItem(name) as HTMLInputElement | null;
      if (el) el.value = val;
    };
    set("publicName", model.publicName);
    set("provider", model.provider);
    set("providerModel", model.providerModel);
    set("inputCost", String(Number(model.inputCostPerMtok)));
    set("outputCost", String(Number(model.outputCostPerMtok)));
    set("markup", String(Number(model.markup)));
    const cb = form.elements.namedItem("enabled") as HTMLInputElement | null;
    if (cb) cb.checked = model.enabled;
    form.scrollIntoView({ behavior: "smooth", block: "center" });
  }
  return (
    <button
      type="button"
      onClick={onEdit}
      className="rounded border border-[#d6a548]/40 px-2 py-1 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-[#d6a548] hover:bg-[#d6a548]/10"
    >
      Sửa
    </button>
  );
}

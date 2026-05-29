"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

export function LocaleSwitcher({ current }: { current: "vi" | "en" }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  async function set(loc: "vi" | "en") {
    if (loc === current) return;
    await fetch("/api/locale", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale: loc }),
    });
    start(() => router.refresh());
  }

  return (
    <div className="flex items-center gap-1 rounded-md border border-white/8 px-1 py-0.5 font-mono text-[0.6rem] uppercase tracking-[0.16em]">
      <button
        type="button"
        onClick={() => set("vi")}
        disabled={pending}
        className={
          "rounded px-1.5 py-0.5 transition " +
          (current === "vi" ? "bg-[#ef4444]/20 text-[#f4eadc]" : "text-[#9a9087] hover:text-[#f4eadc]")
        }
      >
        VI
      </button>
      <button
        type="button"
        onClick={() => set("en")}
        disabled={pending}
        className={
          "rounded px-1.5 py-0.5 transition " +
          (current === "en" ? "bg-[#ef4444]/20 text-[#f4eadc]" : "text-[#9a9087] hover:text-[#f4eadc]")
        }
      >
        EN
      </button>
    </div>
  );
}

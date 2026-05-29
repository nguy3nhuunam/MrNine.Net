"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function AllowedModelsButton({
  id,
  current,
}: {
  id: string;
  current: string[] | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [available, setAvailable] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[] | null>(current);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open || available.length > 0) return;
    fetch("/api/models/available")
      .then((r) => r.json())
      .then((d) => setAvailable(d.models ?? []))
      .catch(() => setAvailable([]));
  }, [open, available.length]);

  async function save() {
    setErr(null);
    setBusy(true);
    const res = await fetch(`/api/keys/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ allowedModels: selected }),
    });
    setBusy(false);
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      setErr(b.error ?? `HTTP ${res.status}`);
      return;
    }
    setOpen(false);
    startTransition(() => router.refresh());
  }

  function toggle(name: string) {
    if (selected === null) {
      setSelected(available.filter((m) => m !== name));
      return;
    }
    setSelected(
      selected.includes(name) ? selected.filter((m) => m !== name) : [...selected, name],
    );
  }

  const label =
    current === null
      ? "All models"
      : current.length === 0
        ? "0 models"
        : `${current.length} model${current.length === 1 ? "" : "s"}`;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setSelected(current);
          setOpen(true);
        }}
        className="rounded-md border border-white/10 px-2 py-1 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-[#9a9087] hover:border-white/30"
      >
        {label}
      </button>

      {open ? (
        <div
          role="dialog"
          aria-modal
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-white/10 bg-[#0c0a08] p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-mono uppercase tracking-[0.2em] text-[#dff8e4]">
              Models cho phép
            </h3>
            <p className="mt-1 text-xs text-[#9a9087]">
              Bỏ chọn tất cả = chặn key dùng mọi model. Để "All models" nghĩa là không giới hạn.
            </p>

            <label className="mt-4 flex items-center gap-2 rounded-md border border-white/10 px-3 py-2">
              <input
                type="checkbox"
                checked={selected === null}
                onChange={(e) => setSelected(e.target.checked ? null : [])}
              />
              <span className="font-mono text-xs uppercase tracking-wider text-[#dff8e4]">
                Cho phép tất cả models
              </span>
            </label>

            <div className="mt-3 max-h-72 space-y-1 overflow-y-auto rounded-md border border-white/8 p-2">
              {available.length === 0 ? (
                <p className="px-2 py-2 font-mono text-xs text-[#5d544a]">Đang tải hoặc chưa có model.</p>
              ) : (
                available.map((m) => {
                  const checked = selected === null ? true : selected.includes(m);
                  return (
                    <label
                      key={m}
                      className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-white/5"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={selected === null}
                        onChange={() => toggle(m)}
                      />
                      <span className="font-mono text-sm">{m}</span>
                    </label>
                  );
                })
              )}
            </div>

            {err ? <p className="mt-2 font-mono text-xs text-[#ef4444]">{err}</p> : null}

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md border border-white/10 px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-[#9a9087]"
              >
                Huỷ
              </button>
              <button
                type="button"
                onClick={save}
                disabled={busy || pending}
                className="rounded-md border border-[#45a85d]/40 bg-[#45a85d]/15 px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-[#dff8e4] disabled:opacity-50"
              >
                {busy ? "..." : "Lưu"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

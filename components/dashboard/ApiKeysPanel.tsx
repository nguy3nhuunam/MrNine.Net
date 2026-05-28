"use client";

import { useState } from "react";

type Row = {
  id: string;
  name: string;
  keyPrefix: string;
  status: "active" | "disabled" | "revoked";
  createdAt: string | null;
  lastUsedAt: string | null;
};

export function ApiKeysPanel({
  keys,
  newKeyPlaintext,
  createKey,
  disableKey,
  revokeKey,
}: {
  keys: Row[];
  newKeyPlaintext: string | null;
  createKey: (formData: FormData) => void | Promise<void>;
  disableKey: (formData: FormData) => void | Promise<void>;
  revokeKey: (formData: FormData) => void | Promise<void>;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">API keys</h1>
        <p className="mt-1 text-sm text-[#9a9087]">
          Dùng key này với <code className="text-[#dff8e4]">https://api.mrnine.net/v1</code>. Plaintext chỉ hiện 1 lần khi tạo.
        </p>
      </div>

      {newKeyPlaintext ? (
        <div className="rounded-xl border border-[#45a85d]/30 bg-[#45a85d]/5 p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-[#dff8e4]">
                Key mới — sao chép ngay, không xem lại được
              </p>
              <code className="mt-2 block break-all rounded bg-[#0c0a08] px-3 py-2 text-sm text-[#f4eadc]">
                {newKeyPlaintext}
              </code>
            </div>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(newKeyPlaintext);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="rounded-md border border-[#45a85d]/40 bg-[#45a85d]/10 px-3 py-2 font-mono text-xs uppercase tracking-[0.16em] text-[#dff8e4]"
            >
              {copied ? "Đã chép" : "Sao chép"}
            </button>
          </div>
        </div>
      ) : null}

      <form action={createKey} className="flex items-end gap-3 rounded-xl border border-white/8 bg-[#0c0a08] p-4">
        <label className="block flex-1">
          <span className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-[#9a9087]">Tên key</span>
          <input
            name="name"
            placeholder="Ví dụ: codex-laptop, production-bot"
            className="mt-1 block w-full rounded-md border border-[#2a251f] bg-[#090807] px-3 py-2.5 text-sm text-[#f4eadc] outline-none focus:border-[#ef4444]/60"
          />
        </label>
        <button
          type="submit"
          className="rounded-lg bg-[#ef4444] px-4 py-2.5 font-mono text-xs uppercase tracking-[0.2em] text-[#090807] hover:bg-[#dc2626]"
        >
          Tạo key
        </button>
      </form>

      <div className="overflow-hidden rounded-xl border border-white/8">
        <table className="w-full text-sm">
          <thead className="bg-[#120c09] text-[0.65rem] uppercase tracking-[0.16em] text-[#5d544a]">
            <tr>
              <th className="px-3 py-2 text-left">Tên</th>
              <th className="px-3 py-2 text-left">Prefix</th>
              <th className="px-3 py-2 text-left">Tạo</th>
              <th className="px-3 py-2 text-left">Lần dùng cuối</th>
              <th className="px-3 py-2 text-left">Trạng thái</th>
              <th className="px-3 py-2 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {keys.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-[#5d544a]">
                  Chưa có key. Tạo key đầu tiên ở trên.
                </td>
              </tr>
            ) : (
              keys.map((k) => (
                <tr key={k.id} className="border-t border-white/5">
                  <td className="px-3 py-2">{k.name}</td>
                  <td className="px-3 py-2 font-mono text-[0.78rem] text-[#dff8e4]">{k.keyPrefix}</td>
                  <td className="px-3 py-2 text-[#9a9087]">
                    {k.createdAt ? new Date(k.createdAt).toLocaleDateString("vi-VN") : "-"}
                  </td>
                  <td className="px-3 py-2 text-[#9a9087]">
                    {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString("vi-VN") : "—"}
                  </td>
                  <td className="px-3 py-2">
                    <StatusBadge status={k.status} />
                  </td>
                  <td className="px-3 py-2 text-right">
                    {k.status === "active" ? (
                      <form action={disableKey} className="inline">
                        <input type="hidden" name="id" value={k.id} />
                        <button className="rounded-md border border-white/10 px-2 py-1 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-[#9a9087] hover:border-white/30">
                          Disable
                        </button>
                      </form>
                    ) : null}
                    <form action={revokeKey} className="ml-2 inline">
                      <input type="hidden" name="id" value={k.id} />
                      <button className="rounded-md border border-[#ef4444]/30 px-2 py-1 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-[#ef4444] hover:bg-[#ef4444]/10">
                        Revoke
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

function StatusBadge({ status }: { status: Row["status"] }) {
  const styles = {
    active: "bg-[#45a85d]/15 text-[#dff8e4]",
    disabled: "bg-white/5 text-[#9a9087]",
    revoked: "bg-[#ef4444]/15 text-[#ef4444]",
  } as const;
  return (
    <span className={`rounded-full px-2 py-0.5 font-mono text-[0.6rem] uppercase tracking-[0.16em] ${styles[status]}`}>
      {status}
    </span>
  );
}

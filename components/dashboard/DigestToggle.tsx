"use client";

import { useState, useTransition } from "react";

export function DigestToggle({ initial }: { initial: boolean }) {
  const [enabled, setEnabled] = useState(initial);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  async function onToggle() {
    const next = !enabled;
    setEnabled(next);
    setMsg(null);
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ digestEnabled: next }),
    });
    if (!res.ok) {
      setEnabled(!next);
      setMsg("Lỗi khi cập nhật.");
      return;
    }
    setMsg(next ? "Đã bật báo cáo hằng ngày." : "Đã tắt báo cáo hằng ngày.");
  }

  return (
    <div className="space-y-2">
      <label className="flex cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          checked={enabled}
          onChange={onToggle}
          disabled={pending}
          className="size-4"
        />
        <span className="text-sm text-[#f4eadc]">
          Nhận email báo cáo hằng ngày (~9 giờ sáng theo giờ VN)
        </span>
      </label>
      {msg ? <p className="font-mono text-xs text-[#dff8e4]">{msg}</p> : null}
    </div>
  );
}

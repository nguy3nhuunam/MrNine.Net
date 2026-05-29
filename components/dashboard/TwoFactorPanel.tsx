"use client";

import { useState } from "react";

export function TwoFactorPanel({ enabled }: { enabled: boolean }) {
  const [busy, setBusy] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [recovery, setRecovery] = useState<string[] | null>(null);
  const [token, setToken] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [active, setActive] = useState(enabled);

  async function onSetup() {
    setBusy(true);
    setErr(null);
    const res = await fetch("/api/settings/2fa/setup", { method: "POST" });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setErr(body.error ?? `HTTP ${res.status}`);
      return;
    }
    setQr(body.qr_data_url);
    setSecret(body.secret);
    setRecovery(body.recovery_codes);
  }

  async function onEnable() {
    setBusy(true);
    setErr(null);
    const res = await fetch("/api/settings/2fa/enable", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setErr(body.error ?? `HTTP ${res.status}`);
      return;
    }
    setActive(true);
    setQr(null);
    setSecret(null);
    setToken("");
  }

  async function onDisable() {
    const code = prompt("Nhập 6 số TOTP hoặc recovery code để xác nhận tắt 2FA");
    if (!code) return;
    setBusy(true);
    const res = await fetch("/api/settings/2fa/disable", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        /\d{6}/.test(code) ? { token: code } : { recoveryCode: code },
      ),
    });
    setBusy(false);
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(body.error ?? `HTTP ${res.status}`);
      return;
    }
    setActive(false);
    setRecovery(null);
  }

  if (active) {
    return (
      <div className="space-y-3">
        <p className="font-mono text-xs text-[#dff8e4]">✅ 2FA đang bật.</p>
        <button
          type="button"
          onClick={onDisable}
          disabled={busy}
          className="rounded-md border border-[#ef4444]/40 bg-[#ef4444]/10 px-3 py-2 font-mono text-xs uppercase tracking-wider text-[#ef4444] disabled:opacity-50"
        >
          Tắt 2FA
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {!qr ? (
        <button
          type="button"
          onClick={onSetup}
          disabled={busy}
          className="rounded-md border border-[#4f8ef7]/40 bg-[#4f8ef7]/15 px-4 py-2 font-mono text-xs uppercase tracking-wider text-[#dff8e4] disabled:opacity-50"
        >
          {busy ? "..." : "Bật 2FA — sinh QR"}
        </button>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-col items-start gap-3 sm:flex-row">
            <img src={qr} alt="TOTP QR" className="h-48 w-48 rounded-md border border-white/10 bg-white p-1" />
            <div className="text-xs text-[#9a9087]">
              <p>1. Quét QR bằng Google Authenticator / Authy / 1Password.</p>
              <p>2. Hoặc nhập secret thủ công:</p>
              <code className="mt-1 block break-all rounded bg-[#0c0a08] px-2 py-1 font-mono text-[0.7rem] text-[#dff8e4]">
                {secret}
              </code>
            </div>
          </div>

          {recovery ? (
            <div className="rounded-md border border-[#d6a548]/30 bg-[#d6a548]/5 p-3">
              <p className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-[#d6a548]">
                Recovery codes — sao chép, lưu offline. Mỗi code dùng 1 lần.
              </p>
              <pre className="mt-2 font-mono text-xs text-[#f4eadc]">{recovery.join("\n")}</pre>
            </div>
          ) : null}

          <div>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="6-digit code"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="w-32 rounded-md border border-[#2a251f] bg-[#090807] px-3 py-2 font-mono text-sm tracking-widest text-[#f4eadc] outline-none focus:border-[#45a85d]/60"
            />
            <button
              type="button"
              onClick={onEnable}
              disabled={busy || token.length < 6}
              className="ml-2 rounded-md border border-[#45a85d]/40 bg-[#45a85d]/15 px-4 py-2 font-mono text-xs uppercase tracking-wider text-[#dff8e4] disabled:opacity-50"
            >
              Verify & enable
            </button>
          </div>
        </div>
      )}
      {err ? <p className="font-mono text-xs text-[#ef4444]">{err}</p> : null}
    </div>
  );
}

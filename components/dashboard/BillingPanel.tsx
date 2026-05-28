"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useTransition } from "react";

type Props = {
  initialBalanceMicroUsd: number;
  bankAccount: string;
  bankName: string;
  vndRate: number;
  minVnd: number;
  createIntent: (formData: FormData) => Promise<{ ref: string; qrUrl: string; vnd: number } | { error: string }>;
};

const PRESETS = [50_000, 100_000, 200_000, 500_000, 1_000_000];

export function BillingPanel({
  initialBalanceMicroUsd,
  bankAccount,
  bankName,
  vndRate,
  minVnd,
  createIntent,
}: Props) {
  const [vnd, setVnd] = useState<number>(100_000);
  const [intent, setIntent] = useState<{ ref: string; qrUrl: string; vnd: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (vnd < minVnd) {
      setError(`Tối thiểu ${formatVnd(minVnd)}`);
      return;
    }
    startTransition(async () => {
      const fd = new FormData();
      fd.set("amountVnd", String(vnd));
      const res = await createIntent(fd);
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setIntent(res);
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
      <div className="rounded-xl border border-white/8 bg-[#0c0a08] p-5">
        <div className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-[#5d544a]">Số dư hiện tại</div>
        <div className="mt-1 text-3xl font-semibold">${(initialBalanceMicroUsd / 1_000_000).toFixed(4)}</div>
        <p className="mt-1 text-sm text-[#9a9087]">
          ≈ {formatVnd(Math.round((initialBalanceMicroUsd / 1_000_000) * vndRate))} (tỷ giá tham chiếu{" "}
          {vndRate.toLocaleString("vi-VN")} VND/USD)
        </p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <span className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-[#9a9087]">Chọn nhanh</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button
                  type="button"
                  key={p}
                  onClick={() => setVnd(p)}
                  className={
                    "rounded-md border px-3 py-1.5 font-mono text-[0.7rem] uppercase tracking-[0.16em] " +
                    (vnd === p
                      ? "border-[#ef4444]/50 bg-[#ef4444]/10 text-[#f4eadc]"
                      : "border-white/10 text-[#9a9087] hover:border-white/30")
                  }
                >
                  {formatVnd(p)}
                </button>
              ))}
            </div>
          </div>
          <label className="block">
            <span className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-[#9a9087]">Số tiền (VND)</span>
            <input
              type="number"
              min={minVnd}
              step={10_000}
              value={vnd}
              onChange={(e) => setVnd(Number(e.target.value))}
              className="mt-1 block w-full rounded-md border border-[#2a251f] bg-[#090807] px-3 py-2.5 text-sm text-[#f4eadc] outline-none focus:border-[#ef4444]/60"
            />
            <span className="mt-1 block text-xs text-[#5d544a]">
              ≈ ${(vnd / vndRate).toFixed(4)}, tối thiểu {formatVnd(minVnd)}
            </span>
          </label>
          {error ? <p className="text-sm text-[#ef4444]">{error}</p> : null}
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-[#ef4444] px-4 py-3 font-mono text-xs uppercase tracking-[0.24em] text-[#090807] hover:bg-[#dc2626] disabled:opacity-60"
          >
            {pending ? "Đang tạo QR..." : "Tạo mã QR thanh toán"}
          </button>
        </form>
      </div>

      <div className="rounded-xl border border-white/8 bg-[#0c0a08] p-5">
        <h3 className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-[#9a9087]">Hướng dẫn</h3>
        {intent ? <PaymentIntent intent={intent} bankAccount={bankAccount} bankName={bankName} /> : (
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-[#c8bdaf]">
            <li>Chọn số tiền và bấm <span className="text-[#f4eadc]">Tạo mã QR</span>.</li>
            <li>Mở app ngân hàng → quét QR (đã có sẵn nội dung).</li>
            <li>Số dư cập nhật trong vài giây sau khi giao dịch hoàn tất.</li>
            <li>Nếu lâu hơn 5 phút, chụp biên lai và liên hệ admin.</li>
          </ol>
        )}
      </div>
    </div>
  );
}

function PaymentIntent({
  intent,
  bankAccount,
  bankName,
}: {
  intent: { ref: string; qrUrl: string; vnd: number };
  bankAccount: string;
  bankName: string;
}) {
  const balanceCheckRef = useRef<number | null>(null);
  const [polling, setPolling] = useState(true);

  // Reload page mỗi 5s để lấy balance mới (server component sẽ fetch lại).
  useEffect(() => {
    if (!polling) return;
    const t = window.setInterval(() => window.location.reload(), 6000);
    balanceCheckRef.current = t;
    return () => window.clearInterval(t);
  }, [polling]);

  return (
    <div className="mt-3 space-y-3 text-sm">
      <p className="text-[#dff8e4]">Quét QR bên dưới — mã đã có nội dung tự động.</p>
      <div className="rounded-md bg-white p-2">
        <Image src={intent.qrUrl} alt="VietQR" width={320} height={420} unoptimized />
      </div>
      <div className="rounded-md bg-[#120c09] p-3 text-xs">
        <Row label="Ngân hàng" value={bankName} />
        <Row label="Số tài khoản" value={bankAccount} mono />
        <Row label="Số tiền" value={formatVnd(intent.vnd)} />
        <Row label="Nội dung CK" value={intent.ref} mono highlight />
      </div>
      <p className="text-[0.7rem] text-[#5d544a]">
        Mã <code className="text-[#f4eadc]">{intent.ref}</code> giúp chúng tôi nhận diện giao dịch của bạn — đừng sửa.
      </p>
      <button
        type="button"
        onClick={() => setPolling((p) => !p)}
        className="w-full rounded-md border border-white/10 px-3 py-2 font-mono text-[0.65rem] uppercase tracking-[0.16em] text-[#9a9087] hover:border-white/30"
      >
        {polling ? "Tạm dừng auto-refresh" : "Bật auto-refresh"}
      </button>
    </div>
  );
}

function Row({ label, value, mono, highlight }: { label: string; value: string; mono?: boolean; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <span className="text-[#9a9087]">{label}</span>
      <span className={`${mono ? "font-mono" : ""} ${highlight ? "text-[#dff8e4]" : "text-[#f4eadc]"}`}>{value}</span>
    </div>
  );
}

function formatVnd(n: number): string {
  return new Intl.NumberFormat("vi-VN").format(n) + "đ";
}

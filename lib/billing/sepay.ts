/**
 * SePay VietQR helpers.
 *
 * Flow:
 *   1. User chọn số tiền (VND, ≥ 50k).
 *   2. Tạo Transaction (status=pending) với providerRef = code unique (vd MR-{uuid8}).
 *   3. Render QR code gồm: STK, ngân hàng, số tiền, content = providerRef.
 *   4. SePay phát hiện chuyển khoản → POST webhook `/api/billing/sepay/webhook`.
 *   5. Webhook tìm Transaction theo providerRef trong content, idempotent credit.
 */
import { randomBytes } from "node:crypto";

const VND_RATE = parseInt(process.env.USD_VND_RATE ?? "25500", 10);
const MIN_VND = parseInt(process.env.MIN_TOPUP_VND ?? "50000", 10);

export function vndToMicroUsd(vnd: number): number {
  return Math.round((vnd / VND_RATE) * 1_000_000);
}

export function microUsdToVnd(micro: number): number {
  return Math.round((micro / 1_000_000) * VND_RATE);
}

export function vndRate(): number {
  return VND_RATE;
}

export function minTopupVnd(): number {
  return MIN_VND;
}

/** MR-XXXXXXXX (8 hex chars) — ngắn để bỏ vào nội dung chuyển khoản. */
export function newProviderRef(): string {
  return "MR-" + randomBytes(4).toString("hex").toUpperCase();
}

export function bankAccount(): { account: string; bank: string } {
  return {
    account: process.env.SEPAY_BANK_ACCOUNT ?? "",
    bank: process.env.SEPAY_BANK_NAME ?? "",
  };
}

/**
 * SePay QR URL — dùng SePay free QR builder.
 * https://qr.sepay.vn/img?acc=...&bank=...&amount=...&des=...&template=compact
 */
export function buildSepayQr(opts: { amount: number; ref: string }): string {
  const { account, bank } = bankAccount();
  const params = new URLSearchParams({
    acc: account,
    bank,
    amount: String(opts.amount),
    des: opts.ref,
    template: "compact",
  });
  return `https://qr.sepay.vn/img?${params.toString()}`;
}

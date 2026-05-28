/**
 * VietQR helpers — SePay webhook flow.
 *
 * Flow:
 *   1. User chọn số tiền VND.
 *   2. Tạo Transaction (status=pending) với providerRef = MR-XXXXXXXX.
 *   3. Render QR code chứa STK + bank + amount + content = providerRef.
 *   4. User chuyển khoản qua app banking.
 *   5. SePay phát hiện chuyển khoản trong vài giây.
 *   6. SePay POST `/api/billing/sepay/webhook` → idempotent credit.
 *
 * Đăng ký SePay tại https://sepay.vn (free 100 webhook/ngày).
 *
 * QR builder dùng URL public của img.vietqr.io (free, không cần API key).
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

export function bankAccount(): { account: string; bank: string; holder: string } {
  return {
    account: process.env.BANK_ACCOUNT_NUMBER ?? process.env.SEPAY_BANK_ACCOUNT ?? "",
    bank: process.env.BANK_NAME ?? process.env.SEPAY_BANK_NAME ?? "MBBank",
    holder: process.env.BANK_ACCOUNT_HOLDER ?? "",
  };
}

/**
 * VietQR image URL — img.vietqr.io free, không cần API key.
 * https://img.vietqr.io/image/<bank>-<account>-compact2.png?amount=...&addInfo=...
 *
 * Bank slug: MB / VCB / TCB / ACB / TPB / STB / BIDV / VPB ...
 * (xem https://api.vietqr.io/v2/banks)
 */
export function buildQrUrl(opts: { amount: number; ref: string }): string {
  const { account, bank, holder } = bankAccount();
  const bankSlug = normalizeBankSlug(bank);
  const params = new URLSearchParams({
    amount: String(opts.amount),
    addInfo: opts.ref,
    accountName: holder,
  });
  return `https://img.vietqr.io/image/${bankSlug}-${account}-compact2.png?${params.toString()}`;
}

function normalizeBankSlug(name: string): string {
  const s = name.toLowerCase().replace(/\s+/g, "");
  if (s.includes("mb")) return "MB";
  if (s.includes("vietcom") || s === "vcb") return "VCB";
  if (s.includes("tech") || s === "tcb") return "TCB";
  if (s === "acb") return "ACB";
  if (s === "tpb" || s.includes("tpbank")) return "TPB";
  if (s === "stb" || s.includes("sacom")) return "STB";
  if (s.includes("vp") || s === "vpb") return "VPB";
  if (s.includes("bidv")) return "BIDV";
  return name.toUpperCase();
}

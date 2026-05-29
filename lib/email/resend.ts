/**
 * Resend email helper — gửi mail giao dịch từ MrNine Gateway.
 *
 * ENV:
 *   RESEND_API_KEY        — API key (re_...)
 *   RESEND_FROM           — "MrNine <noreply@mrnine.net>"
 *   APP_URL               — https://mrnine.net (cho link trong email)
 *
 * Nếu thiếu RESEND_API_KEY → return ok:false silent, không throw (dev mode).
 */
type SendArgs = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export async function sendMail({ to, subject, html, text }: SendArgs): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM ?? "MrNine <noreply@mrnine.net>";
  if (!apiKey) {
    console.warn("[email] RESEND_API_KEY missing — skip", { to, subject });
    return { ok: false, error: "no_api_key" };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, html, text }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("[email] resend failed", res.status, body);
    return { ok: false, error: `${res.status} ${body.slice(0, 200)}` };
  }
  return { ok: true };
}

const APP_URL = process.env.APP_URL ?? "https://mrnine.net";

function fmtUsd(micro: number): string {
  return `$${(micro / 1_000_000).toFixed(4)}`;
}

function fmtVnd(vnd: number): string {
  return `${vnd.toLocaleString("vi-VN")}đ`;
}

export function topupEmail(opts: {
  email: string;
  amountVnd: number;
  amountMicroUsd: number;
  newBalanceMicroUsd: number;
  providerRef: string;
}): SendArgs {
  const { amountVnd, amountMicroUsd, newBalanceMicroUsd, providerRef } = opts;
  const subject = `MrNine — Đã nạp ${fmtVnd(amountVnd)} thành công`;
  const text = [
    `Xin chào,`,
    ``,
    `Giao dịch ${providerRef} đã được ghi nhận:`,
    `  Số tiền: ${fmtVnd(amountVnd)} (= ${fmtUsd(amountMicroUsd)})`,
    `  Số dư mới: ${fmtUsd(newBalanceMicroUsd)}`,
    ``,
    `Quản lý API key tại: ${APP_URL}/dashboard`,
    ``,
    `— MrNine Gateway`,
  ].join("\n");
  const html = `<!doctype html><html><body style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;background:#f5f5f7;padding:24px;color:#111">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;border:1px solid #e5e7eb">
  <h1 style="margin:0 0 8px;font-size:20px">Đã nạp thành công</h1>
  <p style="margin:0 0 24px;color:#6b7280">Giao dịch <code style="background:#f3f4f6;padding:2px 6px;border-radius:4px">${providerRef}</code></p>
  <table style="width:100%;border-collapse:collapse;font-size:14px">
    <tr><td style="padding:8px 0;color:#6b7280">Số tiền nạp</td><td style="text-align:right;font-weight:600">${fmtVnd(amountVnd)}</td></tr>
    <tr><td style="padding:8px 0;color:#6b7280">Quy đổi</td><td style="text-align:right">${fmtUsd(amountMicroUsd)}</td></tr>
    <tr><td style="padding:8px 0;color:#6b7280;border-top:1px solid #e5e7eb">Số dư mới</td><td style="text-align:right;font-weight:700;border-top:1px solid #e5e7eb">${fmtUsd(newBalanceMicroUsd)}</td></tr>
  </table>
  <a href="${APP_URL}/dashboard" style="display:inline-block;margin-top:24px;background:#111;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-size:14px">Mở dashboard</a>
</div>
<p style="text-align:center;color:#9ca3af;font-size:12px;margin-top:16px">MrNine Gateway · ${APP_URL}</p>
</body></html>`;
  return { to: opts.email, subject, html, text };
}

export function lowBalanceEmail(opts: {
  email: string;
  balanceMicroUsd: number;
  thresholdMicroUsd: number;
}): SendArgs {
  const { balanceMicroUsd, thresholdMicroUsd } = opts;
  const subject = `MrNine — Số dư thấp (${fmtUsd(balanceMicroUsd)})`;
  const text = [
    `Số dư của bạn còn ${fmtUsd(balanceMicroUsd)}, dưới ngưỡng ${fmtUsd(thresholdMicroUsd)}.`,
    ``,
    `Nạp thêm tại: ${APP_URL}/dashboard/billing`,
    ``,
    `— MrNine Gateway`,
  ].join("\n");
  const html = `<!doctype html><html><body style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;background:#f5f5f7;padding:24px;color:#111">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;border:1px solid #e5e7eb">
  <h1 style="margin:0 0 8px;font-size:20px;color:#b45309">Số dư thấp</h1>
  <p style="margin:0 0 16px;color:#6b7280">Tài khoản của bạn còn <b style="color:#111">${fmtUsd(balanceMicroUsd)}</b>, dưới ngưỡng cảnh báo ${fmtUsd(thresholdMicroUsd)}.</p>
  <p style="margin:0 0 24px;color:#6b7280">Nạp thêm để tránh gián đoạn API.</p>
  <a href="${APP_URL}/dashboard/billing" style="display:inline-block;background:#111;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-size:14px">Nạp tiền ngay</a>
</div>
<p style="text-align:center;color:#9ca3af;font-size:12px;margin-top:16px">MrNine Gateway · ${APP_URL}</p>
</body></html>`;
  return { to: opts.email, subject, html, text };
}

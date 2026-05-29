/**
 * Discord webhook notifier — fire-and-forget alerts to a single channel.
 *
 * ENV:
 *   DISCORD_WEBHOOK_URL   — https://discord.com/api/webhooks/<id>/<token>
 *
 * Nếu thiếu env → no-op silent (dev). Tất cả call đều catch lỗi để không
 * ảnh hưởng business flow.
 */
type Field = { name: string; value: string; inline?: boolean };

type Embed = {
  title?: string;
  description?: string;
  color?: number;
  fields?: Field[];
  timestamp?: string;
};

const COLORS = {
  green: 0x45a85d,
  amber: 0xd6a548,
  red: 0xef4444,
  blue: 0x4f8ef7,
  gray: 0x9a9087,
};

async function send(embed: Embed): Promise<void> {
  const url = process.env.DISCORD_WEBHOOK_URL;
  if (!url) return;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "MrNine Gateway",
        embeds: [{ ...embed, timestamp: embed.timestamp ?? new Date().toISOString() }],
      }),
    });
  } catch (e) {
    console.error("[discord] webhook failed", e);
  }
}

function fmtUsd(micro: number): string {
  return `$${(micro / 1_000_000).toFixed(4)}`;
}

function fmtVnd(vnd: number): string {
  return `${vnd.toLocaleString("vi-VN")}đ`;
}

export function notifySignup(opts: { email: string; balanceMicroUsd: number }): void {
  void send({
    title: "🆕 New signup",
    color: COLORS.blue,
    fields: [
      { name: "Email", value: opts.email, inline: true },
      { name: "Free balance", value: fmtUsd(opts.balanceMicroUsd), inline: true },
    ],
  });
}

export function notifyTopup(opts: {
  email: string;
  amountVnd: number;
  amountMicroUsd: number;
  newBalanceMicroUsd: number;
  providerRef: string;
}): void {
  void send({
    title: "💰 Top-up completed",
    color: COLORS.green,
    fields: [
      { name: "Email", value: opts.email, inline: true },
      { name: "Amount", value: `${fmtVnd(opts.amountVnd)} (${fmtUsd(opts.amountMicroUsd)})`, inline: true },
      { name: "New balance", value: fmtUsd(opts.newBalanceMicroUsd), inline: true },
      { name: "Ref", value: `\`${opts.providerRef}\``, inline: false },
    ],
  });
}

export function notifyRefund(opts: {
  adminEmail: string | null;
  userEmail: string;
  amountVnd: number;
  amountMicroUsd: number;
  providerRef: string | null;
}): void {
  void send({
    title: "↩️ Refund issued",
    color: COLORS.amber,
    fields: [
      { name: "User", value: opts.userEmail, inline: true },
      { name: "Amount", value: `${fmtVnd(opts.amountVnd)} (${fmtUsd(opts.amountMicroUsd)})`, inline: true },
      { name: "Admin", value: opts.adminEmail ?? "unknown", inline: true },
      { name: "Ref", value: opts.providerRef ? `\`${opts.providerRef}\`` : "—", inline: false },
    ],
  });
}

export function notifyCouponRedeemed(opts: {
  email: string;
  code: string;
  creditedMicroUsd: number;
}): void {
  void send({
    title: "🎟️ Coupon redeemed",
    color: COLORS.blue,
    fields: [
      { name: "User", value: opts.email, inline: true },
      { name: "Code", value: `\`${opts.code}\``, inline: true },
      { name: "Credited", value: fmtUsd(opts.creditedMicroUsd), inline: true },
    ],
  });
}

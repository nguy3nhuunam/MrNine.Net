/**
 * Telegram bot helpers — link account + reply commands.
 *
 * ENV: TELEGRAM_BOT_TOKEN, TELEGRAM_BOT_USERNAME, TELEGRAM_WEBHOOK_SECRET
 *
 * Webhook setup (1 lần):
 *   curl -X POST https://api.telegram.org/bot$TOKEN/setWebhook \
 *     -d "url=https://mrnine.net/api/telegram&secret_token=$SECRET"
 */
import "server-only";

import { randomBytes } from "node:crypto";

const API = "https://api.telegram.org";

export function generateLinkToken(): string {
  return randomBytes(16).toString("hex");
}

export function botDeeplink(token: string): string {
  const username = process.env.TELEGRAM_BOT_USERNAME ?? "";
  return `https://t.me/${username}?start=${token}`;
}

export async function sendMessage(chatId: number, text: string, parseMode: "Markdown" | "HTML" | undefined = "Markdown"): Promise<void> {
  const tok = process.env.TELEGRAM_BOT_TOKEN;
  if (!tok) return;
  try {
    await fetch(`${API}/bot${tok}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: parseMode,
        disable_web_page_preview: true,
      }),
    });
  } catch (e) {
    console.error("[tg] sendMessage failed", e);
  }
}

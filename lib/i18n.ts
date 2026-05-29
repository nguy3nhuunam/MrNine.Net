/**
 * Lightweight i18n — cookie-based locale, dictionary lookup.
 *
 * Cookie `mrnine_locale` = "vi" | "en". Default vi.
 *
 * Usage:
 *   const t = await getTranslator();
 *   t("dashboard.title")  // "Tổng quan" hoặc "Overview"
 */
import "server-only";

import { cookies } from "next/headers";

export type Locale = "vi" | "en";

const dict = {
  vi: {
    "nav.overview": "Tổng quan",
    "nav.api_keys": "API keys",
    "nav.usage": "Usage",
    "nav.billing": "Nạp tiền",
    "nav.playground": "Playground",
    "nav.webhooks": "Webhooks",
    "nav.settings": "Cài đặt",
    "common.signout": "Thoát",

    "dashboard.title": "Tổng quan",
    "dashboard.greeting": "Xin chào",
    "dashboard.balance": "Số dư",
    "dashboard.balance_topup": "Nạp thêm →",
    "dashboard.active_keys": "API keys active",
    "dashboard.tokens_7d": "Tokens (7 ngày)",
    "dashboard.cost_7d": "Chi phí (7 ngày)",
    "dashboard.recent_requests": "Request gần đây",

    "settings.title": "Cài đặt",
    "settings.email_notifications": "Email notifications",
    "settings.telegram": "Telegram bot",

    "billing.title": "Nạp tiền",
    "billing.coupon_input": "Nhập mã coupon",
    "billing.history": "Lịch sử nạp",
  },
  en: {
    "nav.overview": "Overview",
    "nav.api_keys": "API keys",
    "nav.usage": "Usage",
    "nav.billing": "Top up",
    "nav.playground": "Playground",
    "nav.webhooks": "Webhooks",
    "nav.settings": "Settings",
    "common.signout": "Sign out",

    "dashboard.title": "Overview",
    "dashboard.greeting": "Hello",
    "dashboard.balance": "Balance",
    "dashboard.balance_topup": "Top up →",
    "dashboard.active_keys": "Active API keys",
    "dashboard.tokens_7d": "Tokens (7 days)",
    "dashboard.cost_7d": "Cost (7 days)",
    "dashboard.recent_requests": "Recent requests",

    "settings.title": "Settings",
    "settings.email_notifications": "Email notifications",
    "settings.telegram": "Telegram bot",

    "billing.title": "Top up",
    "billing.coupon_input": "Enter coupon code",
    "billing.history": "Top-up history",
  },
} as const;

type Key = keyof typeof dict.vi;

export async function getLocale(): Promise<Locale> {
  try {
    const c = (await cookies()).get("mrnine_locale")?.value;
    return c === "en" ? "en" : "vi";
  } catch {
    return "vi";
  }
}

export async function getTranslator(): Promise<(k: Key) => string> {
  const locale = await getLocale();
  return (k: Key) => dict[locale][k] ?? dict.vi[k] ?? k;
}

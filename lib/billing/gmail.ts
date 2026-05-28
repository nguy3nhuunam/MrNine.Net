/**
 * Gmail API client cho việc đọc biên lai MB Bank.
 *
 * Setup:
 *   1. Tạo Google Cloud project
 *   2. Enable Gmail API
 *   3. Tạo OAuth 2.0 credentials → desktop app
 *   4. Chạy `npm run gmail:authorize` (script dưới) → grant scope gmail.readonly
 *   5. Lưu refresh_token vào env GMAIL_REFRESH_TOKEN
 *
 * Cron sẽ:
 *   - Lấy `historyId` cuối lưu trong Postgres (key-value `gmail_state`)
 *   - Gmail.users.history.list từ historyId đó
 *   - Với mỗi history mới có addedMessages, fetch full message
 *   - Parse → match ref → credit balance idempotent
 */
import { google, type gmail_v1 } from "googleapis";

import { parseMbEmail } from "./mbbank-parser";

const SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"];
// Whitelist sender domains để tránh fake email
const TRUSTED_SENDERS = [
  "alert@mbbank.com.vn",
  "thongbao@mbbank.com.vn",
  "noreply@mbbank.com.vn",
  "support@mbbank.com.vn",
];

function getOAuthClient() {
  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Gmail OAuth không đủ env: cần GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN");
  }
  const oAuth2 = new google.auth.OAuth2(clientId, clientSecret, "urn:ietf:wg:oauth:2.0:oob");
  oAuth2.setCredentials({ refresh_token: refreshToken });
  return oAuth2;
}

export function getGmail(): gmail_v1.Gmail {
  return google.gmail({ version: "v1", auth: getOAuthClient() });
}

/**
 * Lấy plain text body từ Gmail message payload.
 * Walk MIME parts, ưu tiên text/plain, fallback strip HTML.
 */
function extractBody(payload: gmail_v1.Schema$MessagePart | undefined): string {
  if (!payload) return "";
  const out: string[] = [];

  function walk(p: gmail_v1.Schema$MessagePart | undefined) {
    if (!p) return;
    const mime = p.mimeType ?? "";
    const data = p.body?.data;
    if (data) {
      const decoded = Buffer.from(data, "base64url").toString("utf8");
      if (mime === "text/plain") out.push(decoded);
      else if (mime === "text/html") out.push(stripHtml(decoded));
    }
    if (p.parts) p.parts.forEach(walk);
  }
  walk(payload);
  return out.join("\n").slice(0, 20000);
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function getHeader(headers: gmail_v1.Schema$MessagePartHeader[] | undefined, name: string): string {
  if (!headers) return "";
  const lower = name.toLowerCase();
  return headers.find((h) => (h.name ?? "").toLowerCase() === lower)?.value ?? "";
}

function isTrustedSender(from: string): boolean {
  const lower = from.toLowerCase();
  return TRUSTED_SENDERS.some((s) => lower.includes(s));
}

/**
 * List unread messages từ MB Bank trong N ngày gần nhất.
 * Cron poll path. Idempotent: dùng messageId làm dedup key.
 */
export async function listMbInbox(opts: { days?: number; max?: number } = {}): Promise<
  Array<{
    messageId: string;
    from: string;
    subject: string;
    date: number;
    body: string;
  }>
> {
  const days = opts.days ?? 1;
  const max = opts.max ?? 50;
  const gmail = getGmail();

  // Gmail search query — match MB sender + nội dung biến động số dư
  const q = `from:mbbank.com.vn newer_than:${days}d`;

  const list = await gmail.users.messages.list({
    userId: "me",
    q,
    maxResults: max,
  });

  const items = list.data.messages ?? [];
  const out: Array<{
    messageId: string;
    from: string;
    subject: string;
    date: number;
    body: string;
  }> = [];

  for (const m of items) {
    if (!m.id) continue;
    const full = await gmail.users.messages.get({
      userId: "me",
      id: m.id,
      format: "full",
    });
    const headers = full.data.payload?.headers ?? [];
    const from = getHeader(headers, "From");
    if (!isTrustedSender(from)) continue;
    const subject = getHeader(headers, "Subject");
    const dateHdr = getHeader(headers, "Date");
    const date = dateHdr ? Date.parse(dateHdr) || Date.now() : Date.now();
    out.push({
      messageId: m.id,
      from,
      subject,
      date,
      body: extractBody(full.data.payload ?? undefined),
    });
  }

  return out;
}

export { parseMbEmail };

/**
 * Gmail API client cho việc đọc biên lai bank.
 *
 * Bank chọn theo BANK_NAME env (MB / VPB / VCB / TCB / ACB / TPB / STB / BIDV).
 * Logic match từng bank ở lib/billing/bank-parsers.ts.
 *
 * Setup:
 *   1. Tạo Google Cloud project
 *   2. Enable Gmail API
 *   3. Tạo OAuth 2.0 credentials → desktop app
 *   4. Chạy `npm run gmail:authorize` → grant scope gmail.readonly
 *   5. Lưu refresh_token vào env GMAIL_REFRESH_TOKEN
 */
import { google, type gmail_v1 } from "googleapis";

import { getBankAdapter } from "./bank-parsers";

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

export function getActiveBankSlug(): string {
  const raw = process.env.BANK_NAME ?? "MB";
  const s = raw.toLowerCase().replace(/\s+/g, "");
  if (s.includes("mb")) return "MB";
  if (s.includes("vp")) return "VPB";
  if (s.includes("vietcom") || s === "vcb") return "VCB";
  if (s.includes("tech") || s === "tcb") return "TCB";
  if (s === "acb") return "ACB";
  if (s.includes("tpb")) return "TPB";
  if (s === "stb" || s.includes("sacom")) return "STB";
  if (s.includes("bidv")) return "BIDV";
  return "MB";
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

export type BankInboxItem = {
  messageId: string;
  from: string;
  subject: string;
  date: number;
  body: string;
};

/**
 * List email biên lai bank trong N ngày gần nhất, theo bank đang active.
 */
export async function listBankInbox(opts: { days?: number; max?: number } = {}): Promise<BankInboxItem[]> {
  const days = opts.days ?? 1;
  const max = opts.max ?? 50;
  const slug = getActiveBankSlug();
  const adapter = getBankAdapter(slug);
  const gmail = getGmail();

  const list = await gmail.users.messages.list({
    userId: "me",
    q: adapter.searchQuery(days),
    maxResults: max,
  });

  const items = list.data.messages ?? [];
  const out: BankInboxItem[] = [];

  for (const m of items) {
    if (!m.id) continue;
    const full = await gmail.users.messages.get({
      userId: "me",
      id: m.id,
      format: "full",
    });
    const headers = full.data.payload?.headers ?? [];
    const from = getHeader(headers, "From");
    if (!adapter.trustedSender(from)) continue;
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

/** Parse 1 email theo bank đang active. */
export function parseBankEmail(body: string) {
  const slug = getActiveBankSlug();
  return getBankAdapter(slug).parse(body);
}

// ── Backward-compat exports ────────────────────────────────────────
/** @deprecated dùng listBankInbox */
export const listMbInbox = listBankInbox;
/** @deprecated dùng parseBankEmail */
export const parseMbEmail = (body: string) => {
  const slug = getActiveBankSlug();
  return getBankAdapter(slug).parse(body);
};

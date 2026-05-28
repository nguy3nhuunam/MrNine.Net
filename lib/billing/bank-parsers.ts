/**
 * Bank email biên lai parsers — multi-bank support.
 *
 * Mỗi bank có format email khác nhau. File này export:
 *   - getBankAdapter(slug) → adapter
 *   - parseBankEmail(slug, body) → ParsedTxn | null
 *
 * Slug match với BANK_NAME env (đã normalize qua normalizeBankSlug ở sepay.ts):
 *   MB, VPB, VCB, TCB, ACB, TPB, STB, BIDV.
 */

export type ParsedTxn = {
  amountVnd: number;
  ref: string;
  direction: "in" | "out";
  rawContent: string;
};

export type BankAdapter = {
  /** Gmail search query để fetch biên lai. Phải `from:<bank-domain>` để filter. */
  searchQuery: (days: number) => string;
  /** Verify sender (regex test địa chỉ "From" header). */
  trustedSender: (from: string) => boolean;
  /** Parse plain-text body → ParsedTxn. Trả null nếu không khớp pattern. */
  parse: (body: string) => ParsedTxn | null;
};

const REF_RE = /\bMR-[A-F0-9]{8}\b/i;
// Match "+100,000 VND" / "100.000 VND" / "100000VND" / "100,000đ"
const AMOUNT_RE = /([+\-]?)\s*([\d.,]{4,})\s*(?:VND|VNĐ|đ\b)/i;

const IN_HINTS_VN = ["nhận tiền", "ghi có", "tiền vào", "thu", "credit", "incoming"];
const OUT_HINTS_VN = ["chuyển tiền", "ghi nợ", "tiền ra", "chi", "debit", "outgoing", "thanh toán", "thanh toan"];

/** Generic parser dùng được cho cả MB, VPB, VCB, TCB. */
function genericParse(body: string): ParsedTxn | null {
  if (!body) return null;
  const text = body.replace(/\r\n/g, "\n");

  const refMatch = text.match(REF_RE);
  if (!refMatch) return null;
  const ref = refMatch[0].toUpperCase();

  const amountMatch = text.match(AMOUNT_RE);
  if (!amountMatch) return null;

  const sign = amountMatch[1] ?? "";
  const numStr = amountMatch[2].replace(/[.,\s]/g, "");
  const amountVnd = Number(numStr);
  if (!Number.isFinite(amountVnd) || amountVnd <= 0) return null;

  const lower = text.toLowerCase();
  let direction: "in" | "out";
  if (sign === "-") direction = "out";
  else if (sign === "+") direction = "in";
  else {
    const inScore = IN_HINTS_VN.reduce((s, h) => s + (lower.includes(h) ? 1 : 0), 0);
    const outScore = OUT_HINTS_VN.reduce((s, h) => s + (lower.includes(h) ? 1 : 0), 0);
    direction = outScore > inScore ? "out" : "in";
  }

  return { amountVnd, ref, direction, rawContent: text.slice(0, 2000) };
}

const ADAPTERS: Record<string, BankAdapter> = {
  MB: {
    searchQuery: (d) => `from:mbbank.com.vn newer_than:${d}d`,
    trustedSender: (from) => /<?[a-z0-9._-]+@mbbank\.com\.vn>?/i.test(from),
    parse: genericParse,
  },
  VPB: {
    // VPBank dùng `vpbank.com.vn` cho biến động số dư
    searchQuery: (d) => `from:vpbank.com.vn newer_than:${d}d`,
    trustedSender: (from) => /<?[a-z0-9._-]+@vpbank\.com\.vn>?/i.test(from),
    parse: genericParse,
  },
  VCB: {
    searchQuery: (d) => `from:vietcombank.com.vn newer_than:${d}d`,
    trustedSender: (from) => /<?[a-z0-9._-]+@vietcombank\.com\.vn>?/i.test(from),
    parse: genericParse,
  },
  TCB: {
    searchQuery: (d) => `from:techcombank.com.vn newer_than:${d}d`,
    trustedSender: (from) => /<?[a-z0-9._-]+@techcombank\.com\.vn>?/i.test(from),
    parse: genericParse,
  },
  ACB: {
    searchQuery: (d) => `from:acb.com.vn newer_than:${d}d`,
    trustedSender: (from) => /<?[a-z0-9._-]+@acb\.com\.vn>?/i.test(from),
    parse: genericParse,
  },
  TPB: {
    searchQuery: (d) => `from:tpb.vn newer_than:${d}d`,
    trustedSender: (from) => /<?[a-z0-9._-]+@tpb\.vn>?/i.test(from),
    parse: genericParse,
  },
  STB: {
    searchQuery: (d) => `from:sacombank.com.vn newer_than:${d}d`,
    trustedSender: (from) => /<?[a-z0-9._-]+@sacombank\.com\.vn>?/i.test(from),
    parse: genericParse,
  },
  BIDV: {
    searchQuery: (d) => `from:bidv.com.vn newer_than:${d}d`,
    trustedSender: (from) => /<?[a-z0-9._-]+@bidv\.com\.vn>?/i.test(from),
    parse: genericParse,
  },
};

export function getBankAdapter(slug: string): BankAdapter {
  const key = slug.toUpperCase();
  return ADAPTERS[key] ?? ADAPTERS.MB;
}

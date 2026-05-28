/**
 * MB Bank biên lai parser.
 *
 * MB Bank gửi email biên lai từ:
 *   - alert@mbbank.com.vn  (default cho App MBBank)
 *   - thongbao@mbbank.com.vn
 *
 * Subject pattern thường gặp:
 *   "MB - Thông báo biến động số dư"
 *   "MB Bank: Thông báo biến động số dư tài khoản"
 *
 * Body có dòng:
 *   - Loại GD: GD nhận tiền | GD chuyển tiền (in/out)
 *   - Số tiền: 100,000 VND  hoặc  +100,000 VND
 *   - Số dư: 1,234,567 VND
 *   - Nội dung: <free text>
 *   - Mã GD / Trace: ...
 *
 * Pattern không hoàn toàn ổn — MB đổi format thỉnh thoảng. Parser này regex
 * lenient: tìm số tiền > 0, tìm `MR-XXXXXXXX` trong content.
 */

export type ParsedTxn = {
  amountVnd: number;
  ref: string; // MR-XXXXXXXX
  direction: "in" | "out";
  rawContent: string;
};

const REF_RE = /\bMR-[A-F0-9]{8}\b/i;

// Match "+100,000 VND" hoặc "100.000 VND" hoặc "100000VND"
const AMOUNT_RE = /([+\-]?)\s*([\d.,]{4,})\s*VND/i;

// Detect direction (chỉ count match nguyên cụm từ, không count "+" / "-" lẻ vì
// dấu chấm/dấu phẩy trong số tiền có thể trigger sai).
const IN_HINTS = [
  "gd nhận tiền",
  "ghi có",
  "credit",
  "nhận tiền",
  "tiền vào",
];

const OUT_HINTS = [
  "gd chuyển tiền",
  "ghi nợ",
  "debit",
  "tiền ra",
  "thanh toán",
  "thanh toan",
];

export function parseMbEmail(plainText: string): ParsedTxn | null {
  if (!plainText) return null;
  const text = plainText.replace(/\r\n/g, "\n");

  // Find ref MR-XXXXXXXX trong toàn bộ body (thường nằm trong "Nội dung").
  const refMatch = text.match(REF_RE);
  if (!refMatch) return null;
  const ref = refMatch[0].toUpperCase();

  // Find amount
  const amountMatch = text.match(AMOUNT_RE);
  if (!amountMatch) return null;

  const sign = amountMatch[1] ?? "";
  const numStr = amountMatch[2].replace(/[.,\s]/g, "");
  const amountVnd = Number(numStr);
  if (!Number.isFinite(amountVnd) || amountVnd <= 0) return null;

  // Direction
  const lower = text.toLowerCase();
  let direction: "in" | "out";
  if (sign === "-") direction = "out";
  else if (sign === "+") direction = "in";
  else {
    const inScore = IN_HINTS.reduce((s, h) => s + (lower.includes(h) ? 1 : 0), 0);
    const outScore = OUT_HINTS.reduce((s, h) => s + (lower.includes(h) ? 1 : 0), 0);
    // Tie hoặc không có hint nào → mặc định inbound (an toàn cho top-up flow,
    // và amount mismatch sẽ catch nếu sai).
    direction = outScore > inScore ? "out" : "in";
  }

  return {
    amountVnd,
    ref,
    direction,
    rawContent: text.slice(0, 2000),
  };
}

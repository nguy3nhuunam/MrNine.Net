// Convert iztro's Chinese-numeral lunar dates into Vietnamese-friendly text.
// iztro v2.5.x returns lunarDate as e.g. "二〇〇〇年二月十四" even with vi-VN.

const CN_DIGITS: Record<string, number> = {
  "〇": 0, "零": 0,
  "一": 1, "二": 2, "三": 3, "四": 4, "五": 5,
  "六": 6, "七": 7, "八": 8, "九": 9,
};
const CN_SPECIAL: Record<string, number> = {
  "廿": 20,
  "卅": 30,
};

function cnYearToNumber(s: string): number {
  // 2000 = 二〇〇〇, char-by-char
  const digits = s.split("").map((c) => CN_DIGITS[c]);
  if (digits.some((d) => d === undefined)) return Number.NaN;
  return Number(digits.join(""));
}

function cnSmallToNumber(raw: string): number {
  // Handle 1-30 range for lunar month/day
  const s = raw.replace(/[月日初闰閏]/g, "").trim();
  if (!s) return Number.NaN;

  // 廿一 / 卅 / 廿
  const specialMatch = Object.keys(CN_SPECIAL).find((k) => s.startsWith(k));
  if (specialMatch) {
    const rest = s.slice(specialMatch.length);
    const tens = CN_SPECIAL[specialMatch];
    const ones = rest ? CN_DIGITS[rest] ?? 0 : 0;
    return tens + ones;
  }

  // 十, 十一, 十二, 二十, 二十一, 三十
  if (s.includes("十")) {
    const [tensPart, onesPart] = s.split("十");
    const tensNum = tensPart === "" ? 1 : CN_DIGITS[tensPart] ?? 0;
    const onesNum = onesPart === "" ? 0 : CN_DIGITS[onesPart] ?? 0;
    return tensNum * 10 + onesNum;
  }

  // single digit
  if (CN_DIGITS[s] !== undefined) return CN_DIGITS[s];
  return Number.NaN;
}

export function formatLunarDateVi(lunarRaw: string, chineseDate: string): string {
  // iztro format: 二〇〇〇年二月十四
  const match = lunarRaw.match(/^(.+?)年(闰|閏)?(.+?)月(.+)$/);
  if (!match) return lunarRaw;
  const [, yearChars, leap, monthChars, dayChars] = match;
  const year = cnYearToNumber(yearChars);
  const month = cnSmallToNumber(monthChars);
  const day = cnSmallToNumber(dayChars);
  if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) return lunarRaw;

  const stem = chineseDate ? chineseDate.split(/\s*-\s*/)[0]?.trim() : "";
  const leapTag = leap ? " (nhuận)" : "";
  const stemTag = stem ? ` · ${stem}` : "";
  return `${day}/${month}/${year}${leapTag}${stemTag}`;
}

// Lightweight numerology utilities — Pythagorean reduction with master numbers.
// Computes Life Path, Birthday, and Expression numbers from a Latin-letter
// full name + birth date. No external API.

export type NumerologyReading = {
  lifePath: number;
  birthday: number;
  expression: number | null;
  soulUrge: number | null;
  personality: number | null;
};

const MASTER_NUMBERS = new Set([11, 22, 33]);

function reduce(value: number): number {
  let current = Math.abs(value);
  while (current > 9 && !MASTER_NUMBERS.has(current)) {
    current = String(current)
      .split("")
      .reduce((sum, digit) => sum + Number(digit), 0);
  }
  return current;
}

function toLatinUpper(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, (match) => (match === "đ" ? "d" : "D"))
    .toUpperCase();
}

const PYTHAGOREAN: Record<string, number> = {
  A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8, I: 9,
  J: 1, K: 2, L: 3, M: 4, N: 5, O: 6, P: 7, Q: 8, R: 9,
  S: 1, T: 2, U: 3, V: 4, W: 5, X: 6, Y: 7, Z: 8,
};

const VOWELS = new Set(["A", "E", "I", "O", "U"]);

function letterValue(letter: string): number {
  return PYTHAGOREAN[letter] ?? 0;
}

function nameNumber(name: string, filter: (letter: string) => boolean): number | null {
  const normalized = toLatinUpper(name).replace(/[^A-Z]/g, "");
  if (!normalized) return null;
  const total = Array.from(normalized)
    .filter(filter)
    .reduce((sum, letter) => sum + letterValue(letter), 0);
  if (total === 0) return null;
  return reduce(total);
}

export function computeLifePath(date: string): number {
  const total = date.replace(/[^0-9]/g, "")
    .split("")
    .reduce((sum, digit) => sum + Number(digit), 0);
  return reduce(total);
}

export function computeBirthday(date: string): number {
  const day = Number(date.slice(8, 10));
  return reduce(day);
}

export function computeNumerology(date: string, fullName: string): NumerologyReading {
  return {
    lifePath: computeLifePath(date),
    birthday: computeBirthday(date),
    expression: nameNumber(fullName, () => true),
    soulUrge: nameNumber(fullName, (letter) => VOWELS.has(letter)),
    personality: nameNumber(fullName, (letter) => !VOWELS.has(letter)),
  };
}

export const NUMEROLOGY_MEANINGS_VI: Record<number, string> = {
  1: "Khởi đầu, lãnh đạo, tự lập. Mạnh dạn mở đường nhưng dễ bướng.",
  2: "Hợp tác, cân bằng, ngoại giao. Nhạy cảm và hay nhường nhịn.",
  3: "Sáng tạo, biểu đạt, xã giao. Lan toả năng lượng tích cực.",
  4: "Kỷ luật, nền tảng, lao động bền bỉ. Đáng tin và thực tế.",
  5: "Tự do, phiêu lưu, đa năng. Cần sự thay đổi để phát triển.",
  6: "Trách nhiệm, gia đình, chăm sóc. Hoà giải và yêu cái đẹp.",
  7: "Trí tuệ, suy ngẫm, tâm linh. Thích chiều sâu hơn bề rộng.",
  8: "Quyền lực, tài chính, tổ chức. Tham vọng và thực dụng.",
  9: "Nhân ái, vị tha, kết thúc một chu kỳ. Tầm nhìn toàn cầu.",
  11: "Master 11 — trực giác, truyền cảm hứng, khai sáng.",
  22: "Master 22 — kiến tạo, biến giấc mơ thành hệ thống thực.",
  33: "Master 33 — phụng sự, chữa lành, dạy dỗ ở quy mô lớn.",
};

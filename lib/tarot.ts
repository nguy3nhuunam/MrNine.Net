// Self-contained tarot deck (Major + Minor arcana) with English name and a
// short Vietnamese reading — no external assets, no API. Used by Mystic Deck
// for a 3-card spread (past / present / future).

export type TarotCard = {
  id: string;
  name: string;
  arcana: "major" | "minor";
  suit?: "wands" | "cups" | "swords" | "pentacles";
  upright: string;
  reversed: string;
};

const major: ReadonlyArray<TarotCard> = [
  { id: "fool", name: "The Fool", arcana: "major", upright: "Khởi đầu mới, tự do, ngây thơ.", reversed: "Liều lĩnh, do dự, thiếu kế hoạch." },
  { id: "magician", name: "The Magician", arcana: "major", upright: "Sáng tạo, đủ công cụ, hành động.", reversed: "Lừa dối, tài năng bị bỏ phí." },
  { id: "high-priestess", name: "The High Priestess", arcana: "major", upright: "Trực giác, bí mật, học hỏi nội tâm.", reversed: "Thông tin che giấu, lờ đi tiếng nói bên trong." },
  { id: "empress", name: "The Empress", arcana: "major", upright: "Phồn thịnh, sáng tạo, mẫu tính.", reversed: "Phụ thuộc, sáng tạo bị nghẽn." },
  { id: "emperor", name: "The Emperor", arcana: "major", upright: "Quyền lực, kỷ luật, ổn định.", reversed: "Áp đặt, cứng nhắc, lạm quyền." },
  { id: "hierophant", name: "The Hierophant", arcana: "major", upright: "Truyền thống, học vấn, chuẩn mực.", reversed: "Phá luật, tự tìm chân lý riêng." },
  { id: "lovers", name: "The Lovers", arcana: "major", upright: "Lựa chọn, tình yêu, hợp nhất.", reversed: "Bất hoà, lựa chọn sai." },
  { id: "chariot", name: "The Chariot", arcana: "major", upright: "Ý chí, chiến thắng, kiểm soát.", reversed: "Mất phương hướng, đầu hàng." },
  { id: "strength", name: "Strength", arcana: "major", upright: "Sức mạnh nội tâm, kiên nhẫn, dũng cảm.", reversed: "Tự nghi ngờ, mất kiểm soát." },
  { id: "hermit", name: "The Hermit", arcana: "major", upright: "Suy ngẫm, hướng nội, tìm sự thật.", reversed: "Cô lập, cô đơn, từ chối lời khuyên." },
  { id: "wheel", name: "Wheel of Fortune", arcana: "major", upright: "Chu kỳ, may mắn, bước ngoặt.", reversed: "Thoái lui, kháng cự sự thay đổi." },
  { id: "justice", name: "Justice", arcana: "major", upright: "Công bằng, sự thật, trách nhiệm.", reversed: "Bất công, trốn tránh hậu quả." },
  { id: "hanged-man", name: "The Hanged Man", arcana: "major", upright: "Buông xả, đổi góc nhìn, hi sinh.", reversed: "Trì hoãn, kháng cự đổi mới." },
  { id: "death", name: "Death", arcana: "major", upright: "Kết thúc cần thiết, chuyển hoá.", reversed: "Sợ thay đổi, mắc kẹt trong quá khứ." },
  { id: "temperance", name: "Temperance", arcana: "major", upright: "Cân bằng, điều độ, hài hoà.", reversed: "Mất cân bằng, thái quá." },
  { id: "devil", name: "The Devil", arcana: "major", upright: "Bị ràng buộc, cám dỗ vật chất.", reversed: "Giải phóng, nhận thức được xiềng xích." },
  { id: "tower", name: "The Tower", arcana: "major", upright: "Đột biến, sụp đổ, tỉnh ngộ.", reversed: "Hoãn được biến cố, sợ thay đổi." },
  { id: "star", name: "The Star", arcana: "major", upright: "Hi vọng, cảm hứng, chữa lành.", reversed: "Mất niềm tin, chán nản." },
  { id: "moon", name: "The Moon", arcana: "major", upright: "Mơ hồ, vô thức, ảo ảnh.", reversed: "Sự thật lộ ra, hết bối rối." },
  { id: "sun", name: "The Sun", arcana: "major", upright: "Thành công, niềm vui, sức sống.", reversed: "Lạc quan thái quá, ánh sáng tạm tắt." },
  { id: "judgement", name: "Judgement", arcana: "major", upright: "Thức tỉnh, tha thứ, đánh giá lại.", reversed: "Tự phán xét, không buông được quá khứ." },
  { id: "world", name: "The World", arcana: "major", upright: "Hoàn thành, viên mãn, du hành.", reversed: "Chưa hoàn tất, thiếu kết thúc." },
];

const suits: ReadonlyArray<{ id: TarotCard["suit"]; vi: string }> = [
  { id: "wands", vi: "Gậy" },
  { id: "cups", vi: "Cốc" },
  { id: "swords", vi: "Kiếm" },
  { id: "pentacles", vi: "Tiền" },
];

const ranks = ["Ace", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Page", "Knight", "Queen", "King"];

const minorMeanings: Record<NonNullable<TarotCard["suit"]>, { upright: string; reversed: string }> = {
  wands: {
    upright: "Năng lượng, hành động, đam mê, sáng tạo.",
    reversed: "Trì hoãn, mất hứng, thiếu hướng đi.",
  },
  cups: {
    upright: "Cảm xúc, quan hệ, trực giác, kết nối.",
    reversed: "Bế tắc cảm xúc, xa cách, thất vọng.",
  },
  swords: {
    upright: "Tư duy, sự thật, xung đột, quyết định.",
    reversed: "Lú lẫn, tự huỷ hoại, lời nói gây tổn thương.",
  },
  pentacles: {
    upright: "Tài chính, sự nghiệp, vật chất, ổn định.",
    reversed: "Khó khăn tiền bạc, tham lam, thiếu thực tế.",
  },
};

const minor: ReadonlyArray<TarotCard> = suits.flatMap(({ id, vi }) =>
  ranks.map((rank) => ({
    id: `${id}-${rank.toLowerCase()}`,
    name: `${rank} of ${id![0].toUpperCase()}${id!.slice(1)}`,
    arcana: "minor" as const,
    suit: id,
    upright: `${rank} ${vi}: ${minorMeanings[id!].upright}`,
    reversed: `${rank} ${vi} ngược: ${minorMeanings[id!].reversed}`,
  })),
);

export const tarotDeck: ReadonlyArray<TarotCard> = [...major, ...minor];

export type DrawnCard = { card: TarotCard; reversed: boolean };

export function drawTarot(count: number): DrawnCard[] {
  const pool = [...tarotDeck];
  const drawn: DrawnCard[] = [];
  for (let i = 0; i < count && pool.length > 0; i += 1) {
    const idx = Math.floor(Math.random() * pool.length);
    const [card] = pool.splice(idx, 1);
    drawn.push({ card, reversed: Math.random() < 0.4 });
  }
  return drawn;
}

export const tarotPositions: ReadonlyArray<{ id: string; vi: string }> = [
  { id: "past", vi: "Quá khứ" },
  { id: "present", vi: "Hiện tại" },
  { id: "future", vi: "Tương lai" },
];

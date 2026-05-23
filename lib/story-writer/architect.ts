// Architect agent — runs once when a book is created.
// Generates: story_bible, book_rules, volume_outline, characters[],
// and seeds the 7 truth files with starting state.

import { callLlm, callLlmJson, type ChatMessage } from "@/lib/story-writer/llm";
import { getGenre } from "@/lib/story-writer/genres";
import type { LlmConfig, SwBook } from "@/lib/story-writer/store";

export type ArchitectResult = {
  storyBible: string;
  bookRules: string;
  volumeOutline: string;
  characters: Array<{ name: string; role: string; profile: string }>;
  truthSeeds: Record<
    | "current_state"
    | "particle_ledger"
    | "pending_hooks"
    | "chapter_summaries"
    | "subplot_board"
    | "emotional_arcs"
    | "character_matrix",
    string
  >;
};

type ArchitectInput = {
  title: string;
  genreId: string;
  brief?: string;
  authorIntent: string;
  currentFocus: string;
  chapterWords: number;
  targetChapters: number;
  llm?: LlmConfig | null;
};

export async function runArchitect(input: ArchitectInput): Promise<ArchitectResult> {
  const genre = getGenre(input.genreId);
  if (!genre) {
    throw new Error(`Genre không hợp lệ: ${input.genreId}`);
  }

  const beats = genre.beats.map((b, i) => `${i + 1}. ${b}`).join("\n");
  const banned = genre.bannedCliche.map((b) => `- ${b}`).join("\n");

  const briefBlock = input.brief
    ? `Brief / Đề cương người dùng đã cung cấp (BÁM SÁT, không được bịa thêm setting trái ngược):\n${input.brief.trim().slice(0, 4000)}`
    : "Người dùng không cung cấp brief; hãy tự đề xuất setting hợp lý cho thể loại + ý đồ tác giả.";

  const messages: ChatMessage[] = [
    {
      role: "system",
      content:
        "Bạn là Architect của Story Writer — chịu trách nhiệm thiết kế bộ khung truyện trước khi viết chương đầu. Trả về DUY NHẤT một JSON hợp lệ theo schema được yêu cầu. Toàn bộ giá trị tiếng Việt, không thuần dịch từ tiếng Anh.",
    },
    {
      role: "user",
      content: `Tựa đề: ${input.title}
Thể loại: ${genre.labelVi} (${genre.labelEn})
Đối tượng độc giả: ${genre.audienceVi}
Style guide gợi ý: ${genre.styleGuide}
Beat chuẩn của thể loại:
${beats}
Cliché cần né:
${banned}

Ý đồ tác giả (long-term):
${input.authorIntent || "(chưa khai báo, tự đề xuất theo brief)"}

Trọng tâm hiện tại (1–3 chương đầu):
${input.currentFocus || "(chưa khai báo, tự đề xuất chương 1–3 mở đầu hấp dẫn)"}

Mục tiêu: ${input.targetChapters} chương · mỗi chương ~${input.chapterWords} chữ.

${briefBlock}

YÊU CẦU TRẢ VỀ JSON với các field:
{
  "storyBible": string (Markdown 600–900 chữ: thế giới, hệ thống quyền lực, địa lý, thời đại, quy luật, danh từ riêng quan trọng),
  "bookRules": string (Markdown gồm các phần: Hard rules — Setup nhân vật chính — Trần cảnh giới/sức mạnh/level cap — Cấm trong truyện này — Khoảng tự do),
  "volumeOutline": string (Markdown chia 3–5 quyển, mỗi quyển 5–10 arc, ghi rõ kết quả mong đợi cuối quyển),
  "characters": Array<{ "name": string, "role": string ("protagonist" | "ally" | "rival" | "love-interest" | "mentor" | "villain" | "support"), "profile": string (200–350 chữ: ngoại hình, tính cách, mục tiêu, mâu thuẫn nội tâm) }> 5–8 nhân vật khởi điểm,
  "truthSeeds": {
    "current_state": Markdown (vị trí hiện tại NVC, mối quan hệ ban đầu, cảm xúc trục, info NVC biết / không biết),
    "particle_ledger": Markdown (tài sản, vật phẩm, công năng, nguồn lực ban đầu — có thể trống),
    "pending_hooks": Markdown (3–5 foreshadow đã reo bằng setting, mỗi hook có status "open"),
    "chapter_summaries": Markdown (để trống — chỉ ghi tiêu đề "## Chapter Summaries" + dòng chú thích "(updated after each chapter)"),
    "subplot_board": Markdown (3 subplot A/B/C: tên, mô tả, status "active"|"dormant"),
    "emotional_arcs": Markdown (mỗi nhân vật chính một khối: trạng thái khởi điểm, hướng dự kiến),
    "character_matrix": Markdown (ma trận: ai biết gì về ai, ai đã gặp ai)
  }
}

Tuyệt đối không tự thêm tên nhân vật / địa danh nếu brief đã chỉ định. Trường hợp brief không có thì sáng tạo trong phong cách Việt + thể loại.`,
    },
  ];

  const result = await callLlmJson<ArchitectResult>(
    messages,
    { temperature: 0.85, maxTokens: 6000 },
    input.llm,
  );

  // Lightweight validation
  if (!result.storyBible || !result.bookRules || !result.volumeOutline) {
    throw new Error("Architect thiếu storyBible / bookRules / volumeOutline");
  }
  if (!Array.isArray(result.characters) || result.characters.length === 0) {
    throw new Error("Architect không trả về danh sách nhân vật");
  }
  if (!result.truthSeeds || !result.truthSeeds.current_state) {
    throw new Error("Architect không trả về truthSeeds");
  }
  return result;
}

// Quick book-suggestion mode — used by the conversational book creation flow
// before the full architect runs.
export async function suggestBookSetting(input: {
  topic: string;
  genreId: string;
  llm?: LlmConfig | null;
}): Promise<{
  title: string;
  authorIntent: string;
  currentFocus: string;
  briefDraft: string;
}> {
  const genre = getGenre(input.genreId);
  if (!genre) {
    throw new Error(`Genre không hợp lệ: ${input.genreId}`);
  }
  const messages: ChatMessage[] = [
    {
      role: "system",
      content:
        "Bạn là cố vấn cốt truyện. Trả về DUY NHẤT JSON. Tiếng Việt, có sức hấp dẫn cho độc giả Việt.",
    },
    {
      role: "user",
      content: `Người dùng có ý tưởng: "${input.topic.trim().slice(0, 1200)}"
Thể loại đã chọn: ${genre.labelVi}
Đối tượng: ${genre.audienceVi}

Trả về JSON:
{
  "title": string (tiêu đề có móc câu, 4–10 chữ),
  "authorIntent": string (300–500 chữ Markdown: chủ đề, thông điệp, nhịp dài hạn),
  "currentFocus": string (200–350 chữ Markdown: trọng tâm 1–3 chương đầu),
  "briefDraft": string (500–900 chữ Markdown: setting cốt lõi, hệ thống, nhân vật chính, mâu thuẫn mở đầu)
}`,
    },
  ];

  return callLlmJson(messages, { temperature: 0.9, maxTokens: 2400 }, input.llm);
}

void callLlm;

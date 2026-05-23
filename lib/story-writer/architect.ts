// Architect agent — split into TWO stages so each fits inside Vercel's 60s
// function budget. Stage 1 builds the structural skeleton (bible, rules,
// outline, characters, relationships, foreshadows, volumes). Stage 2 takes
// that skeleton and emits the 7 truth-file seeds.

import { callLlm, callLlmJson, type ChatMessage } from "@/lib/story-writer/llm";
import { getGenre } from "@/lib/story-writer/genres";
import type { LlmConfig, TruthKind } from "@/lib/story-writer/store";

export type ArchitectSkeletonInput = {
  title: string;
  genreId: string;
  brief?: string;
  authorIntent: string;
  currentFocus: string;
  chapterWords: number;
  targetChapters: number;
  llm?: LlmConfig | null;
};

export type ArchitectSkeleton = {
  storyBible: string;
  bookRules: string;
  volumeOutline: string;
  characters: Array<{ name: string; role: string; profile: string; aliases?: string[] }>;
  relationships?: Array<{ fromName: string; toName: string; kind: string; label?: string; note?: string }>;
  foreshadows?: Array<{ summary: string; expectedResolutionChapter?: number }>;
  volumes?: Array<{ number: number; title: string; summary: string; startChapter: number; endChapter?: number }>;
};

export type ArchitectTruth = Record<
  Extract<
    TruthKind,
    "current_state" | "particle_ledger" | "pending_hooks" | "chapter_summaries" | "subplot_board" | "emotional_arcs" | "character_matrix"
  >,
  string
>;

export type ArchitectResult = ArchitectSkeleton & { truthSeeds: ArchitectTruth };

// ---------------------------------------------------------------------------
// Stage 1 — skeleton (no truth seeds). Smaller prompt + smaller maxTokens.
// ---------------------------------------------------------------------------
export async function runArchitectSkeleton(input: ArchitectSkeletonInput): Promise<ArchitectSkeleton> {
  const genre = getGenre(input.genreId);
  if (!genre) throw new Error(`Genre không hợp lệ: ${input.genreId}`);

  const beats = genre.beats.map((b, i) => `${i + 1}. ${b}`).join("\n");
  const banned = genre.bannedCliche.map((b) => `- ${b}`).join("\n");

  const briefBlock = input.brief
    ? `Brief / đề cương từ tác giả (BÁM SÁT, không bịa setting trái ngược):\n${input.brief.trim().slice(0, 3000)}`
    : "Tác giả không cung cấp brief; tự đề xuất setting hợp lý theo thể loại + ý đồ.";

  const messages: ChatMessage[] = [
    {
      role: "system",
      content:
        "Bạn là Architect, dựng KHUNG truyện trước khi viết. Trả DUY NHẤT JSON theo schema yêu cầu. Tiếng Việt, không dịch máy.",
    },
    {
      role: "user",
      content: `Tựa: ${input.title}
Thể loại: ${genre.labelVi} · Đối tượng: ${genre.audienceVi}
Style: ${genre.styleGuide}
Beat thể loại:
${beats}
Cliché tránh:
${banned}

Ý đồ tác giả:
${input.authorIntent || "(trống)"}

Trọng tâm 1–3 chương đầu:
${input.currentFocus || "(trống)"}

Mục tiêu: ${input.targetChapters} chương · ~${input.chapterWords} chữ/chương.

${briefBlock}

JSON cần trả:
{
  "storyBible": string (Markdown 400–600 chữ — thế giới, hệ thống quyền lực, địa lý, thời đại, danh từ riêng cốt lõi),
  "bookRules": string (Markdown 200–400 chữ: Hard rules, setup NVC, trần sức mạnh, cấm, khoảng tự do),
  "volumeOutline": string (Markdown 250–400 chữ — 3 quyển, mỗi quyển 1 đoạn ngắn nêu kết quả mong đợi),
  "characters": Array<{ "name": string, "role": "protagonist"|"ally"|"rival"|"love-interest"|"mentor"|"villain"|"support", "profile": string (150–250 chữ), "aliases"?: string[] }> 5–7 nhân vật,
  "relationships": Array<{ "fromName": string, "toName": string, "kind": "knows"|"loves"|"hates"|"rivals"|"parent_of"|"child_of"|"sibling"|"mentor_of"|"ally"|"owes"|"secret_with"|"betrayed_by"|"custom", "label"?: string, "note"?: string }> 4–8 quan hệ,
  "foreshadows": Array<{ "summary": string, "expectedResolutionChapter"?: number }> 3–5 hook,
  "volumes": Array<{ "number": number, "title": string, "summary": string (~80 chữ), "startChapter": number, "endChapter"?: number }> 3 quyển
}

Tuyệt đối không thêm field hay text ngoài JSON.`,
    },
  ];

  const result = await callLlmJson<ArchitectSkeleton>(
    messages,
    { temperature: 0.85, maxTokens: 4000 },
    input.llm,
  );
  if (!result.storyBible || !result.bookRules || !result.volumeOutline) {
    throw new Error("Architect skeleton thiếu storyBible/bookRules/volumeOutline");
  }
  if (!Array.isArray(result.characters) || result.characters.length === 0) {
    throw new Error("Architect skeleton thiếu danh sách nhân vật");
  }
  return result;
}

// ---------------------------------------------------------------------------
// Stage 2 — truth seeds. Reads the skeleton so it stays consistent.
// ---------------------------------------------------------------------------
export async function runArchitectTruth(input: {
  title: string;
  genreId: string;
  skeleton: ArchitectSkeleton;
  llm?: LlmConfig | null;
}): Promise<ArchitectTruth> {
  const genre = getGenre(input.genreId);
  if (!genre) throw new Error(`Genre không hợp lệ: ${input.genreId}`);

  const charLine = input.skeleton.characters
    .map((c) => `- ${c.name} (${c.role})`)
    .join("\n");

  const messages: ChatMessage[] = [
    {
      role: "system",
      content:
        "Bạn là Architect, đang dựng TRUTH FILES khởi điểm cho truyện sau khi đã có skeleton. Trả DUY NHẤT JSON theo schema. Tiếng Việt.",
    },
    {
      role: "user",
      content: `Tựa: ${input.title} · Thể loại: ${genre.labelVi}

Story bible (đã chốt):
${input.skeleton.storyBible.slice(0, 1500)}

Book rules:
${input.skeleton.bookRules.slice(0, 1000)}

Cast:
${charLine}

JSON cần trả (mỗi field là Markdown ngắn 80–250 chữ, đừng nói thêm gì khác):
{
  "current_state": string (vị trí hiện tại NVC, mối quan hệ ban đầu, info NVC biết / không biết),
  "particle_ledger": string (tài sản, vật phẩm, công năng ban đầu — có thể trống),
  "pending_hooks": string (3–5 foreshadow đã reo bằng setting, mỗi hook có status "open"),
  "chapter_summaries": string (giữ tiêu đề "## Chapter Summaries" và 1 dòng "(updated after each chapter)"),
  "subplot_board": string (3 subplot A/B/C: tên, mô tả, status "active"|"dormant"),
  "emotional_arcs": string (mỗi nhân vật chính 1 khối: trạng thái khởi điểm, hướng dự kiến),
  "character_matrix": string (ma trận: ai biết gì về ai, ai đã gặp ai)
}`,
    },
  ];

  const result = await callLlmJson<ArchitectTruth>(
    messages,
    { temperature: 0.6, maxTokens: 3500 },
    input.llm,
  );
  if (!result.current_state) {
    throw new Error("Architect truth thiếu current_state");
  }
  return result;
}

// Legacy entry — calls both stages back to back. Kept for older callers.
// Splits the work into 2 LLM calls so each fits ~30–40s.
export async function runArchitect(input: ArchitectSkeletonInput): Promise<ArchitectResult> {
  const skeleton = await runArchitectSkeleton(input);
  const truthSeeds = await runArchitectTruth({
    title: input.title,
    genreId: input.genreId,
    skeleton,
    llm: input.llm ?? null,
  });
  return { ...skeleton, truthSeeds };
}

export async function suggestBookSetting(input: {
  topic: string;
  genreId: string;
  llm?: LlmConfig | null;
}): Promise<{ title: string; authorIntent: string; currentFocus: string; briefDraft: string }> {
  const genre = getGenre(input.genreId);
  if (!genre) throw new Error(`Genre không hợp lệ: ${input.genreId}`);
  const messages: ChatMessage[] = [
    {
      role: "system",
      content: "Bạn là cố vấn cốt truyện. Trả DUY NHẤT JSON. Tiếng Việt, hấp dẫn cho độc giả Việt.",
    },
    {
      role: "user",
      content: `Ý tưởng: "${input.topic.trim().slice(0, 1200)}"
Thể loại: ${genre.labelVi}
Đối tượng: ${genre.audienceVi}

JSON:
{
  "title": string (4–10 chữ có móc câu),
  "authorIntent": string (200–350 chữ Markdown),
  "currentFocus": string (150–250 chữ Markdown),
  "briefDraft": string (300–500 chữ Markdown)
}`,
    },
  ];
  return callLlmJson(messages, { temperature: 0.9, maxTokens: 1800 }, input.llm);
}

void callLlm;

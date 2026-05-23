// Architect agent — split into FOUR small stages so each one fits comfortably
// inside Vercel's 60s function budget even when the upstream LLM is slow.
//
// Stage 1 (skeleton-core): bible + rules + outline                     ~1 LLM call, <2.5k tokens
// Stage 2 (cast):           characters + relationships                  ~1 LLM call, <2k tokens
// Stage 3 (plot):           foreshadows + volumes                       ~1 LLM call, <1.5k tokens
// Stage 4 (truth):          all 7 truth-file seeds                      ~1 LLM call, <3k tokens
//
// The shell calls them sequentially with progress feedback. If Yunwu ever
// stalls on a single call, only that stage fails — the user can retry it
// from the UI without losing the work that already landed.

import { callLlm, callLlmJson, type ChatMessage } from "@/lib/story-writer/llm";
import { getGenre } from "@/lib/story-writer/genres";
import type { LlmConfig, TruthKind } from "@/lib/story-writer/store";

export type ArchitectInput = {
  title: string;
  genreId: string;
  brief?: string;
  authorIntent: string;
  currentFocus: string;
  chapterWords: number;
  targetChapters: number;
  llm?: LlmConfig | null;
};

export type ArchitectCore = {
  storyBible: string;
  bookRules: string;
  volumeOutline: string;
};

export type ArchitectCast = {
  characters: Array<{ name: string; role: string; profile: string; aliases?: string[] }>;
  relationships?: Array<{ fromName: string; toName: string; kind: string; label?: string; note?: string }>;
};

export type ArchitectPlot = {
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

export type ArchitectSkeleton = ArchitectCore & ArchitectCast & ArchitectPlot;
export type ArchitectResult = ArchitectSkeleton & { truthSeeds: ArchitectTruth };

function genreContext(genreId: string) {
  const genre = getGenre(genreId);
  if (!genre) throw new Error(`Genre không hợp lệ: ${genreId}`);
  return {
    genre,
    beats: genre.beats.slice(0, 5).map((b, i) => `${i + 1}. ${b}`).join("\n"),
    banned: genre.bannedCliche.slice(0, 4).map((b) => `- ${b}`).join("\n"),
  };
}

// ---------------------------------------------------------------------------
// Stage 1: storyBible + bookRules + volumeOutline
// ---------------------------------------------------------------------------
export async function runArchitectCore(input: ArchitectInput): Promise<ArchitectCore> {
  const { genre, beats, banned } = genreContext(input.genreId);
  const briefBlock = input.brief
    ? `Brief từ tác giả (BÁM SÁT):\n${input.brief.trim().slice(0, 2000)}`
    : "Tác giả không cung cấp brief; tự đề xuất setting hợp lý.";

  const messages: ChatMessage[] = [
    { role: "system", content: "Architect stage 1. Trả DUY NHẤT JSON. Tiếng Việt." },
    {
      role: "user",
      content: `Tựa: ${input.title} · Thể loại: ${genre.labelVi} · Đối tượng: ${genre.audienceVi}
Style: ${genre.styleGuide}
Beat:
${beats}
Tránh:
${banned}
Ý đồ: ${input.authorIntent || "(trống)"}
Focus 1–3 chương đầu: ${input.currentFocus || "(trống)"}
Mục tiêu: ${input.targetChapters} chương · ~${input.chapterWords} chữ/chương.

${briefBlock}

JSON:
{
  "storyBible": string (Markdown 350–500 chữ — thế giới, hệ thống, danh từ riêng cốt lõi),
  "bookRules": string (Markdown 200–300 chữ: hard rules, setup NVC, trần sức mạnh, cấm),
  "volumeOutline": string (Markdown 250–400 chữ — 3 quyển ngắn gọn)
}

Tuyệt đối không text ngoài JSON.`,
    },
  ];

  const result = await callLlmJson<ArchitectCore>(
    messages,
    { temperature: 0.85, maxTokens: 2500, tier: "fast", timeoutMs: 45_000 },
    input.llm,
  );
  if (!result.storyBible || !result.bookRules || !result.volumeOutline) {
    throw new Error("Stage 1 (skeleton-core) thiếu field");
  }
  return result;
}

// ---------------------------------------------------------------------------
// Stage 2: characters + relationships, conditioned on the core.
// ---------------------------------------------------------------------------
export async function runArchitectCast(
  input: ArchitectInput & { core: ArchitectCore },
): Promise<ArchitectCast> {
  const { genre } = genreContext(input.genreId);

  const messages: ChatMessage[] = [
    { role: "system", content: "Architect stage 2. Trả DUY NHẤT JSON. Tiếng Việt." },
    {
      role: "user",
      content: `Tựa: ${input.title} · Thể loại: ${genre.labelVi}
Story bible (đã chốt):
${input.core.storyBible.slice(0, 1200)}

Book rules (đã chốt):
${input.core.bookRules.slice(0, 700)}

Cần 5–7 nhân vật khởi điểm + 4–8 quan hệ giữa họ.

JSON:
{
  "characters": Array<{
    "name": string,
    "role": "protagonist"|"ally"|"rival"|"love-interest"|"mentor"|"villain"|"support",
    "profile": string (120–200 chữ: ngoại hình, tính cách, mục tiêu, mâu thuẫn nội tâm),
    "aliases"?: string[]
  }>,
  "relationships": Array<{
    "fromName": string,
    "toName": string,
    "kind": "knows"|"loves"|"hates"|"rivals"|"parent_of"|"child_of"|"sibling"|"mentor_of"|"ally"|"owes"|"secret_with"|"betrayed_by"|"custom",
    "label"?: string,
    "note"?: string
  }>
}`,
    },
  ];

  const result = await callLlmJson<ArchitectCast>(
    messages,
    { temperature: 0.85, maxTokens: 2200, tier: "fast", timeoutMs: 45_000 },
    input.llm,
  );
  if (!Array.isArray(result.characters) || result.characters.length === 0) {
    throw new Error("Stage 2 (cast) thiếu nhân vật");
  }
  return result;
}

// ---------------------------------------------------------------------------
// Stage 3: foreshadows + volumes, conditioned on core + cast.
// ---------------------------------------------------------------------------
export async function runArchitectPlot(
  input: ArchitectInput & { core: ArchitectCore; cast: ArchitectCast },
): Promise<ArchitectPlot> {
  const charLine = input.cast.characters.map((c) => `- ${c.name} (${c.role})`).join("\n");

  const messages: ChatMessage[] = [
    { role: "system", content: "Architect stage 3. Trả DUY NHẤT JSON. Tiếng Việt." },
    {
      role: "user",
      content: `Tựa: ${input.title}
Story bible:
${input.core.storyBible.slice(0, 1000)}

Cast:
${charLine}

Volume outline (đã chốt):
${input.core.volumeOutline.slice(0, 1000)}

Cần 3–5 foreshadow chính và 3 quyển có cấu trúc rõ.

JSON:
{
  "foreshadows": Array<{ "summary": string, "expectedResolutionChapter"?: number }>,
  "volumes": Array<{ "number": number, "title": string, "summary": string (60–100 chữ), "startChapter": number, "endChapter"?: number }>
}`,
    },
  ];

  return callLlmJson<ArchitectPlot>(
    messages,
    { temperature: 0.8, maxTokens: 1800, tier: "fast", timeoutMs: 40_000 },
    input.llm,
  );
}

// ---------------------------------------------------------------------------
// Stage 4: 7 truth-file seeds, reads the assembled skeleton.
// ---------------------------------------------------------------------------
export async function runArchitectTruth(input: {
  title: string;
  genreId: string;
  skeleton: ArchitectSkeleton;
  llm?: LlmConfig | null;
}): Promise<ArchitectTruth> {
  const { genre } = genreContext(input.genreId);
  const charLine = input.skeleton.characters.map((c) => `- ${c.name} (${c.role})`).join("\n");

  const messages: ChatMessage[] = [
    { role: "system", content: "Architect stage 4. Trả DUY NHẤT JSON. Tiếng Việt." },
    {
      role: "user",
      content: `Tựa: ${input.title} · Thể loại: ${genre.labelVi}

Story bible:
${input.skeleton.storyBible.slice(0, 1200)}

Cast:
${charLine}

7 truth-file seeds (Markdown ngắn 80–200 chữ mỗi cái):
{
  "current_state": string,
  "particle_ledger": string,
  "pending_hooks": string (3–5 hook, mỗi hook có status "open"),
  "chapter_summaries": string (giữ tiêu đề "## Chapter Summaries" và 1 dòng "(updated after each chapter)"),
  "subplot_board": string (3 subplot A/B/C),
  "emotional_arcs": string,
  "character_matrix": string (ma trận: ai biết gì về ai)
}`,
    },
  ];

  const result = await callLlmJson<ArchitectTruth>(
    messages,
    { temperature: 0.6, maxTokens: 2800, tier: "fast", timeoutMs: 45_000 },
    input.llm,
  );
  if (!result.current_state) throw new Error("Stage 4 (truth) thiếu current_state");
  return result;
}

// Convenience full run — sequential 4 stages. Long total wall-clock; use only
// when the caller is fine waiting (CLI-style). The web flow now calls each
// stage from the UI with its own request.
export async function runArchitect(input: ArchitectInput): Promise<ArchitectResult> {
  const core = await runArchitectCore(input);
  const cast = await runArchitectCast({ ...input, core });
  const plot = await runArchitectPlot({ ...input, core, cast });
  const skeleton: ArchitectSkeleton = { ...core, ...cast, ...plot };
  const truthSeeds = await runArchitectTruth({
    title: input.title,
    genreId: input.genreId,
    skeleton,
    llm: input.llm ?? null,
  });
  return { ...skeleton, truthSeeds };
}

// Older single-stage entry kept for compatibility — alias to core+cast+plot.
export async function runArchitectSkeleton(input: ArchitectInput): Promise<ArchitectSkeleton> {
  const core = await runArchitectCore(input);
  const cast = await runArchitectCast({ ...input, core });
  const plot = await runArchitectPlot({ ...input, core, cast });
  return { ...core, ...cast, ...plot };
}

export async function suggestBookSetting(input: {
  topic: string;
  genreId: string;
  llm?: LlmConfig | null;
}): Promise<{ title: string; authorIntent: string; currentFocus: string; briefDraft: string }> {
  const { genre } = genreContext(input.genreId);
  const messages: ChatMessage[] = [
    { role: "system", content: "Cố vấn cốt truyện. Trả DUY NHẤT JSON tiếng Việt." },
    {
      role: "user",
      content: `Ý tưởng: "${input.topic.trim().slice(0, 1000)}"
Thể loại: ${genre.labelVi}
JSON:
{
  "title": string (4–10 chữ có móc câu),
  "authorIntent": string (200–350 chữ Markdown),
  "currentFocus": string (150–250 chữ Markdown),
  "briefDraft": string (300–500 chữ Markdown)
}`,
    },
  ];
  return callLlmJson(messages, { temperature: 0.9, maxTokens: 1800, tier: "fast", timeoutMs: 35_000 }, input.llm);
}

void callLlm;

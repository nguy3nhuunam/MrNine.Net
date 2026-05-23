// Pipeline agents: Planner, Composer, Writer, Auditor, Reviser, Reflector.
// All run server-side and read/write through the Mongo store.

import { callLlm, callLlmJson, type ChatMessage } from "@/lib/story-writer/llm";
import { getGenre } from "@/lib/story-writer/genres";
import type { LlmConfig, SwAgentRole, SwBook, SwChapter, SwTruthFile, TruthKind } from "@/lib/story-writer/store";

function llmFor(book: SwBook, role: SwAgentRole): LlmConfig | null | undefined {
  const override = book.agentLlm?.[role];
  if (override) return override;
  return book.llm ?? null;
}

// ============================================================================
// PLANNER — emit intent.md (must-keep, must-avoid, conflict resolution)
// ============================================================================

export async function runPlanner(input: {
  book: SwBook;
  chapterNumber: number;
  contextBrief: string;
  truth: Record<TruthKind, SwTruthFile | undefined>;
  recentSummaries: string;
}): Promise<string> {
  const messages: ChatMessage[] = [
    {
      role: "system",
      content:
        "Bạn là Planner. Trước khi viết chương, hãy lập intent rõ ràng dạng Markdown. Tiếng Việt. Không bịa thêm setting.",
    },
    {
      role: "user",
      content: `Tựa đề: ${input.book.title} · Chương ${input.chapterNumber} / ${input.book.targetChapters}
Thể loại: ${input.book.genre}

Ý đồ tác giả (long-term):
${input.book.authorIntent || "(trống)"}

Trọng tâm hiện tại:
${input.book.currentFocus || "(trống)"}

Yêu cầu cụ thể của tác giả cho chương này:
${input.contextBrief.trim() || "(trống — tự đề xuất theo current_focus)"}

Tóm tắt 3 chương gần nhất:
${input.recentSummaries || "(chưa có chương nào trước đó)"}

Trạng thái thế giới hiện tại:
${input.truth.current_state?.content?.slice(0, 1500) || "(trống)"}

Hooks đang mở:
${input.truth.pending_hooks?.content?.slice(0, 1200) || "(trống)"}

Subplot board:
${input.truth.subplot_board?.content?.slice(0, 800) || "(trống)"}

Trả về Markdown duy nhất, các phần:
## Mục tiêu chương
## Phải có (Must-keep) — bullet 4–7 mục
## Tuyệt đối né (Must-avoid) — bullet 3–5 mục
## Hook cần đẩy / đóng — chỉ ra rõ hook nào
## Cảm xúc trục — diễn biến cảm xúc nhân vật chính
## Mục tiêu word count — ${input.book.chapterWords} chữ ± 10%`,
    },
  ];
  return callLlm(messages, { temperature: 0.6, maxTokens: 1500 }, llmFor(input.book, "planner"));
}

// ============================================================================
// COMPOSER — no-LLM. Slice truth files relevant to this chapter into JSON +
// produce a YAML-ish rule stack.
// ============================================================================

export type ComposedContext = {
  chapterNumber: number;
  selected: {
    storyBible: string;
    bookRules: string;
    currentState: string;
    pendingHooks: string;
    recentSummaries: string;
    subplotBoard: string;
    emotionalArcs: string;
    characterMatrix: string;
    particleLedger: string;
  };
  ruleStack: string;
  trace: {
    composedAt: string;
    truthVersions: Record<string, number>;
    targetWords: number;
    genreId: string;
  };
};

export function runComposer(input: {
  book: SwBook;
  chapterNumber: number;
  truth: Record<TruthKind, SwTruthFile | undefined>;
  recentSummaries: string;
}): ComposedContext {
  const truthVersions: Record<string, number> = {};
  for (const [k, v] of Object.entries(input.truth)) {
    if (v) truthVersions[k] = v.version;
  }
  const genre = getGenre(input.book.genre);
  const ruleStack = [
    "# Rule stack (priority high → low)",
    "1. book_rules.md (hard rules)",
    "2. genre style guide",
    "3. style fingerprint (if exists)",
    "4. truth files (current_state, particle_ledger, character_matrix)",
    "5. author_intent.md",
    "6. current_focus.md",
    "",
    "# Hard rules",
    input.book.bookRules || "(no book rules)",
    "",
    "# Genre rules",
    genre ? genre.styleGuide : "(no genre)",
    genre ? `\n## Banned cliché\n${genre.bannedCliche.map((b) => `- ${b}`).join("\n")}` : "",
    "",
    "# Style fingerprint",
    input.book.styleFingerprint
      ? `avg sentence length: ${input.book.styleFingerprint.avgSentenceLen.toFixed(1)} chars\n` +
        `top vocab: ${input.book.styleFingerprint.topWords
          .slice(0, 12)
          .map((w) => `${w.word}(${w.count})`)
          .join(", ")}\n` +
        `sample passage:\n${input.book.styleFingerprint.samplePassage.slice(0, 600)}`
      : "(none)",
  ].join("\n");

  return {
    chapterNumber: input.chapterNumber,
    selected: {
      storyBible: input.book.storyBible,
      bookRules: input.book.bookRules,
      currentState: input.truth.current_state?.content ?? "",
      pendingHooks: input.truth.pending_hooks?.content ?? "",
      recentSummaries: input.recentSummaries,
      subplotBoard: input.truth.subplot_board?.content ?? "",
      emotionalArcs: input.truth.emotional_arcs?.content ?? "",
      characterMatrix: input.truth.character_matrix?.content ?? "",
      particleLedger: input.truth.particle_ledger?.content ?? "",
    },
    ruleStack,
    trace: {
      composedAt: new Date().toISOString(),
      truthVersions,
      targetWords: input.book.chapterWords,
      genreId: input.book.genre,
    },
  };
}

// ============================================================================
// WRITER — emit final prose (Markdown).
// ============================================================================

export async function runWriter(input: {
  book: SwBook;
  chapterNumber: number;
  intent: string;
  composed: ComposedContext;
}): Promise<string> {
  const target = input.book.chapterWords;
  const minWords = Math.floor(target * 0.85);
  const maxWords = Math.ceil(target * 1.15);

  const messages: ChatMessage[] = [
    {
      role: "system",
      content:
        "Bạn là Writer chuyên viết tiểu thuyết Việt Nam, thuần Việt, không thuần dịch. Trả về MỘT khối Markdown gồm tiêu đề chương ở dòng đầu (vd '## Chương 1: ...') rồi đến nội dung. Tuyệt đối không thêm chú thích, không nhắc đến việc bạn là AI.",
    },
    {
      role: "user",
      content: `Đây là chương ${input.chapterNumber} của truyện "${input.book.title}".

# Intent (do Planner đã viết, BÁM SÁT):
${input.intent}

# Story bible (worldbuilding):
${input.composed.selected.storyBible.slice(0, 2000)}

# Book rules + style:
${input.composed.ruleStack}

# Trạng thái thế giới hiện tại:
${input.composed.selected.currentState.slice(0, 1500) || "(trống)"}

# Hooks đang mở:
${input.composed.selected.pendingHooks.slice(0, 1000) || "(trống)"}

# Subplot:
${input.composed.selected.subplotBoard.slice(0, 800) || "(trống)"}

# Cảm xúc trục:
${input.composed.selected.emotionalArcs.slice(0, 800) || "(trống)"}

# Tóm tắt các chương gần nhất:
${input.composed.selected.recentSummaries || "(chưa có)"}

# Tài sản / vật phẩm hiện có:
${input.composed.selected.particleLedger.slice(0, 800) || "(trống)"}

# Yêu cầu output
- Mục tiêu độ dài: ${target} chữ (chấp nhận ${minWords}–${maxWords})
- Đặt tiêu đề chương ở dòng đầu, dạng "## Chương ${input.chapterNumber}: <tiêu đề con>"
- Tránh các từ AI hay dùng (suy cho cùng, không thể phủ nhận, một cách khéo léo, đầy nghệ thuật, không hề ngạc nhiên, đáng kinh ngạc, đầy ấn tượng).
- Thoại tự nhiên, khoảng lặng có chỗ.
- Đẩy ít nhất một hook trong "Hooks đang mở" (progressing hoặc resolved).
- Kết chương có hook mới hoặc câu hỏi mở để dụ chương sau.
- Tuyệt đối không gọi tên độc giả, không break the fourth wall.`,
    },
  ];

  return callLlm(messages, { temperature: 0.85, maxTokens: 8000 }, llmFor(input.book, "writer"));
}

// ============================================================================
// 5-PART WRITER — split chapter generation into 5 beats so each LLM call stays
// well under Vercel's 60s function timeout. Each part targets roughly
// chapterWords / 5 and is conditioned on every previous part for continuity.
// ============================================================================

export type WriterPart = 1 | 2 | 3 | 4 | 5;

export async function runWriterPart(input: {
  book: SwBook;
  chapterNumber: number;
  intent: string;
  composed: ComposedContext;
  part: WriterPart;
  previousParts: string;
}): Promise<string> {
  const totalTarget = input.book.chapterWords;
  const partTarget = Math.round(totalTarget / 5);
  const partMin = Math.floor(partTarget * 0.8);
  const partMax = Math.ceil(partTarget * 1.25);

  const partSpec: Record<WriterPart, { name: string; mission: string; ending: string }> = {
    1: {
      name: "Phần 1 / 5 — Mở đầu",
      mission:
        "Mở chương bằng móc câu cụ thể (hành động, sự kiện, câu thoại có ẩn ý). Ổn định không gian, thời gian, cảm xúc trục của nhân vật chính. Giới thiệu tình huống đang diễn ra.",
      ending: "Kết phần 1 ở khoảnh khắc một xung đột nhỏ chính thức xuất hiện — chưa phát tán.",
    },
    2: {
      name: "Phần 2 / 5 — Dựng cảnh & leo thang sớm",
      mission:
        "Tiếp nối thẳng phần 1. Đẩy ngữ cảnh: nhân vật phụ tham gia, đối thoại có nội dung, lộ thêm thông tin nền. Đẩy nhẹ ít nhất một hook đang mở. Đảm bảo continuity tuyệt đối.",
      ending: "Kết phần 2 bằng tín hiệu rằng xung đột chính sắp ập đến (kẻ thù xuất hiện / quyết định lớn / phát hiện then chốt).",
    },
    3: {
      name: "Phần 3 / 5 — Trung điểm & lật bài",
      mission:
        "Đẩy xung đột tăng cường: nhân vật va chạm trực diện với đối thủ, dùng / mất tài nguyên, lộ bí mật quan trọng. Đây là khúc giữa, quyết định màu sắc của cao trào.",
      ending: "Kết phần 3 bằng twist hoặc bước ngoặt — đẩy nhân vật vào tình thế bắt buộc phải hành động lớn ở phần sau.",
    },
    4: {
      name: "Phần 4 / 5 — Cao trào",
      mission:
        "Cảnh cao trào ngắn gọn nhưng dồn dập theo intent. Câu ngắn, động từ mạnh, ít suy tư. Nhân vật ra quyết định / chiêu thức / lựa chọn quyết định.",
      ending: "Kết phần 4 ngay sau cao trào, khi kết quả vừa lộ ra (thắng/thua/bất phân) — chưa giải thích hệ quả.",
    },
    5: {
      name: "Phần 5 / 5 — Hậu quả & móc câu",
      mission:
        "Làm rõ hậu quả + trạng thái mới của nhân vật sau cao trào. Cập nhật quan hệ / vật phẩm / cảm xúc trong narration. Cài đặt mâu thuẫn cho chương sau.",
      ending: "Kết chương bằng một hook MỚI hoặc câu hỏi mở để dụ độc giả sang chương sau. Tuyệt đối không kết theo kiểu 'tóm lại' hay 'Hết chương'.",
    },
  };
  const spec = partSpec[input.part];

  const previousBlock = input.previousParts.trim()
    ? `# CÁC PHẦN ĐÃ VIẾT TRƯỚC (giữ continuity tuyệt đối):\n${input.previousParts.trim()}`
    : "(Đây là phần đầu tiên — chưa có phần nào trước.)";

  const titleLine = input.part === 1
    ? `Đặt tiêu đề chương ở dòng đầu, dạng "## Chương ${input.chapterNumber}: <tiêu đề con>" rồi xuống dòng và bắt đầu phần 1.`
    : `KHÔNG lặp lại tiêu đề chương. Bắt đầu thẳng vào nội dung phần ${input.part}, ăn nhịp tự nhiên với phần trước (xuống dòng phù hợp).`;

  const messages: ChatMessage[] = [
    {
      role: "system",
      content:
        "Bạn là Writer chuyên viết tiểu thuyết Việt Nam, thuần Việt, không thuần dịch. Trả MỘT khối Markdown chỉ chứa nội dung phần này, không thêm chú thích / metadata / 'Phần X' tiêu đề thừa. Không nhắc bạn là AI.",
    },
    {
      role: "user",
      content: `Truyện: "${input.book.title}" — Chương ${input.chapterNumber}.

# ${spec.name}
Nhiệm vụ: ${spec.mission}
Cách kết: ${spec.ending}

${previousBlock}

# Intent của cả chương (BÁM SÁT):
${input.intent.slice(0, 1200)}

# Story bible:
${input.composed.selected.storyBible.slice(0, 800)}

# Rule stack:
${input.composed.ruleStack.slice(0, 800)}

# Trạng thái thế giới:
${input.composed.selected.currentState.slice(0, 600) || "(trống)"}

# Hooks đang mở:
${input.composed.selected.pendingHooks.slice(0, 500) || "(trống)"}

# Cảm xúc trục:
${input.composed.selected.emotionalArcs.slice(0, 400) || "(trống)"}

# Tài sản:
${input.composed.selected.particleLedger.slice(0, 400) || "(trống)"}

# Tóm tắt chương gần nhất:
${input.composed.selected.recentSummaries.slice(0, 800) || "(chưa có)"}

# Yêu cầu PHẦN ${input.part} / 5
- Độ dài phần này: ~${partTarget} chữ (chấp nhận ${partMin}–${partMax}). Cả chương ~${totalTarget} chữ.
- ${titleLine}
- Tránh các từ AI hay dùng (suy cho cùng, không thể phủ nhận, một cách khéo léo, đầy nghệ thuật, không hề ngạc nhiên, đáng kinh ngạc, đầy ấn tượng).
- Thoại tự nhiên, có khoảng lặng.
- Không gọi tên độc giả, không break the fourth wall, không xưng "tôi/AI".
- KHÔNG kết phần bằng câu kiểu "Hết phần X" — viết liền mạch để gộp được.`,
    },
  ];

  return callLlm(
    messages,
    { temperature: 0.85, maxTokens: 2500, tier: "fast", timeoutMs: 40_000 },
    llmFor(input.book, "writer"),
  );
}

// Merge 5 part strings into one chapter draft. Strips leading chapter title
// from parts 2-5 if the model accidentally repeats it.
export function mergeChapterParts(
  part1: string,
  part2: string,
  part3: string,
  part4: string,
  part5: string,
): string {
  const stripTitle = (s: string) =>
    s.replace(/^##\s*[Cc]hương\s*\d+\s*[:.\-][^\n]*\n+/m, "").trim();
  const blocks = [
    part1.trim(),
    stripTitle(part2 || ""),
    stripTitle(part3 || ""),
    stripTitle(part4 || ""),
    stripTitle(part5 || ""),
  ].filter(Boolean);
  return blocks.join("\n\n");
}

// ============================================================================
// AUDITOR — 33-dim continuity check returning structured JSON.
// ============================================================================

export const AUDIT_DIMENSIONS: ReadonlyArray<{ id: string; labelVi: string; group: string }> = [
  { id: "char-location", labelVi: "Vị trí nhân vật", group: "Continuity" },
  { id: "char-knowledge", labelVi: "Hiểu biết nhân vật", group: "Continuity" },
  { id: "char-relationship", labelVi: "Quan hệ nhân vật", group: "Continuity" },
  { id: "resource-ledger", labelVi: "Tài sản / vật phẩm", group: "Continuity" },
  { id: "time-continuity", labelVi: "Mốc thời gian", group: "Continuity" },
  { id: "physical-state", labelVi: "Trạng thái thể chất", group: "Continuity" },
  { id: "info-boundary", labelVi: "Ranh giới thông tin", group: "Continuity" },
  { id: "foreshadow-status", labelVi: "Foreshadow đang mở", group: "Hooks" },
  { id: "foreshadow-recovery", labelVi: "Khôi phục foreshadow lâu", group: "Hooks" },
  { id: "reader-promise", labelVi: "Lời hứa với độc giả", group: "Hooks" },
  { id: "subplot-stagnation", labelVi: "Subplot bị bỏ quên", group: "Hooks" },
  { id: "outline-drift", labelVi: "Lệch khỏi current_focus", group: "Direction" },
  { id: "intent-compliance", labelVi: "Tuân theo intent", group: "Direction" },
  { id: "author-intent-drift", labelVi: "Lệch author_intent", group: "Direction" },
  { id: "pacing", labelVi: "Tốc độ kể", group: "Craft" },
  { id: "scene-structure", labelVi: "Cấu trúc cảnh", group: "Craft" },
  { id: "dialogue-voice", labelVi: "Giọng nhân vật trong thoại", group: "Craft" },
  { id: "show-vs-tell", labelVi: "Show vs tell", group: "Craft" },
  { id: "sensory-detail", labelVi: "Chi tiết giác quan", group: "Craft" },
  { id: "internal-monologue", labelVi: "Độc thoại nội tâm", group: "Craft" },
  { id: "emotional-arc", labelVi: "Cung cảm xúc", group: "Craft" },
  { id: "emotional-truth", labelVi: "Chân thật cảm xúc", group: "Craft" },
  { id: "world-consistency", labelVi: "Đồng nhất worldbuilding", group: "World" },
  { id: "magic-system", labelVi: "Quy luật phép thuật / sức mạnh", group: "World" },
  { id: "society-customs", labelVi: "Tập tục xã hội", group: "World" },
  { id: "geography", labelVi: "Địa lý / khoảng cách", group: "World" },
  { id: "language-register", labelVi: "Mức độ lễ nghi ngôn từ", group: "World" },
  { id: "word-count", labelVi: "Đạt mục tiêu word count", group: "Form" },
  { id: "chapter-shape", labelVi: "Mở – đỉnh – kết chương", group: "Form" },
  { id: "ai-tell-vocab", labelVi: "Từ vựng AI hay dùng", group: "AI-tell" },
  { id: "ai-tell-pattern", labelVi: "Mẫu câu AI", group: "AI-tell" },
  { id: "repetition", labelVi: "Lặp ý / lặp từ trong chương", group: "AI-tell" },
  { id: "cliche", labelVi: "Cliché thể loại", group: "Quality" },
];

export type AuditIssue = {
  dimension: string;
  severity: "low" | "medium" | "high";
  message: string;
  suggestion?: string;
};

export type AuditReport = {
  overallScore: number; // 0–100
  issues: AuditIssue[];
  aiTellRate: number; // 0–1
};

const dimList = AUDIT_DIMENSIONS.map((d) => `${d.id} (${d.labelVi}, nhóm ${d.group})`).join("\n");

export async function runAuditor(input: {
  book: SwBook;
  chapterNumber: number;
  draft: string;
  intent: string;
  composed: ComposedContext;
}): Promise<AuditReport> {
  const messages: ChatMessage[] = [
    {
      role: "system",
      content:
        "Bạn là Continuity Auditor. Đọc bản nháp chương và truth files, tìm vấn đề trên 33 chiều. Trả DUY NHẤT JSON. Tiếng Việt.",
    },
    {
      role: "user",
      content: `33 chiều cần kiểm tra:
${dimList}

# Intent của chương:
${input.intent}

# Truth files:
## current_state
${input.composed.selected.currentState.slice(0, 1500)}
## particle_ledger
${input.composed.selected.particleLedger.slice(0, 800)}
## pending_hooks
${input.composed.selected.pendingHooks.slice(0, 1000)}
## subplot_board
${input.composed.selected.subplotBoard.slice(0, 800)}
## emotional_arcs
${input.composed.selected.emotionalArcs.slice(0, 800)}
## character_matrix
${input.composed.selected.characterMatrix.slice(0, 1000)}
## chapter_summaries (gần nhất)
${input.composed.selected.recentSummaries}

# Bản nháp chương ${input.chapterNumber}:
${input.draft.slice(0, 14000)}

# Yêu cầu trả JSON:
{
  "overallScore": number (0-100, càng cao càng ổn),
  "aiTellRate": number (0-1, ước tính tỉ lệ câu nghi là AI viết),
  "issues": Array<{
    "dimension": string (đúng id ở trên),
    "severity": "low" | "medium" | "high",
    "message": string (mô tả ngắn),
    "suggestion": string (gợi ý sửa, có thể trống)
  }>
}

Quy tắc:
- Chỉ nêu issue có dẫn chứng cụ thể trong text. Tuyệt đối không phỏng đoán.
- Nếu không có vấn đề thì issues = [].
- High = phá vỡ continuity / sai facts; Medium = lỗi nghệ thuật rõ; Low = gợi ý nhẹ.
- aiTellRate ước tính dựa trên số câu thừa văn vẻ, từ AI hay dùng, lặp cấu trúc.`,
    },
  ];

  const result = await callLlmJson<AuditReport>(
    messages,
    { temperature: 0.2, maxTokens: 3000, tier: "fast", timeoutMs: 50_000 },
    llmFor(input.book, "auditor"),
  );
  if (typeof result.overallScore !== "number") result.overallScore = 70;
  if (typeof result.aiTellRate !== "number") result.aiTellRate = 0;
  if (!Array.isArray(result.issues)) result.issues = [];
  return result;
}

// ============================================================================
// REVISER — fix critical issues, return revised draft.
// ============================================================================

export async function runReviser(input: {
  book: SwBook;
  chapterNumber: number;
  draft: string;
  audit: AuditReport;
  composed: ComposedContext;
  mode?: "default" | "anti-detect";
}): Promise<string> {
  const issues = input.audit.issues
    .filter((i) => i.severity !== "low")
    .map((i, idx) => `${idx + 1}. [${i.severity}] ${i.dimension}: ${i.message}${i.suggestion ? ` (gợi ý: ${i.suggestion})` : ""}`)
    .join("\n");

  const antiDetectGuidance =
    input.mode === "anti-detect"
      ? `\nƯU TIÊN: giảm AI-tell. Tránh các câu công thức, đa dạng độ dài câu, thay từ AI-tell điển hình (suy cho cùng, không thể phủ nhận, một cách khéo léo, đầy nghệ thuật) bằng từ Việt thuần.`
      : "";

  const messages: ChatMessage[] = [
    {
      role: "system",
      content:
        "Bạn là Reviser. Sửa các vấn đề được liệt kê NHƯNG GIỮ TỐI ĐA cấu trúc và giọng văn của bản nháp. Chỉ sửa chỗ có vấn đề. Trả về toàn văn chương đã sửa, dạng Markdown bắt đầu bằng dòng tiêu đề chương.",
    },
    {
      role: "user",
      content: `Đây là bản nháp chương ${input.chapterNumber}:
${input.draft}

Các vấn đề cần sửa (severity medium/high):
${issues || "(không có vấn đề lớn — chỉ tinh chỉnh AI-tell nếu mode anti-detect)"}
${antiDetectGuidance}

Yêu cầu:
- Trả TOÀN VĂN chương đã sửa, không chừa phần nào.
- Không thêm chú thích / không bình luận sửa gì.
- Giữ nguyên tiêu đề chương ở dòng đầu nếu có.
- Mục tiêu word count: ${input.book.chapterWords} chữ ± 10%.`,
    },
  ];

  return callLlm(messages, { temperature: 0.7, maxTokens: 8000 }, llmFor(input.book, "reviser"));
}

// ============================================================================
// REFLECTOR — extract truth-file deltas from final chapter text.
// ============================================================================

export type TruthDelta = Partial<Record<TruthKind, string>> & {
  chapterSummaryAppend?: string;
};

export async function runReflector(input: {
  book: SwBook;
  chapterNumber: number;
  finalText: string;
  composed: ComposedContext;
}): Promise<TruthDelta> {
  const messages: ChatMessage[] = [
    {
      role: "system",
      content:
        "Bạn là Reflector. Đọc chương cuối cùng đã được duyệt, cập nhật 7 truth files. Trả DUY NHẤT JSON. Mỗi truth file trả TOÀN VĂN bản mới (đã merge với bản cũ), không phải diff. Nếu không thay đổi thì bỏ qua field đó. Tiếng Việt.",
    },
    {
      role: "user",
      content: `# Truth files HIỆN TẠI (trước chương ${input.chapterNumber}):

## current_state
${input.composed.selected.currentState.slice(0, 2000)}

## particle_ledger
${input.composed.selected.particleLedger.slice(0, 1200)}

## pending_hooks
${input.composed.selected.pendingHooks.slice(0, 1500)}

## chapter_summaries
${input.composed.selected.recentSummaries.slice(0, 1500)}

## subplot_board
${input.composed.selected.subplotBoard.slice(0, 1000)}

## emotional_arcs
${input.composed.selected.emotionalArcs.slice(0, 1000)}

## character_matrix
${input.composed.selected.characterMatrix.slice(0, 1500)}

# Toàn văn chương ${input.chapterNumber}:
${input.finalText.slice(0, 14000)}

# Trả JSON:
{
  "current_state"?: string (toàn văn mới),
  "particle_ledger"?: string,
  "pending_hooks"?: string (đánh dấu hook đã đẩy / đã đóng / mới mở),
  "subplot_board"?: string,
  "emotional_arcs"?: string,
  "character_matrix"?: string,
  "chapterSummaryAppend": string (200–350 chữ tóm tắt chương ${input.chapterNumber}: cast tham gia, sự kiện chính, state changes, hook movement)
}

Chỉ trả về truth file nào có thay đổi do chương mới này gây ra. chapterSummaryAppend luôn phải có.`,
    },
  ];

  return callLlmJson<TruthDelta>(
    messages,
    { temperature: 0.4, maxTokens: 4000, tier: "fast", timeoutMs: 50_000 },
    llmFor(input.book, "reflector"),
  );
}

// ============================================================================
// AI-TELL DETECTOR — heuristic + LLM combined.
// ============================================================================

const AI_TELL_PATTERNS: ReadonlyArray<{ pattern: RegExp; label: string }> = [
  { pattern: /\bsuy cho cùng\b/gi, label: "suy cho cùng" },
  { pattern: /\bkhông thể phủ nhận\b/gi, label: "không thể phủ nhận" },
  { pattern: /\bmột cách khéo léo\b/gi, label: "một cách khéo léo" },
  { pattern: /\bđầy nghệ thuật\b/gi, label: "đầy nghệ thuật" },
  { pattern: /\bkhông hề ngạc nhiên\b/gi, label: "không hề ngạc nhiên" },
  { pattern: /\bđáng kinh ngạc\b/gi, label: "đáng kinh ngạc" },
  { pattern: /\bđầy ấn tượng\b/gi, label: "đầy ấn tượng" },
  { pattern: /\btoát lên vẻ\b/gi, label: "toát lên vẻ" },
  { pattern: /\bnhư thể\s+.{0,40}\s+đang\s+/gi, label: "như thể … đang …" },
  { pattern: /\btràn đầy\b/gi, label: "tràn đầy" },
];

export function detectAiTellHeuristic(text: string): {
  matches: Array<{ label: string; count: number }>;
  ratePer1000: number;
} {
  const counts = new Map<string, number>();
  let total = 0;
  for (const { pattern, label } of AI_TELL_PATTERNS) {
    const found = text.match(pattern);
    if (found) {
      counts.set(label, (counts.get(label) ?? 0) + found.length);
      total += found.length;
    }
  }
  const wordCount = text.split(/\s+/).length || 1;
  return {
    matches: Array.from(counts.entries()).map(([label, count]) => ({ label, count })),
    ratePer1000: (total * 1000) / wordCount,
  };
}

void callLlm;
export type { LlmConfig };

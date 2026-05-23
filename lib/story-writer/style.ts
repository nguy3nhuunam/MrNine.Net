// Style analysis tools — derive a statistical fingerprint of a sample text
// plus an LLM-generated style guide. Used by the Writer to mimic the user's
// or a reference author's voice.

import { callLlm, type ChatMessage } from "@/lib/story-writer/llm";
import type { LlmConfig } from "@/lib/story-writer/store";

export type StyleFingerprint = {
  avgSentenceLen: number;
  sentenceLenStdDev: number;
  topWords: Array<{ word: string; count: number }>;
  samplePassage: string;
};

const STOP_WORDS = new Set([
  "và", "là", "của", "có", "được", "không", "với", "ở", "trong", "đã",
  "này", "thì", "cho", "khi", "đang", "mà", "đó", "ra", "lên", "xuống",
  "một", "các", "rồi", "lại", "nó", "ai", "nào", "nếu", "vẫn", "đi",
  "the", "a", "an", "and", "or", "but", "of", "in", "on", "at", "to",
  "is", "are", "was", "were", "it", "this", "that", "with", "for",
]);

export function buildFingerprint(text: string, sampleLimit = 1500): StyleFingerprint {
  const cleaned = text.replace(/\s+/g, " ").trim();
  const sentences = cleaned
    .split(/[.!?。!?…]\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const lens = sentences.map((s) => s.length);
  const avg = lens.length ? lens.reduce((a, b) => a + b, 0) / lens.length : 0;
  const variance = lens.length
    ? lens.reduce((acc, n) => acc + (n - avg) ** 2, 0) / lens.length
    : 0;

  const wordRe = /[\p{L}]+/gu;
  const counts = new Map<string, number>();
  for (const m of cleaned.matchAll(wordRe)) {
    const word = m[0].toLowerCase();
    if (word.length < 2 || STOP_WORDS.has(word)) continue;
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }
  const top = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .map(([word, count]) => ({ word, count }));

  return {
    avgSentenceLen: Number(avg.toFixed(1)),
    sentenceLenStdDev: Number(Math.sqrt(variance).toFixed(1)),
    topWords: top,
    samplePassage: cleaned.slice(0, sampleLimit),
  };
}

export async function describeStyle(input: {
  fingerprint: StyleFingerprint;
  llm?: LlmConfig | null;
}): Promise<string> {
  const messages: ChatMessage[] = [
    {
      role: "system",
      content:
        "Bạn là cố vấn văn phong. Đọc đặc trưng thống kê + đoạn mẫu rồi viết style guide tiếng Việt 250–400 chữ Markdown để Writer agent có thể bắt chước.",
    },
    {
      role: "user",
      content: `Đặc trưng:
- Chiều dài câu trung bình: ${input.fingerprint.avgSentenceLen} ký tự (lệch chuẩn ${input.fingerprint.sentenceLenStdDev})
- Từ tần suất cao: ${input.fingerprint.topWords
        .slice(0, 20)
        .map((w) => `${w.word}(${w.count})`)
        .join(", ")}

Đoạn mẫu (giữ lại để cảm nhận giọng):
${input.fingerprint.samplePassage}

Yêu cầu trả Markdown gồm:
## Tóm tắt phong cách (1 câu)
## Câu cú (chiều dài, nhịp, dấu phẩy / dấu chấm)
## Từ vựng (kiểu từ chuộng, từ kiêng)
## Hội thoại (mật độ, cảm xúc, độ trau chuốt)
## Mô tả cảnh / nội tâm (chi tiết giác quan, ẩn dụ)
## Lỗi cần né khi mimic`,
    },
  ];
  return callLlm(messages, { temperature: 0.5, maxTokens: 1500 }, input.llm);
}

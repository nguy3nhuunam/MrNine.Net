// Short-form story generator. One short story = title + body + sales hook +
// cover prompt, generated in a single LLM call. No DB persistence — caller
// gets back the artifacts directly so the UI can offer download/save.

import { callLlmJson, type ChatMessage } from "@/lib/story-writer/llm";
import { getGenre } from "@/lib/story-writer/genres";
import type { LlmConfig } from "@/lib/story-writer/store";

export type ShortStoryRequest = {
  direction: string;
  genreId: string;
  chars: number; // target character count
  chapters: number; // 1-3
  llm?: LlmConfig | null;
};

export type ShortStoryResult = {
  title: string;
  fullMarkdown: string;
  salesPackage: {
    hookLines: string[];
    socialPost: string;
    coverDescription: string;
  };
  coverPrompt: string;
  wordCount: number;
};

export async function runShortStory(input: ShortStoryRequest): Promise<ShortStoryResult> {
  const genre = getGenre(input.genreId);
  if (!genre) throw new Error(`Genre không hợp lệ: ${input.genreId}`);

  const chars = Math.max(800, Math.min(8000, Math.floor(input.chars)));
  const chapters = Math.max(1, Math.min(3, Math.floor(input.chapters)));

  const messages: ChatMessage[] = [
    {
      role: "system",
      content:
        "Bạn là tác giả viết truyện ngắn hoàn chỉnh. Trả DUY NHẤT JSON. Tiếng Việt thuần, không dịch máy. Mỗi truyện phải có khúc dạo - cao trào - kết, không cụt.",
    },
    {
      role: "user",
      content: `Yêu cầu:
- Hướng truyện: ${input.direction.trim()}
- Thể loại: ${genre.labelVi} (${genre.labelEn}) — đối tượng: ${genre.audienceVi}
- Style guide: ${genre.styleGuide}
- Cliché tránh: ${genre.bannedCliche.join("; ")}
- Số chương: ${chapters} (mỗi chương đều có chủ đề rõ, kết chương có hook hoặc kết trọn)
- Độ dài tổng: ~${chars} ký tự (chấp nhận ±15%)

Trả JSON:
{
  "title": string (5-12 chữ, có móc câu),
  "fullMarkdown": string (Markdown — mỗi chương bắt đầu bằng '## Chương N: <tên>' rồi đến nội dung),
  "salesPackage": {
    "hookLines": string[3] (3 câu hook ngắn để giật ở đầu social),
    "socialPost": string (1 caption Facebook/Threads ~120 chữ kèm hashtag),
    "coverDescription": string (mô tả ảnh cover phù hợp ~80 chữ)
  },
  "coverPrompt": string (prompt tạo ảnh ở dạng tiếng Anh để dùng với FAL/MJ, ~50-90 từ, tả mood + style + bối cảnh),
  "wordCount": number (đếm từ trong fullMarkdown)
}

Lưu ý:
- Tuyệt đối không thêm chú thích ngoài JSON.
- Không nói 'là một AI'.
- Truyện phải hoàn chỉnh, không cụt giữa.`,
    },
  ];

  const result = await callLlmJson<ShortStoryResult>(
    messages,
    { temperature: 0.9, maxTokens: 5000 },
    input.llm,
  );
  if (!result.title || !result.fullMarkdown) {
    throw new Error("Short story trả về thiếu title hoặc fullMarkdown");
  }
  if (!result.salesPackage) {
    result.salesPackage = { hookLines: [], socialPost: "", coverDescription: "" };
  }
  if (!result.coverPrompt) result.coverPrompt = "";
  if (typeof result.wordCount !== "number") {
    result.wordCount = result.fullMarkdown.split(/\s+/).filter(Boolean).length;
  }
  return result;
}

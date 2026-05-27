import type { Metadata } from "next";
import { LanguageTutorShell } from "@/components/LanguageTutorShell";

export const metadata: Metadata = {
  title: "Language Tutor — học ngôn ngữ qua chat · MrNine",
  description: "Trợ lý học ngoại ngữ: chat song ngữ với sửa câu, giải thích lỗi và từ vựng kèm IPA. Hỗ trợ Anh / Nhật / Trung / Hàn / Pháp / Tây Ban Nha / Đức.",
  openGraph: {
    title: "Language Tutor — MrNine",
    description: "Học Anh, Nhật, Trung, Hàn, Pháp, Tây Ban Nha, Đức qua hội thoại có sửa lỗi.",
  },
};

export default function LanguageTutorPage() {
  return <LanguageTutorShell />;
}

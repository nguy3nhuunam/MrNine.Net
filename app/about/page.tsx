import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Giới thiệu",
  description: "MrNine là trung tâm điều khiển AI cá nhân — viết, vẽ, voice, video, tài liệu trong cùng một nơi.",
};

export default function AboutPage() {
  return (
    <article className="prose prose-invert max-w-none prose-headings:font-display prose-headings:tracking-tight prose-h1:text-3xl prose-h2:mt-10 prose-h2:text-xl prose-p:text-white/75 prose-li:text-white/75 prose-a:text-amber-400">
      <h1>Giới thiệu MrNine</h1>
      <p>
        MrNine là một <strong>control deck AI cá nhân</strong> — gom các tác vụ AI bạn dùng hàng ngày (viết
        truyện, dịch tài liệu, render ảnh/video, làm flashcards, lập lá số tử vi, đọc tarot, kể giọng, tóm tắt
        video) vào một giao diện lệnh duy nhất.
      </p>
      <p>
        Mỗi module được thiết kế cho một workflow rõ ràng, không phải một chatbox vạn năng. Kết quả: bạn ít
        gõ prompt hơn, nhanh hơn và dùng đúng công cụ cho từng việc.
      </p>

      <h2>Module hiện có</h2>
      <ul>
        <li><Link href="/ai-playground">AI Playground</Link> — render image &amp; video qua FAL.</li>
        <li><Link href="/photo-fix">Photo Fix</Link> — xoá nền, làm sạch ảnh.</li>
        <li><Link href="/voice-studio">Voice Studio</Link> — TTS đa giọng qua OmniVoice.</li>
        <li><Link href="/video-studio">Video Studio</Link> — pipeline ghép video AI.</li>
        <li><Link href="/story-writer">Story Writer</Link> — pipeline viết tiểu thuyết Plan → Write → Audit → Revise.</li>
        <li><Link href="/smart-recap">Smart Recap</Link> — tóm tắt URL, YouTube, văn bản dài.</li>
        <li><Link href="/docsense">DocSense</Link> — OCR + dịch tài liệu.</li>
        <li><Link href="/mystic-deck">Mystic Deck</Link> — tử vi, tarot, thần số học có luận giải AI.</li>
        <li><Link href="/language-tutor">Flashcards</Link> — flashcards FSRS-6 từ tài liệu của bạn.</li>
        <li><Link href="/markets">Markets</Link> — giá vàng/bạc/crypto/forex realtime.</li>
        <li><Link href="/calculators">Calculators</Link> — bộ máy tính: thuế, khoản vay, BMI...</li>
        <li><Link href="/tools">Tools</Link> — JSON, regex, base64, hash, ngày tháng...</li>
        <li><Link href="/ai-store">AI Store</Link> — danh mục tài khoản AI tham khảo.</li>
      </ul>

      <h2>Hạ tầng</h2>
      <ul>
        <li>Next.js 16 + React 19 + Tailwind 4, deploy trên Vercel.</li>
        <li>MongoDB Atlas cho user, credit, tác phẩm.</li>
        <li>NextAuth (Google + Discord) cho đăng nhập.</li>
        <li>Yunwu cho LLM, FAL cho image/video model, OmniVoice cho TTS.</li>
      </ul>

      <h2>Mã nguồn &amp; phản hồi</h2>
      <p>
        Repo cá nhân, không mở public. Báo lỗi, đề xuất tính năng hoặc khiếu nại pháp lý gửi tới Discord của
        tác giả (xem profile trên GitHub <code>nguyenhuunam</code>).
      </p>

      <h2>Chính sách</h2>
      <ul>
        <li><Link href="/legal/privacy">Quyền riêng tư</Link></li>
        <li><Link href="/legal/terms">Điều khoản sử dụng</Link></li>
      </ul>
    </article>
  );
}

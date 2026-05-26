// Structured site knowledge consumed by the Ask anything chatbot system
// prompt. Keep entries factual and short — the model needs context, not prose.
import { allModels as falModels } from "@/lib/fal-models";

type ModuleEntry = {
  title: string;
  status: "live" | "soon";
  route?: string;
  shortcut?: string;
  summaryVi: string;
  capabilitiesVi: ReadonlyArray<string>;
  howVi: string;
};

const moduleEntries: ReadonlyArray<ModuleEntry> = [
  {
    title: "AI Playground",
    status: "live",
    route: "/ai-playground",
    shortcut: "1",
    summaryVi: "Studio render ảnh/video bằng các model FAL.AI (text-to-image, image-to-image, text-to-video, image-to-video, motion-control).",
    capabilitiesVi: [
      "Tạo ảnh từ prompt với 40+ model (FLUX 2, Imagen 4, Nano Banana, Seedream, Recraft, Ideogram, ...).",
      "Edit ảnh có sẵn: thay nền, đổi trang phục, fix mặt, outpaint, upscale.",
      "Tạo video từ prompt hoặc từ ảnh (Sora 2, Veo 3.1, Kling 3 Pro, Seedance 2.0, ...).",
      "Lịch sử render lưu trong localStorage, deep-link theo capability+model.",
    ],
    howVi: "Mở /ai-playground, chọn tab capability, chọn model, nhập prompt và (nếu cần) URL ảnh nguồn, bấm Submit. Tham số nâng cao mở ở panel Advanced.",
  },
  {
    title: "Photo Fix",
    status: "live",
    route: "/photo-fix",
    shortcut: "2",
    summaryVi: "Bàn xử lý ảnh có sẵn: tách nền, đổi nền, làm nét, restore ảnh cũ, sửa khuôn mặt.",
    capabilitiesVi: [
      "Remove background (Bria), replace background bằng prompt mô tả nền mới.",
      "Upscale/clarity, GFPGAN/CodeFormer phục hồi mặt mờ.",
      "Inpaint, outpaint, eraser bằng mask.",
    ],
    howVi: "Mở /photo-fix, chọn thao tác (operation), upload ảnh hoặc dán URL, mô tả thay đổi nếu thao tác cần prompt, bấm Run.",
  },
  {
    title: "Smart Recap",
    status: "live",
    route: "/smart-recap",
    shortcut: "3",
    summaryVi: "Tóm tắt YouTube link, video upload, PDF dài hoặc URL bài web thành bản tóm tắt 1 phút.",
    capabilitiesVi: [
      "Hỗ trợ link YouTube, upload mp4/mp3, file PDF, URL bài viết.",
      "Trả về tóm tắt cấu trúc + key takeaways.",
    ],
    howVi: "Mở /smart-recap, paste link hoặc upload file, chọn ngôn ngữ output, bấm Recap.",
  },
  {
    title: "DocSense",
    status: "live",
    route: "/docsense",
    shortcut: "4",
    summaryVi: "OCR ảnh hoặc PDF rồi dịch chuyên nghiệp, giữ nguyên bố cục/bảng/hình ảnh.",
    capabilitiesVi: [
      "OCR đa ngôn ngữ.",
      "Dịch song song giữ format gốc.",
      "Xuất kết quả ra PDF hoặc text.",
    ],
    howVi: "Mở /docsense, upload PDF/ảnh, chọn ngôn ngữ đích, bấm Run.",
  },
  {
    title: "Story Writer",
    status: "live",
    route: "/story-writer",
    shortcut: "5",
    summaryVi: "Studio viết truyện dài: dàn ý, hệ thống nhân vật, chương, bộ nhớ dự án, chế độ đọc, generate cover ảnh.",
    capabilitiesVi: [
      "Tạo book với premise + tone + style.",
      "Sinh dàn ý nhiều volume, chương theo chương; track relationship/foreshadow.",
      "Phần (part) viết bằng tier nhanh (gpt-4o-mini), prompt nén context để tránh runaway.",
      "Cover bằng Imagen 4.",
    ],
    howVi: "Mở /story-writer, tạo book mới hoặc mở book cũ, sinh outline rồi generate từng chương/part. Reading mode để đọc liền mạch.",
  },
  {
    title: "Story Forge",
    status: "live",
    route: "/story-forge",
    summaryVi: "Studio plot/character chạy InkOS bên trong shell MrNine, dùng cho dự án truyện cấu trúc nặng.",
    capabilitiesVi: ["Iframe InkOS Studio gốc, đầy đủ tính năng."],
    howVi: "Mở /story-forge — khởi động runtime InkOS local rồi làm việc trong UI Streamlit.",
  },
  {
    title: "Voice Studio",
    status: "live",
    route: "/voice-studio",
    summaryVi: "OmniVoice Studio: TTS hơn 600 ngôn ngữ, voice cloning, voice design, transcribe.",
    capabilitiesVi: ["Voice cloning từ sample.", "TTS đa giọng.", "Dubbing và transcribe ra subtitle."],
    howVi: "Mở /voice-studio — chạy runtime OmniVoice rồi dùng UI Gradio bên trong.",
  },
  {
    title: "Video Studio",
    status: "live",
    route: "/video-studio",
    summaryVi: "Pixelle-Video Studio: kịch bản → video, workflow ảnh và video, thuyết minh giọng.",
    capabilitiesVi: ["Script-to-video.", "Image+video workflow.", "Voice narration tích hợp."],
    howVi: "Mở /video-studio — runtime Pixelle local rồi làm việc trong UI Streamlit.",
  },
  {
    title: "Language Tutor",
    status: "soon",
    shortcut: "6",
    summaryVi: "Đối thoại có sửa lỗi, chấm essay, flashcard và từ vựng theo chủ đề. Đang phát triển.",
    capabilitiesVi: [],
    howVi: "Chưa mở — sẽ ra mắt sau.",
  },
  {
    title: "Mystic Deck",
    status: "live",
    route: "/mystic-deck",
    shortcut: "7",
    summaryVi: "Bộ bài huyền học: lập lá số Tử Vi Đẩu Số 12 cung, thần số học Pythagore, trải bài tarot 3 lá. Đặt tên ngũ hành đang phát triển.",
    capabilitiesVi: [
      "Lập lá số Tử Vi từ ngày dương + giờ + giới tính (chạy bằng iztro local, không gọi API).",
      "Thần số học: Life Path, Birthday, Expression, Soul Urge, Personality theo bảng Pythagore (master 11/22/33).",
      "Tarot: trải bài 3 lá Past/Present/Future, hỗ trợ xuôi/ngược, ý nghĩa tiếng Việt.",
      "Tab Đặt tên ngũ hành: coming soon.",
      "Mỗi tab Tử Vi / Numerology / Tarot có nút Luận giải dùng AI để tổng hợp dữ liệu thành bản đọc có cấu trúc + lời khuyên hành động.",
    ],
    howVi: "Mở /mystic-deck, chọn tab tương ứng. Tử vi: nhập ngày dương + giờ Tý-Hợi + giới tính rồi bấm Lập lá số. Thần số: ngày sinh + họ tên. Tarot: bấm Rút bài.",
  },
  {
    title: "Voice Lab",
    status: "soon",
    shortcut: "8",
    summaryVi: "Phiên bản mở rộng của Voice Studio cho TTS đa giọng + clone + dubbing + transcribe. Đang phát triển.",
    capabilitiesVi: [],
    howVi: "Chưa mở — phiên bản hiện hành dùng Voice Studio.",
  },
  {
    title: "Markets",
    status: "live",
    route: "/markets",
    shortcut: "9",
    summaryVi: "Bảng giá realtime: top 10 crypto, vàng (PAXG ≈ 1 oz), bạc (XAG), và 4 cặp ngoại tệ vs VND (USD, CNY, TWD, JPY). Tự cập nhật mỗi 60 giây.",
    capabilitiesVi: [
      "Top 10 crypto theo nhận diện: BTC, ETH, BNB, SOL, XRP, DOGE, ADA, TRX, AVAX, TON. Sparkline 7 ngày từ CoinGecko.",
      "Vàng PAXG (1 token = 1 troy ounce vàng) và bạc XAG spot. Quy đổi VND theo tỉ giá USD/VND realtime.",
      "Forex: USD/VND, CNY/VND, TWD/VND, JPY/VND lấy từ Exchange-Rate-API.",
      "Card hiển thị giá USD + VND, % thay đổi 24h, sparkline. Auto-refresh 60s, có thể tạm dừng.",
      "Giá thị trường cũng xuất hiện trên ticker home và search palette (gõ BTC/ETH/XAU/USD để tìm).",
    ],
    howVi: "Mở /markets để xem toàn bộ bảng giá. Trên home gõ tên ký hiệu trong search bar (BTC, ETH, XAU, ...) để mở nhanh card tương ứng. Auto-refresh bật mặc định.",
  },
  {
    title: "AI Store",
    status: "live",
    route: "/ai-store",
    shortcut: "0",
    summaryVi: "Cửa hàng tài khoản AI premium: ChatGPT Plus/Pro, Claude Pro/Max, Codex API key, Cursor Pro, Copilot, Midjourney, Dreamina, Runway, Kling, Suno, ElevenLabs, FAL credits. Bảo hành 1-1, mua qua Telegram/email.",
    capabilitiesVi: [
      "Catalog có lọc theo nhóm: Chatbot, API key, Code, Image, Video, Audio.",
      "Mỗi sản phẩm có giá VND, giá gốc gạch chân khi giảm, badge trạng thái (Sẵn hàng / Sắp hết / Đặt trước), thời hạn dùng và bảo hành.",
      "Nút Mua mở Telegram (https://t.me/mrninenet) hoặc email với tin nhắn đã soạn sẵn.",
      "Có nút Hỏi MrNine AI ngay trên thẻ — mở chat ask-anything với prompt tư vấn tự động.",
      "Mua combo từ 3 món hoặc gói 1 năm có thể được giảm thêm 10–20%.",
    ],
    howVi: "Mở /ai-store, lọc nhóm sản phẩm, chọn món muốn mua, bấm Mua qua Telegram để chat trực tiếp. Cần tư vấn thì bấm icon chat trên thẻ.",
  },
  {
    title: "Tools",
    status: "live",
    route: "/tools",
    shortcut: "-",
    summaryVi: "Hộp công cụ dev hằng ngày, chạy hoàn toàn client-side: JSON formatter, regex tester, base64, URL encode, JWT decoder, hash SHA, color picker, timestamp converter.",
    capabilitiesVi: [
      "JSON: format pretty/minified + validate.",
      "Regex: nhập pattern + flag, hiện tất cả khớp.",
      "Base64: encode/decode hai chiều realtime.",
      "URL: encodeURIComponent / decodeURIComponent.",
      "JWT: decode header + payload (không kiểm tra chữ ký).",
      "Hash: SHA-1, SHA-256, SHA-512 (Web Crypto, cần HTTPS).",
      "Color: HEX ↔ RGB ↔ HSL + Tailwind class + CSS var.",
      "Timestamp: Unix ↔ ISO ↔ giờ Việt Nam ↔ giờ Bangkok ↔ relative.",
    ],
    howVi: "Mở /tools, chọn tab công cụ tương ứng. Toàn bộ chạy ở client, không gửi dữ liệu ra ngoài.",
  },
  {
    title: "Calculators",
    status: "live",
    route: "/calculators",
    shortcut: "=",
    summaryVi: "Bộ máy tính tiếng Việt: thuế TNCN 2026 (gross↔net theo bậc), EMI vay nhà/xe, đổi tiền theo tỉ giá realtime, BMI, tip, đổi đơn vị (length/weight/volume/temperature).",
    capabilitiesVi: [
      "Thuế TNCN: nhập lương gross + người phụ thuộc, ra bảo hiểm 10.5%, thu nhập chịu thuế, thuế và lương net.",
      "Vay: nhập số tiền, lãi suất năm, thời hạn → trả mỗi tháng, tổng trả, tổng lãi.",
      "Đổi tiền: lấy tỉ giá USD/CNY/TWD/JPY/VND realtime từ /api/markets.",
      "BMI: cân nặng + chiều cao → BMI và phân loại (thiếu cân/bình thường/thừa cân/béo phì).",
      "Tip & chia bill, đổi đơn vị 4 nhóm (length/weight/volume/temperature).",
    ],
    howVi: "Mở /calculators, chọn loại máy tính ở dải tab phía trên. Nhập số trực tiếp, kết quả cập nhật realtime.",
  },
];

const featureNotes = [
  "Search bar trên home tìm được module, model FAL, và các studio (Story Forge, Voice Studio, Video Studio). Phím tắt: ⌘K hoặc Ctrl+K để focus, ↑↓ để chọn, Enter để mở.",
  "Phím tắt 1-9 / 0 / - / = trên home mở nhanh module tương ứng (theo ô số trên thẻ). 9 = Markets, 0 = AI Store, - = Tools, = = Calculators.",
  "Click logo MrNine ở bất kỳ trang nào để quay về trang chủ.",
  "Theme có 7 preset: Auto, Crimson, Signal, Gold, Frost, Eclipse, Plasma — đổi ở dropdown góc phải header. Auto cycles theo giờ Bangkok.",
  "Ngôn ngữ EN/VI đổi ở chip góc phải header.",
  "Đăng nhập bằng Google hoặc Discord (NextAuth + MongoDB session). Mọi module live yêu cầu đăng nhập.",
  "Ask anything (chính bot này) lưu hội thoại trong session — reload trang sẽ mất. Server giữ tối đa 12 lượt gần nhất làm context.",
  "Discord activity hiển thị status realtime qua Lanyard WebSocket.",
];

function summarizeFalModels() {
  const groups = new Map<string, { count: number; vendors: Set<string>; samples: string[] }>();
  for (const model of falModels) {
    const key = model.capability;
    const entry = groups.get(key) ?? { count: 0, vendors: new Set<string>(), samples: [] };
    entry.count += 1;
    entry.vendors.add(model.vendor);
    if (entry.samples.length < 6 && model.badge) entry.samples.push(`${model.label} (${model.vendor})`);
    groups.set(key, entry);
  }
  const labels: Record<string, string> = {
    "text-to-image": "Text-to-Image",
    "image-to-image": "Image-to-Image",
    "text-to-video": "Text-to-Video",
    "image-to-video": "Image-to-Video",
    "motion-control": "Motion Control",
  };
  return Array.from(groups.entries())
    .map(([cap, info]) => {
      const vendors = Array.from(info.vendors).slice(0, 6).join(", ");
      const samples = info.samples.length ? ` Sample: ${info.samples.join(", ")}.` : "";
      return `- ${labels[cap] ?? cap}: ${info.count} model. Vendors: ${vendors}.${samples}`;
    })
    .join("\n");
}

export function buildSiteKnowledgePrompt(): string {
  const moduleLines = moduleEntries
    .map((entry) => {
      const head = `${entry.title} — ${entry.status === "live" ? `live tại ${entry.route ?? "-"}${entry.shortcut ? `, phím ${entry.shortcut}` : ""}` : "đang phát triển"}.`;
      const cap = entry.capabilitiesVi.length ? `\n    Tính năng: ${entry.capabilitiesVi.join("; ")}.` : "";
      return `- ${head} ${entry.summaryVi}${cap}\n    Cách dùng: ${entry.howVi}`;
    })
    .join("\n");

  const falSummary = summarizeFalModels();
  const featureLines = featureNotes.map((line) => `- ${line}`).join("\n");

  return [
    "# MrNine site knowledge",
    "Đây là kiến thức chính thống về website mrnine.net. Trả lời câu hỏi của user dựa trên thông tin này. Nếu user hỏi cách dùng một tính năng, dẫn họ tới module phù hợp và mô tả các bước cụ thể.",
    "",
    "## Modules",
    moduleLines,
    "",
    "## FAL.AI model catalog (AI Playground)",
    falSummary,
    "",
    "## Site behaviours",
    featureLines,
  ].join("\n");
}

export const SITE_KNOWLEDGE_PROMPT = buildSiteKnowledgePrompt();

// 8 genre templates for Story Writer.
// Each genre carries: typical chapter length, recommended platform, plot beats,
// cliche to avoid, and a short style guide that the Writer agent receives.

export type GenreId =
  | "tu-tien"
  | "do-thi"
  | "lich-su"
  | "sci-fi"
  | "trinh-tham"
  | "lang-man"
  | "fantasy"
  | "ngon-tinh";

export type Genre = {
  id: GenreId;
  labelVi: string;
  labelEn: string;
  emoji: string;
  defaultChapterWords: number;
  defaultTargetChapters: number;
  platform: "qidian" | "wattpad" | "wuxiaworld" | "facebook" | "wattpad-vi" | "general";
  beats: ReadonlyArray<string>;
  bannedCliche: ReadonlyArray<string>;
  styleGuide: string;
  audienceVi: string;
};

export const genres: ReadonlyArray<Genre> = [
  {
    id: "tu-tien",
    labelVi: "Tu tiên",
    labelEn: "Cultivation",
    emoji: "⚔️",
    defaultChapterWords: 2500,
    defaultTargetChapters: 1000,
    platform: "qidian",
    beats: [
      "Mở đầu: nhân vật chính nhận lăng nhục/biến cố lớn",
      "Cơ duyên: nhặt được bảo vật/gặp tiền bối/kỳ ngộ",
      "Đột phá đầu tiên: vượt cảnh giới ngay sau cơ duyên 5–10 chương",
      "Đối kháng: dùng cảnh giới mới để vả mặt kẻ trước đây xem thường",
      "Giai đoạn lập môn: gia nhập tông môn / kết bạn cùng tu",
      "Lên đời cảnh giới đều đặn 50–80 chương / cảnh giới lớn",
      "Boss arc + đại trận đại kết hợp đôi-ba chương",
    ],
    bannedCliche: [
      "Ngoại trừ vật phẩm vô danh nhưng thật ra rất mạnh",
      "Mỹ nữ tự dưng đến phòng nhân vật chính",
      "Phàm thân chú thích là vô địch ngay từ đầu",
      "Nói lời thề với trời đất ở chương 1",
    ],
    styleGuide:
      "Câu ngắn cho cảnh giao đấu, miêu tả động tác đến từng chiêu thức. Cảnh tu luyện dùng so sánh với thiên địa, ngũ hành. Không lạm dụng ngoại ngữ. Tên cảnh giới Việt hoá nhẹ (Luyện Khí / Trúc Cơ / Kim Đan / Nguyên Anh).",
    audienceVi: "Nam, 16–35 tuổi, đã đọc Tru Tiên / Đấu Phá",
  },
  {
    id: "do-thi",
    labelVi: "Đô thị",
    labelEn: "Urban",
    emoji: "🏙️",
    defaultChapterWords: 2200,
    defaultTargetChapters: 600,
    platform: "qidian",
    beats: [
      "Hook chương 1: nhân vật chính có một thứ vô giá người khác không biết",
      "Đụng chạm thực tế: tiền, mất mặt, gia đình, cô gái cũ",
      "Lật mặt arc: dùng năng lực để vả mặt kẻ khinh thường",
      "Mở rộng phạm vi: tỉnh → thành phố → quốc gia → quốc tế",
      "Đối thủ leo thang theo từng arc",
      "Vợ + bạn gái + nữ phụ rõ tuyến, không hậu cung loạn",
    ],
    bannedCliche: [
      "Sạp nhỏ nhưng kiếm trăm triệu một ngày bằng hai dòng giải thích",
      "CEO nữ chính lên giường ngay chương 5",
      "Trùm xã hội đen sợ nhân vật chính khi mới gặp",
    ],
    styleGuide:
      "Văn phong báo chí, câu vừa, hội thoại bình thường. Dùng số liệu cụ thể (tiền, ngày, địa danh) để có cảm giác thật. Ít miêu tả phong cảnh, nhiều hành động + nội tâm.",
    audienceVi: "Nam, 18–40 tuổi, dân văn phòng, độc giả Đại Phụng Đả Canh Nhân",
  },
  {
    id: "lich-su",
    labelVi: "Lịch sử",
    labelEn: "Historical",
    emoji: "🏯",
    defaultChapterWords: 2800,
    defaultTargetChapters: 800,
    platform: "qidian",
    beats: [
      "Mở đầu: nhân vật chính xuyên không hoặc trùng sinh vào nhân vật bị ruồng bỏ",
      "Khẳng định mình bằng kiến thức hiện đại trong giới hạn thời đại",
      "Lập công đầu cho triều đình hoặc cứu thân nhân",
      "Mâu thuẫn quyền lực: gia đình, triều đình, ngoại bang",
      "Giành quyền hành chậm rãi qua từng arc",
      "Kết thúc arc bằng chiến thắng quân sự / chính trị có hệ quả lâu dài",
    ],
    bannedCliche: [
      "Mang thuốc súng ra dùng ở thời chưa có sắt",
      "Thay đổi nguyên thủ một quốc gia trong 1 chương",
      "Nói tiếng hiện đại với hoàng đế",
    ],
    styleGuide:
      "Giọng văn cổ kính, tránh từ thuần hiện đại (vd: 'OK', 'job'). Dùng kính ngữ đúng (bệ hạ, thần, tiểu nhân). Mô tả triều phục, lễ nghi, địa danh có thật. Lồng ghép thơ cổ khi hợp cảnh.",
    audienceVi: "Nam và nữ, 20–45 tuổi, mê sử Việt – Trung",
  },
  {
    id: "sci-fi",
    labelVi: "Sci-fi",
    labelEn: "Science fiction",
    emoji: "🛸",
    defaultChapterWords: 2600,
    defaultTargetChapters: 500,
    platform: "qidian",
    beats: [
      "World hook: một quy luật vật lý / công nghệ khác đời thật",
      "Nhân vật chính phát hiện hoặc bị đẩy vào hệ quả của quy luật đó",
      "Khám phá kỹ thuật: phòng thí nghiệm, mỏ tài nguyên, hệ thống AI",
      "Va chạm với phe phái: liên minh, công ty đa quốc gia, AI sentient",
      "Nâng cấp trang bị / công nghệ theo arc",
      "Trận chiến không gian / cyberpunk hub kéo dài 3–5 chương",
    ],
    bannedCliche: [
      "Từ chuyên ngành dùng sai (lượng tử = phép thuật)",
      "Dạy nhân vật chính kiến thức cao siêu trong 1 đêm",
      "Tên kỹ thuật bịa nhưng mô tả như đã có thật",
    ],
    styleGuide:
      "Thuật ngữ chính xác, lời thoại tỉnh táo. Dùng đoạn ngắn cho hành động + đoạn dài cho giải thích kỹ thuật. Cảnh không gian dùng đơn vị thực (giờ, năm ánh sáng, tốc độ).",
    audienceVi: "Nam, 18–35 tuổi, gamer + dân kỹ thuật",
  },
  {
    id: "trinh-tham",
    labelVi: "Trinh thám",
    labelEn: "Detective / Mystery",
    emoji: "🕵️",
    defaultChapterWords: 2400,
    defaultTargetChapters: 200,
    platform: "wattpad-vi",
    beats: [
      "Mở chương: tìm thấy thi thể / vụ án bí ẩn",
      "Khám hiện trường, thu thập manh mối khách quan",
      "Liệt kê nghi phạm có động cơ và bằng chứng",
      "Mỗi chương 2–3 manh mối mới, 1–2 nghi phạm bị loại",
      "Twist giữa truyện: kẻ tưởng vô tội hoá ra liên quan",
      "Reveal cuối: dùng manh mối đã có, không tự nhiên thêm bằng chứng mới",
    ],
    bannedCliche: [
      "Thám tử đoán trúng hung thủ ngay chương 1",
      "Bằng chứng hiện ra một cách thuận tiện",
      "Hung thủ thú nhận khi bị hỏi câu đầu",
    ],
    styleGuide:
      "Nhịp chậm – nhanh xen kẽ. Nội tâm thám tử rõ ràng (suy luận có quy luật). Đầu mỗi cảnh có thời gian + địa điểm. Ưu tiên hội thoại có ẩn ý.",
    audienceVi: "Nữ và nam, 18–45 tuổi, fan Conan / Sherlock",
  },
  {
    id: "lang-man",
    labelVi: "Lãng mạn",
    labelEn: "Romance",
    emoji: "💕",
    defaultChapterWords: 2000,
    defaultTargetChapters: 100,
    platform: "wattpad-vi",
    beats: [
      "Cú gặp đầu: tình huống bất đắc dĩ / tai nạn dễ thương",
      "Hiểu lầm chương 5–10",
      "Lần đầu đối thoại sâu: chia sẻ vết thương quá khứ",
      "Bên thứ ba xuất hiện",
      "Khoảnh khắc bùng nổ tình cảm (kiss / confession)",
      "Khủng hoảng + chia tay tạm thời",
      "Tái hợp với hành động chân thành lớn",
    ],
    bannedCliche: [
      "Yêu nhau ngay từ cái nhìn đầu tiên không cần lý do",
      "Ngân vật nữ ngất đi liên tục",
      "Bạn trai cũ là tỷ phú",
    ],
    styleGuide:
      "Văn mềm, nhiều miêu tả cảm giác (mùi, hơi ấm, ánh nhìn). Hội thoại ngắn, có khoảng lặng. Tránh kể quá nhiều, ưu tiên cho thấy cảm xúc qua hành vi.",
    audienceVi: "Nữ, 16–30 tuổi",
  },
  {
    id: "fantasy",
    labelVi: "Fantasy",
    labelEn: "Fantasy",
    emoji: "🧝",
    defaultChapterWords: 2500,
    defaultTargetChapters: 600,
    platform: "qidian",
    beats: [
      "Worldbuild đầu: hệ thống ma pháp / chủng tộc / thần thoại",
      "Hành trình: kẻ vô danh nhận sứ mệnh / dấu hiệu tiên tri",
      "Đoàn người dồng hành: warrior + healer + mage + rogue",
      "Quái vật theo arc + boss cấp vùng",
      "Mở rộng bản đồ: làng → vương quốc → đại lục",
      "Phản diện chính có động cơ rõ ràng, không thuần ác",
    ],
    bannedCliche: [
      "Phép thuật bừa bãi không có giá phải trả",
      "Elf đẹp nam tự dưng cứu nhân vật chính",
      "Lý do làm nhân vật chính: ‘ta sinh ra đã vĩ đại’",
    ],
    styleGuide:
      "Giọng văn cổ điển kiểu Tolkien/Sanderson nhưng câu Việt rõ ràng. Đặt tên có quy luật (cùng dân tộc dùng cùng âm tiết). Mỗi phép thuật có quy tắc, không đa năng.",
    audienceVi: "Nam và nữ, 16–35 tuổi, fan The Witcher / Mistborn",
  },
  {
    id: "ngon-tinh",
    labelVi: "Ngôn tình",
    labelEn: "Chinese Romance",
    emoji: "🌸",
    defaultChapterWords: 2100,
    defaultTargetChapters: 200,
    platform: "facebook",
    beats: [
      "Nữ chính có quá khứ ấm ức cụ thể (gia đình, tình yêu cũ)",
      "Nam chính tổng tài lạnh lùng – có lý do của sự lạnh lùng",
      "Hợp đồng / kết hôn giả / công ty cạnh tranh là cú nối ban đầu",
      "Nữ chính dần lộ tài năng / trí tuệ làm nam chính kinh ngạc",
      "Tình địch nữ phụ và tình thù gia tộc",
      "Khủng hoảng lớn: chia ly, mất trí, mang thai bí mật",
      "Trở về: nam chính lụy nữ chính rõ ràng, không loanh quanh",
    ],
    bannedCliche: [
      "Nữ chính 'tôi rất bình thường nhưng ai cũng yêu tôi'",
      "Nam chính cưỡng ép nữ chính được tô vẽ thành lãng mạn",
      "Nữ phụ là rắn độc 100%, không có chiều sâu",
    ],
    styleGuide:
      "Câu mượt, nhiều tính từ cảm xúc. Đối thoại có khoảng lặng và ẩn ý. Tả cảnh ăn mặc, không gian sang trọng có chừng mực. Tránh thuần dịch từ tiếng Trung – Việt hoá danh xưng.",
    audienceVi: "Nữ, 18–35 tuổi, fan Cố Mạn / Đường Thất",
  },
];

export function getGenre(id: string): Genre | undefined {
  return genres.find((g) => g.id === id);
}

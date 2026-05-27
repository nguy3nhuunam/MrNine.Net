import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Quyền riêng tư",
  description: "Cách MrNine xử lý dữ liệu cá nhân và phiên đăng nhập của người dùng.",
};

export default function PrivacyPage() {
  return (
    <article className="prose prose-invert max-w-none prose-headings:font-display prose-headings:tracking-tight prose-h1:text-3xl prose-h2:mt-10 prose-h2:text-xl prose-p:text-white/75 prose-li:text-white/75 prose-a:text-amber-400">
      <h1>Quyền riêng tư</h1>
      <p>
        MrNine (mrnine.net) thu thập tối thiểu thông tin cần thiết để vận hành các module AI và lưu trữ tác phẩm
        của bạn. Trang này mô tả những gì chúng tôi giữ, lưu ở đâu, và quyền của bạn với dữ liệu đó.
      </p>

      <h2>1. Dữ liệu chúng tôi thu thập</h2>
      <ul>
        <li>
          <strong>Thông tin tài khoản:</strong> tên hiển thị, email, ID provider, ảnh đại diện — lấy từ Google
          hoặc Discord khi bạn đăng nhập bằng OAuth.
        </li>
        <li>
          <strong>Nội dung bạn tạo:</strong> chương truyện, lá số, flashcards, prompt và sản phẩm AI tạo ra
          (ảnh, video, text). Lưu vào MongoDB Atlas dưới userId của bạn.
        </li>
        <li>
          <strong>Thông số sử dụng:</strong> số credit đã tiêu, route đã gọi, mốc thời gian. Dùng để tính quota
          và rate limit, không bán cho bên thứ ba.
        </li>
        <li>
          <strong>Cookie phiên:</strong> NextAuth lưu một cookie session để giữ bạn đăng nhập. Không có cookie
          quảng cáo, không có pixel tracking.
        </li>
      </ul>

      <h2>2. Bên thứ ba xử lý dữ liệu</h2>
      <p>Khi bạn dùng module AI, prompt và đôi khi nội dung bạn nhập sẽ được gửi tới các nhà cung cấp dưới đây:</p>
      <ul>
        <li>
          <strong>Yunwu (yunwu.ai):</strong> proxy LLM (GPT, Claude, DeepSeek). Nhận prompt + context để sinh
          văn bản. Không nhận thông tin tài khoản của bạn.
        </li>
        <li>
          <strong>FAL (fal.ai):</strong> hosting model image/video. Nhận prompt + ảnh đầu vào (nếu có) để render.
        </li>
        <li>
          <strong>OmniVoice (omnivoice.maisonshop.store):</strong> server TTS riêng — nhận text bạn muốn đọc
          thành giọng.
        </li>
        <li>
          <strong>MongoDB Atlas:</strong> nơi lưu user, credit, tác phẩm. Vùng dữ liệu mặc định.
        </li>
        <li>
          <strong>Vercel:</strong> hạ tầng serverless. Logs request được giữ ngắn hạn cho mục đích debug.
        </li>
        <li>
          <strong>Google / Discord OAuth:</strong> chỉ dùng để xác thực, không truy cập gì thêm ngoài thông tin
          profile cơ bản.
        </li>
      </ul>

      <h2>3. Lưu giữ và xóa</h2>
      <ul>
        <li>Tài khoản và nội dung bạn tạo được giữ đến khi bạn yêu cầu xóa.</li>
        <li>Logs rate limit tự xóa sau 1 giờ qua TTL index.</li>
        <li>Logs request bên Vercel/Mongo Atlas tuân theo chính sách lưu trữ của các nhà cung cấp đó.</li>
      </ul>

      <h2>4. Quyền của bạn</h2>
      <p>
        Bạn có thể yêu cầu xuất hoặc xóa toàn bộ dữ liệu cá nhân bằng cách liên hệ qua email được niêm yết ở
        trang Giới thiệu. Chúng tôi xử lý trong vòng 14 ngày làm việc.
      </p>

      <h2>5. Trẻ em</h2>
      <p>
        MrNine không hướng tới người dùng dưới 13 tuổi. Nếu bạn cho rằng một trẻ em đã tạo tài khoản, hãy báo
        cho chúng tôi để xóa.
      </p>

      <h2>6. Liên hệ</h2>
      <p>
        Mọi câu hỏi về quyền riêng tư, gửi tới hộp thư hỗ trợ ở trang <a href="/about">Giới thiệu</a>. Chính
        sách có thể được cập nhật; ngày cập nhật được hiển thị ở chân trang.
      </p>
    </article>
  );
}

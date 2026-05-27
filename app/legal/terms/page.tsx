import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Điều khoản sử dụng",
  description: "Quy tắc khi dùng MrNine: nội dung, quota, hành vi cấm và giới hạn trách nhiệm.",
};

export default function TermsPage() {
  return (
    <article className="prose prose-invert max-w-none prose-headings:font-display prose-headings:tracking-tight prose-h1:text-3xl prose-h2:mt-10 prose-h2:text-xl prose-p:text-white/75 prose-li:text-white/75 prose-a:text-amber-400">
      <h1>Điều khoản sử dụng</h1>
      <p>
        Khi bạn đăng nhập và sử dụng MrNine (mrnine.net), bạn đồng ý với các điều khoản dưới đây. Đọc kỹ trước
        khi tiếp tục.
      </p>

      <h2>1. Tài khoản</h2>
      <ul>
        <li>Mỗi người dùng giữ một tài khoản, đăng nhập qua Google hoặc Discord.</li>
        <li>Bạn chịu trách nhiệm bảo mật tài khoản OAuth nguồn (Google/Discord).</li>
        <li>Chia sẻ tài khoản hoặc tự động hoá truy cập để né rate limit là vi phạm.</li>
      </ul>

      <h2>2. Credits và quota</h2>
      <ul>
        <li>Mỗi gói (Free / Pro) có hạn mức credit tính theo chu kỳ 30 ngày.</li>
        <li>Mỗi action AI tiêu một lượng credit cố định (xem bảng cost trong Profile).</li>
        <li>Khi gọi upstream lỗi, hệ thống tự refund credit.</li>
        <li>Credit không quy đổi thành tiền và không hoàn lại khi tài khoản bị khóa do vi phạm.</li>
      </ul>

      <h2>3. Nội dung bạn tạo</h2>
      <ul>
        <li>
          <strong>Bạn giữ quyền</strong> với mọi nội dung bạn nhập và sản phẩm AI tạo ra theo prompt của bạn,
          tuân theo điều khoản của các provider thượng nguồn (Yunwu, FAL).
        </li>
        <li>MrNine không xác lập quyền sở hữu đối với tác phẩm của bạn.</li>
        <li>Bạn có trách nhiệm đảm bảo nội dung không vi phạm bản quyền, nhãn hiệu hay quyền hình ảnh.</li>
      </ul>

      <h2>4. Hành vi bị cấm</h2>
      <p>Không được dùng MrNine để:</p>
      <ul>
        <li>Tạo nội dung khiêu dâm liên quan trẻ em (CSAM) hoặc nội dung tình dục không có sự đồng thuận.</li>
        <li>Tạo deepfake nhằm bôi nhọ hoặc lừa đảo người thật.</li>
        <li>Tạo malware, phishing kit, hoặc công cụ tấn công bảo mật.</li>
        <li>Spam, mass-generation để né quota (mở nhiều tài khoản, dùng VPN xoay vòng).</li>
        <li>Reverse-engineering rate limiter, cố tình khai thác lỗi billing.</li>
        <li>Xuất bản nội dung do AI tạo mà không khai báo nguồn gốc nếu pháp luật địa phương yêu cầu.</li>
      </ul>

      <h2>5. Khả dụng của dịch vụ</h2>
      <p>
        MrNine dựa trên hạ tầng third-party (Vercel, MongoDB Atlas, Yunwu, FAL, OmniVoice). Khi một trong số đó
        gặp sự cố, một hoặc toàn bộ module có thể tạm thời không hoạt động. Chúng tôi không bồi thường downtime.
      </p>

      <h2>6. Giới hạn trách nhiệm</h2>
      <p>
        Output AI có thể chứa lỗi, bịa đặt hoặc nội dung không phù hợp. Bạn tự chịu trách nhiệm khi sử dụng
        output đó cho mục đích quan trọng (y tế, tài chính, pháp lý, học thuật). MrNine không chịu trách nhiệm
        cho bất kỳ thiệt hại nào phát sinh từ quyết định dựa trên output AI.
      </p>

      <h2>7. Khoá tài khoản</h2>
      <p>
        Vi phạm các quy tắc trên có thể dẫn đến khoá tài khoản tạm thời hoặc vĩnh viễn, không hoàn credit. Các
        trường hợp lạm dụng nghiêm trọng có thể bị báo cáo cho Google/Discord và cơ quan chức năng.
      </p>

      <h2>8. Thay đổi điều khoản</h2>
      <p>
        Điều khoản có thể được cập nhật khi có module mới hoặc thay đổi giá. Lần cập nhật mới nhất hiển thị ở
        chân trang. Tiếp tục sử dụng dịch vụ sau khi cập nhật được xem là chấp nhận điều khoản mới.
      </p>

      <h2>9. Liên hệ</h2>
      <p>
        Khiếu nại, báo cáo lạm dụng, hoặc câu hỏi pháp lý gửi qua kênh ở trang <a href="/about">Giới thiệu</a>.
      </p>
    </article>
  );
}

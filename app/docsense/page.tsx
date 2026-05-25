import { DocSenseShell } from "@/components/DocSenseShell";

const og = "/api/og?title=DocSense&subtitle=OCR%20%C2%B7%20d%E1%BB%8Bch%20gi%E1%BB%AF%20%C4%91%E1%BB%8Bnh%20d%E1%BA%A1ng&accent=cyan";

export const metadata = {
  title: "DocSense — OCR + dịch giữ định dạng",
  description: "OCR ảnh / PDF rồi dịch chuyên nghiệp, giữ nguyên bố cục, bảng và hình ảnh.",
  openGraph: {
    title: "DocSense — OCR + dịch giữ định dạng",
    description: "OCR ảnh / PDF rồi dịch giữ layout, bảng, hình ảnh.",
    images: [og],
  },
  twitter: { card: "summary_large_image", title: "DocSense", description: "OCR + translate while keeping layout.", images: [og] },
};

export default function DocSensePage() {
  return <DocSenseShell />;
}

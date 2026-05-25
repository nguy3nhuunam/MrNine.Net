import { MysticDeckShell } from "@/components/MysticDeckShell";

export const metadata = {
  title: "Mystic Deck — tử vi · thần số · tarot",
  description:
    "Lập lá số Tử Vi Đẩu Số 12 cung, thần số học Pythagore, trải bài tarot 3 lá. Tính toán cục bộ, AI luận giải có cấu trúc.",
  openGraph: {
    title: "Mystic Deck — tử vi · thần số · tarot",
    description: "Lá số 12 cung, Pythagore numerology, 78 lá tarot. AI luận giải.",
    images: ["/api/og?title=Mystic%20Deck&subtitle=T%E1%BB%AD%20vi%20%C2%B7%20th%E1%BA%A7n%20s%E1%BB%91%20%C2%B7%20tarot&accent=amber"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Mystic Deck — tử vi · thần số · tarot",
    description: "Lá số 12 cung, Pythagore numerology, 78 lá tarot. AI luận giải.",
    images: ["/api/og?title=Mystic%20Deck&subtitle=T%E1%BB%AD%20vi%20%C2%B7%20th%E1%BA%A7n%20s%E1%BB%91%20%C2%B7%20tarot&accent=amber"],
  },
};

export const dynamic = "force-dynamic";

export default function MysticDeckPage() {
  return <MysticDeckShell />;
}

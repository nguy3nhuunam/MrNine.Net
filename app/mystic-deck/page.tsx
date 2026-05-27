import { MysticDeckShell } from "@/components/MysticDeckShell";
import { softwareApplicationJsonLd } from "@/lib/seo-jsonld";

const og = "/api/og?title=Mystic%20Deck&subtitle=T%E1%BB%AD%20vi%20%C2%B7%20th%E1%BA%A7n%20s%E1%BB%91%20%C2%B7%20tarot&accent=amber";

export const metadata = {
  title: "Mystic Deck — tử vi · thần số · tarot",
  description:
    "Lập lá số Tử Vi Đẩu Số 12 cung, thần số học Pythagore, trải bài tarot 3 lá. Tính toán cục bộ, AI luận giải có cấu trúc.",
  alternates: { canonical: "/mystic-deck" },
  openGraph: {
    title: "Mystic Deck — tử vi · thần số · tarot",
    description: "Lá số 12 cung, Pythagore numerology, 78 lá tarot. AI luận giải.",
    images: [og],
  },
  twitter: {
    card: "summary_large_image",
    title: "Mystic Deck — tử vi · thần số · tarot",
    description: "Lá số 12 cung, Pythagore numerology, 78 lá tarot. AI luận giải.",
    images: [og],
  },
};

export const dynamic = "force-dynamic";

const jsonLd = softwareApplicationJsonLd({
  name: "MrNine Mystic Deck",
  url: "/mystic-deck",
  description: "Tử Vi Đẩu Số 12 cung, thần số học Pythagore, tarot 3 lá với AI luận giải.",
  category: "LifestyleApplication",
  screenshot: og,
});

export default function MysticDeckPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <MysticDeckShell />
    </>
  );
}

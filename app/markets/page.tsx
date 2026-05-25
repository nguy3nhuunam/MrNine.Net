import { MarketsShell } from "@/components/MarketsShell";

const og = "/api/og?title=Markets&subtitle=v%C3%A0ng%20%C2%B7%20crypto%20%C2%B7%20forex&accent=lime";

export const metadata = {
  title: "Markets — vàng · crypto · forex realtime",
  description:
    "Giá realtime vàng, Bitcoin, Ethereum, BNB, Solana, XRP, Doge và tỉ giá USD/VND. Tự cập nhật mỗi 60 giây.",
  openGraph: {
    title: "Markets — vàng · crypto · forex realtime",
    description: "Realtime prices: gold, BTC, ETH, BNB, SOL, XRP, DOGE, USD/VND.",
    images: [og],
  },
  twitter: { card: "summary_large_image", title: "Markets — realtime", description: "Gold + crypto + forex.", images: [og] },
};

export const dynamic = "force-dynamic";

export default function MarketsPage() {
  return <MarketsShell />;
}

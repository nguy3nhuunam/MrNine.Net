import { AIStoreShell } from "@/components/AIStoreShell";

const og = "/api/og?title=AI%20Store&subtitle=ChatGPT%20%C2%B7%20Codex%20%C2%B7%20Dreamina&accent=amber";

export const metadata = {
  title: "AI Store — tài khoản ChatGPT, Codex, Dreamina giá tốt",
  description:
    "Bán tài khoản AI premium: ChatGPT Plus, Claude Pro, Codex API key, Dreamina, Midjourney, Suno, Cursor Pro. Bảo hành, hỗ trợ qua Telegram.",
  openGraph: {
    title: "AI Store — tài khoản AI premium",
    description: "ChatGPT Plus, Claude Pro, Codex API key, Dreamina, Midjourney, Suno, Cursor Pro.",
    images: [og],
  },
  twitter: { card: "summary_large_image", title: "AI Store", description: "Tài khoản AI premium giá tốt.", images: [og] },
};

export const dynamic = "force-dynamic";

export default function AIStorePage() {
  return <AIStoreShell />;
}

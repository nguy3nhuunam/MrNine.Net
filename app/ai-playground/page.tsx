import { Suspense } from "react";
import { AIPlaygroundShell } from "@/components/AIPlaygroundShell";

export const metadata = {
  title: "AI Playground — render ảnh và video",
  description:
    "Tạo ảnh và video bằng các model AI mới nhất qua FAL.AI: FLUX 2, Imagen 4, Sora 2, Veo 3.1, Kling 3 Pro và 40+ model khác.",
  openGraph: {
    title: "AI Playground — render ảnh và video",
    description: "FLUX 2, Imagen 4, Sora 2, Veo 3.1, Kling 3 Pro — render trong một giao diện.",
    images: ["/api/og?title=AI%20Playground&subtitle=image%20%C2%B7%20video%20%C2%B7%20motion&accent=red"],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Playground — render ảnh và video",
    description: "FLUX 2, Imagen 4, Sora 2, Veo 3.1, Kling 3 Pro — render trong một giao diện.",
    images: ["/api/og?title=AI%20Playground&subtitle=image%20%C2%B7%20video%20%C2%B7%20motion&accent=red"],
  },
};

export const dynamic = "force-dynamic";

export default function AIPlaygroundPage() {
  return (
    <Suspense fallback={null}>
      <AIPlaygroundShell />
    </Suspense>
  );
}

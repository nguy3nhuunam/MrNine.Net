import { Suspense } from "react";
import { AIPlaygroundShell } from "@/components/AIPlaygroundShell";
import { softwareApplicationJsonLd } from "@/lib/seo-jsonld";

const og = "/api/og?title=AI%20Playground&subtitle=image%20%C2%B7%20video%20%C2%B7%20motion&accent=red";

export const metadata = {
  title: "AI Playground — render ảnh và video",
  description:
    "Tạo ảnh và video bằng các model AI mới nhất qua FAL.AI: FLUX 2, Imagen 4, Sora 2, Veo 3.1, Kling 3 Pro và 40+ model khác.",
  alternates: { canonical: "/ai-playground" },
  openGraph: {
    title: "AI Playground — render ảnh và video",
    description: "FLUX 2, Imagen 4, Sora 2, Veo 3.1, Kling 3 Pro — render trong một giao diện.",
    images: [og],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Playground — render ảnh và video",
    description: "FLUX 2, Imagen 4, Sora 2, Veo 3.1, Kling 3 Pro — render trong một giao diện.",
    images: [og],
  },
};

export const dynamic = "force-dynamic";

const jsonLd = softwareApplicationJsonLd({
  name: "MrNine AI Playground",
  url: "/ai-playground",
  description: "Render ảnh và video AI qua FAL: FLUX 2, Imagen 4, Sora 2, Veo 3.1, Kling 3 Pro và 40+ model.",
  category: "MultimediaApplication",
  screenshot: og,
});

export default function AIPlaygroundPage() {
  return (
    <Suspense fallback={null}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <AIPlaygroundShell />
    </Suspense>
  );
}

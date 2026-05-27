import { StoryWriterShell } from "@/components/StoryWriterShell";
import { softwareApplicationJsonLd } from "@/lib/seo-jsonld";

const og = "/api/og?title=Story%20Writer&subtitle=plot%20%C2%B7%20ch%C6%B0%C6%A1ng%20%C2%B7%20nh%C3%A2n%20v%E1%BA%ADt&accent=red";

export const metadata = {
  title: "Story Writer — viết truyện dài",
  description: "Studio viết tiểu thuyết với pipeline Plan → Compose → Write → Audit → Revise.",
  alternates: { canonical: "/story-writer" },
  openGraph: {
    title: "Story Writer — viết truyện dài",
    description: "Pipeline Plan → Compose → Write → Audit → Revise.",
    images: [og],
  },
  twitter: { card: "summary_large_image", title: "Story Writer", description: "Plan → Compose → Write → Audit → Revise.", images: [og] },
};

const jsonLd = softwareApplicationJsonLd({
  name: "MrNine Story Writer",
  url: "/story-writer",
  description: "Studio viết tiểu thuyết AI với pipeline Plan, Compose, Write, Audit, Revise.",
  category: "ProductivityApplication",
  screenshot: og,
});

export default function StoryWriterPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <StoryWriterShell />
    </>
  );
}

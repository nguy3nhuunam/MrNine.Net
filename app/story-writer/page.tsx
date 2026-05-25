import { StoryWriterShell } from "@/components/StoryWriterShell";

const og = "/api/og?title=Story%20Writer&subtitle=plot%20%C2%B7%20ch%C6%B0%C6%A1ng%20%C2%B7%20nh%C3%A2n%20v%E1%BA%ADt&accent=red";

export const metadata = {
  title: "Story Writer — viết truyện dài",
  description: "Studio viết tiểu thuyết với pipeline Plan → Compose → Write → Audit → Revise.",
  openGraph: {
    title: "Story Writer — viết truyện dài",
    description: "Pipeline Plan → Compose → Write → Audit → Revise.",
    images: [og],
  },
  twitter: { card: "summary_large_image", title: "Story Writer", description: "Plan → Compose → Write → Audit → Revise.", images: [og] },
};

export default function StoryWriterPage() {
  return <StoryWriterShell />;
}

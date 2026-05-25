import { StoryForgeStudioShell } from "@/components/StoryForgeStudioShell";

const og = "/api/og?title=Story%20Forge&subtitle=plot%20%C2%B7%20character%20%C2%B7%20InkOS&accent=lime";

export const metadata = {
  title: "Story Forge — plot · character · InkOS",
  description: "InkOS Studio runtime cho viết truyện cấu trúc nặng, plot và character đầy đủ.",
  openGraph: {
    title: "Story Forge — plot · character · InkOS",
    description: "InkOS Studio inside MrNine — full plot + character pipeline.",
    images: [og],
  },
  twitter: { card: "summary_large_image", title: "Story Forge", description: "InkOS Studio inside MrNine.", images: [og] },
};

export default function StoryForgePage() {
  return <StoryForgeStudioShell />;
}

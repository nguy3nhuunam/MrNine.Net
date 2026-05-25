import { VideoStudioShell } from "@/components/VideoStudioShell";

const og = "/api/og?title=Video%20Studio&subtitle=script%20%E2%86%92%20video%20%C2%B7%20pixelle&accent=lime";

export const metadata = {
  title: "Video Studio — script → video",
  description: "Pixelle-Video runtime: kịch bản sang video, image+video workflow, voice narration.",
  openGraph: {
    title: "Video Studio — script → video",
    description: "Script → video, image+video workflow, voice narration.",
    images: [og],
  },
  twitter: { card: "summary_large_image", title: "Video Studio", description: "Script → video pipeline.", images: [og] },
};

export default function VideoStudioPage() {
  return <VideoStudioShell />;
}

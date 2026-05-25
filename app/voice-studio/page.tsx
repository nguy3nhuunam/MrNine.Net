import { VoiceStudioShell } from "@/components/VoiceStudioShell";

const og = "/api/og?title=Voice%20Studio&subtitle=TTS%20%C2%B7%20clone%20%C2%B7%20transcribe&accent=amber";

export const metadata = {
  title: "Voice Studio — TTS · clone · transcribe",
  description: "OmniVoice runtime: 600+ ngôn ngữ TTS, voice cloning, dubbing và transcribe.",
  openGraph: {
    title: "Voice Studio — TTS · clone · transcribe",
    description: "600+ languages TTS, voice cloning, dubbing.",
    images: [og],
  },
  twitter: { card: "summary_large_image", title: "Voice Studio", description: "600+ languages TTS, voice cloning.", images: [og] },
};

export default function VoiceStudioPage() {
  return <VoiceStudioShell />;
}

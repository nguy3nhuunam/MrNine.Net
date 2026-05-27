import type { Metadata } from "next";
import { VoiceStudioShell } from "@/components/VoiceStudioShell";

export const metadata: Metadata = {
  title: "Voice Studio — TTS · Clone · Design · MrNine",
  description: "OmniVoice TTS với 600+ ngôn ngữ: nhân bản giọng, thiết kế giọng, auto voice. Chạy trên server local của bạn.",
  openGraph: {
    title: "Voice Studio — MrNine",
    description: "OmniVoice TTS với voice cloning, voice design.",
  },
};

export default function VoiceStudioPage() {
  return <VoiceStudioShell />;
}

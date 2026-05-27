import type { Metadata } from "next";
import { LanguageTutorShell } from "@/components/LanguageTutorShell";

export const metadata: Metadata = {
  title: "Language Tutor — flashcards · FSRS · MrNine",
  description: "Hệ thống flashcard học ngoại ngữ kiểu Anki: deck, cloze, type-the-answer, FSRS-6 spaced repetition, AI sinh thẻ và TTS giọng OmniVoice.",
  openGraph: {
    title: "Language Tutor — MrNine",
    description: "Anki-style flashcards với FSRS-6, cloze, AI generate và TTS.",
  },
};

export default function LanguageTutorPage() {
  return <LanguageTutorShell />;
}

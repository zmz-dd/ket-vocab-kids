import { todayISO } from "@/lib/scheduler";

export function speak(text: string) {
  if (!text.trim()) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-US";
  u.rate = 0.9;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}

export async function playAudioOrSpeak(audioUrl: string | undefined, fallbackText: string) {
  if (audioUrl) {
    try {
      const a = new Audio(audioUrl);
      await a.play();
      return;
    } catch {
      // ignore
    }
  }
  speak(fallbackText);
}

export function isToday(epochMs?: number) {
  if (!epochMs) return false;
  const d = new Date(epochMs);
  const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return iso === todayISO();
}

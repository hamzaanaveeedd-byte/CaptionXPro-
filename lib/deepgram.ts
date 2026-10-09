import type { DeepgramResponse, TranscriptionLanguage } from "@/types/editor";

export const TRANSCRIPTION_LANGUAGES: Array<{ value: TranscriptionLanguage; label: string }> = [
  { value: "auto", label: "Auto detect" },
  { value: "en", label: "English" },
  { value: "ur", label: "Urdu" },
  { value: "roman-ur", label: "Roman Urdu" },
  { value: "hi", label: "Hindi" },
  { value: "hinglish", label: "Hinglish" },
  { value: "de", label: "German" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "it", label: "Italian" },
  { value: "pt", label: "Portuguese" },
  { value: "nl", label: "Dutch" },
  { value: "ru", label: "Russian" },
  { value: "ar", label: "Arabic" },
  { value: "ja", label: "Japanese" },
  { value: "ko", label: "Korean" },
  { value: "zh", label: "Chinese (Mandarin)" },
  { value: "tr", label: "Turkish" },
  { value: "id", label: "Indonesian" },
  { value: "bn", label: "Bengali" },
  { value: "pa", label: "Punjabi" },
  { value: "vi", label: "Vietnamese" },
];

export function deepgramLanguageFor(value: TranscriptionLanguage) {
  if (value === "roman-ur") return "ur";
  if (value === "hinglish") return "multi";
  return value;
}

export async function transcribeWithDeepgram(
  file: File,
  language: TranscriptionLanguage,
  onStage?: (stage: string) => void,
): Promise<DeepgramResponse> {
  onStage?.("Securing Deepgram connection…");
  const tokenResponse = await fetch("/api/deepgram/token", { method: "POST" });
  const tokenBody = await tokenResponse.json().catch(() => ({}));
  if (!tokenResponse.ok) throw new Error(tokenBody.error || "Could not create a Deepgram access token.");
  const accessToken = tokenBody.access_token as string | undefined;
  if (!accessToken) throw new Error("Deepgram access token was empty.");

  const params = new URLSearchParams({
    model: "nova-3",
    smart_format: "true",
    punctuate: "true",
    utterances: "true",
  });

  if (language === "auto") {
    params.set("detect_language", "true");
  } else {
    params.set("language", deepgramLanguageFor(language));
  }

  onStage?.(file.type.startsWith("video/") ? "Reading speech from video…" : "Analyzing audio…");
  const response = await fetch(`https://api.deepgram.com/v1/listen?${params.toString()}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": file.type || "application/octet-stream",
    },
    body: file,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.err_msg || payload?.error || `Deepgram request failed (${response.status}).`);
  }
  return payload as DeepgramResponse;
}

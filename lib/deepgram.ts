import type { DeepgramResponse } from "@/types/editor";

export type TranscriptionLanguage = "auto" | "en" | "ur" | "ar" | "multi";

export async function transcribeWithDeepgram(file: File, language: TranscriptionLanguage, onStage?: (stage: string) => void): Promise<DeepgramResponse> {
  onStage?.("Securing Deepgram connection…");
  const tokenResponse = await fetch("/api/deepgram/token", { method: "POST" });
  if (!tokenResponse.ok) {
    const body = await tokenResponse.json().catch(() => ({}));
    throw new Error(body.error || "Could not create a Deepgram access token.");
  }
  const { access_token: accessToken } = await tokenResponse.json();
  if (!accessToken) throw new Error("Deepgram access token was empty.");

  const params = new URLSearchParams({
    model: "nova-3",
    smart_format: "true",
    punctuate: "true",
    utterances: "true",
  });
  if (language === "auto") params.set("detect_language", "true");
  else params.set("language", language);

  onStage?.(file.type.startsWith("video/") ? "Extracting speech from video…" : "Analyzing audio…");
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
    const message = payload?.err_msg || payload?.error || `Deepgram request failed (${response.status}).`;
    throw new Error(message);
  }
  return payload as DeepgramResponse;
}

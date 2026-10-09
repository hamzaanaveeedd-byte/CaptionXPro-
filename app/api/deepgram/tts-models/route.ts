import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PublicTtsModel = {
  name?: string;
  canonical_name?: string;
  architecture?: string;
  languages?: string[];
  language?: string[];
  metadata?: {
    accent?: string;
    age?: string;
    tags?: string[];
  };
};

export async function GET() {
  try {
    const response = await fetch("https://api.deepgram.com/v1/models", { cache: "no-store" });
    if (!response.ok) {
      return NextResponse.json({ error: "Could not load Deepgram TTS voices." }, { status: response.status });
    }
    const body = await response.json().catch(() => ({}));
    const tts = Array.isArray(body?.tts) ? (body.tts as PublicTtsModel[]) : [];
    const models = tts
      .filter((item): item is PublicTtsModel & { canonical_name: string } => typeof item.canonical_name === "string" && item.canonical_name.startsWith("aura-2-"))
      .map((item) => ({
        name: item.name || item.canonical_name,
        canonicalName: item.canonical_name,
        languages: Array.isArray(item.languages) ? item.languages : Array.isArray(item.language) ? item.language : [],
        accent: item.metadata?.accent || "",
        tags: Array.isArray(item.metadata?.tags) ? item.metadata?.tags : [],
      }))
      .sort((a, b) => a.canonicalName.localeCompare(b.canonicalName));

    return NextResponse.json({ models }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Could not reach Deepgram model catalog." }, { status: 502 });
  }
}

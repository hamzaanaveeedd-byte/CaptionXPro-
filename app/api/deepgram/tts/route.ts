import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const key = process.env.DEEPGRAM_API_KEY;
  if (!key) return NextResponse.json({ error: "DEEPGRAM_API_KEY is missing." }, { status: 500 });

  const body = await request.json().catch(() => ({}));
  const text = typeof body.text === "string" ? body.text.trim() : "";
  const model = typeof body.model === "string" ? body.model : "aura-2-thalia-en";
  const speed = typeof body.speed === "number" ? Math.min(1.5, Math.max(0.7, body.speed)) : 1;
  if (!text) return NextResponse.json({ error: "Text is required." }, { status: 400 });
  if (text.length > 3000) return NextResponse.json({ error: "Dub preview is limited to 3000 characters per request." }, { status: 400 });

  try {
    const response = await fetch(`https://api.deepgram.com/v1/speak?model=${encodeURIComponent(model)}&encoding=mp3&container=none&speed=${speed}`, {
      method: "POST",
      headers: {
        Authorization: `Token ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
      cache: "no-store",
    });
    if (!response.ok) {
      const message = await response.text();
      return NextResponse.json({ error: message || "Deepgram TTS request failed." }, { status: response.status });
    }
    const audio = await response.arrayBuffer();
    return new NextResponse(audio, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "Could not reach Deepgram TTS." }, { status: 502 });
  }
}

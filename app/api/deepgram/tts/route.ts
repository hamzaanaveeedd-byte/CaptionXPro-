import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_TOTAL_TEXT = 12000;
const CHUNK_SIZE = 1800;

export async function POST(request: NextRequest) {
  const key = process.env.DEEPGRAM_API_KEY;
  if (!key) return NextResponse.json({ error: "DEEPGRAM_API_KEY is missing." }, { status: 500 });

  const body = await request.json().catch(() => ({}));
  const text = typeof body.text === "string" ? body.text.trim() : "";
  const model = typeof body.model === "string" ? body.model.trim() : "aura-2-thalia-en";
  const speed = typeof body.speed === "number" ? Math.min(1.5, Math.max(0.7, body.speed)) : 1;

  if (!text) return NextResponse.json({ error: "Text is required." }, { status: 400 });
  if (text.length > MAX_TOTAL_TEXT) {
    return NextResponse.json({ error: `Auto dubbing is limited to ${MAX_TOTAL_TEXT.toLocaleString()} characters per generation.` }, { status: 400 });
  }
  if (!/^aura-2-[a-z0-9-]+$/i.test(model)) {
    return NextResponse.json({ error: "Invalid Deepgram Aura-2 voice model." }, { status: 400 });
  }

  try {
    const chunks = chunkText(text, CHUNK_SIZE);
    const audioParts: Uint8Array[] = [];

    for (const chunk of chunks) {
      const audio = await synthesizeChunk(chunk, model, speed, key);
      audioParts.push(new Uint8Array(audio));
    }

    const merged = concatUint8Arrays(audioParts);
    return new NextResponse(merged, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Disposition": 'inline; filename="captionxpro-dub.mp3"',
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not generate dub audio.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

async function synthesizeChunk(text: string, model: string, speed: number, key: string) {
  const makeRequest = (includeSpeed: boolean) => {
    const params = new URLSearchParams({ model, encoding: "mp3" });
    if (includeSpeed && speed !== 1) params.set("speed", String(speed));
    return fetch(`https://api.deepgram.com/v1/speak?${params.toString()}`, {
      method: "POST",
      headers: {
        Authorization: `Token ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
      cache: "no-store",
    });
  };

  let response = await makeRequest(true);
  if (!response.ok && speed !== 1) response = await makeRequest(false);

  if (!response.ok) {
    const raw = await response.text();
    let message = raw;
    try {
      const parsed = JSON.parse(raw);
      message = parsed?.err_msg || parsed?.error || parsed?.message || raw;
    } catch {
      // Keep raw Deepgram error text.
    }
    throw new Error(message || `Deepgram TTS request failed (${response.status}).`);
  }
  return response.arrayBuffer();
}

function chunkText(text: string, maxLength: number) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return [normalized];

  const sentences = normalized.split(/(?<=[.!?؟])\s+/u);
  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    if (sentence.length > maxLength) {
      if (current) { chunks.push(current); current = ""; }
      const words = sentence.split(" ");
      let part = "";
      for (const word of words) {
        const next = part ? `${part} ${word}` : word;
        if (next.length > maxLength && part) { chunks.push(part); part = word; }
        else part = next;
      }
      if (part) chunks.push(part);
      continue;
    }
    const next = current ? `${current} ${sentence}` : sentence;
    if (next.length > maxLength && current) { chunks.push(current); current = sentence; }
    else current = next;
  }
  if (current) chunks.push(current);
  return chunks;
}

function concatUint8Arrays(parts: Uint8Array[]) {
  const total = parts.reduce((sum, part) => sum + part.byteLength, 0);
  const output = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.byteLength;
  }
  return output;
}

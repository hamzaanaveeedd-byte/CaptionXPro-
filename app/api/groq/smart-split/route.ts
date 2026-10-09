import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type SplitProfile = "short" | "balanced" | "relaxed";

type InputWord = {
  text: string;
  start?: number;
  end?: number;
};

const PROFILE_LIMITS: Record<SplitProfile, { min: number; max: number; label: string }> = {
  short: { min: 2, max: 3, label: "2-3 words" },
  balanced: { min: 2, max: 5, label: "2-5 words" },
  relaxed: { min: 3, max: 5, label: "3-5 words" },
};

const DEFAULT_MODEL = "openai/gpt-oss-20b";
const MAX_WORDS = 20000;

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function validateEndIndexes(endIndexes: unknown, totalWords: number, profile: SplitProfile) {
  if (!Array.isArray(endIndexes) || !endIndexes.length) {
    return "AI returned no caption boundaries.";
  }

  const { min, max } = PROFILE_LIMITS[profile];
  let start = 0;

  for (let i = 0; i < endIndexes.length; i += 1) {
    const end = endIndexes[i];
    if (typeof end !== "number" || !Number.isInteger(end)) return `Boundary ${i + 1} is not an integer.`;
    if (end < start || end >= totalWords) return `Boundary ${i + 1} is out of sequence.`;

    const length = end - start + 1;
    const entireTranscriptIsShort = totalWords < min;
    if (!entireTranscriptIsShort && (length < min || length > max)) {
      return `Caption group ${i + 1} has ${length} words; expected ${min}-${max}.`;
    }
    start = end + 1;
  }

  if (start !== totalWords) return "AI boundaries do not cover the complete transcript.";
  return null;
}

function parseGroqJson(payload: unknown) {
  const data = payload as {
    choices?: Array<{
      message?: {
        content?: string | null;
      };
    }>;
  };

  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("Groq returned an empty response.");
  return JSON.parse(text) as { end_indexes?: number[] };
}

function transcriptForPrompt(words: InputWord[]) {
  return words
    .map((word, index) => {
      const next = words[index + 1];
      const gap = next && typeof word.end === "number" && typeof next.start === "number"
        ? Math.max(0, next.start - word.end)
        : 0;
      const pause = gap >= 0.16 ? ` | pause_after=${gap.toFixed(2)}s` : "";
      return `${index} | ${word.text}${pause}`;
    })
    .join("\n");
}

function buildPrompt(words: InputWord[], profile: SplitProfile, language: string | null, previousError?: string) {
  const limits = PROFILE_LIMITS[profile];
  const correction = previousError
    ? `\nYour previous boundary set failed validation: ${previousError}\nGenerate a corrected boundary set now.\n`
    : "";

  return `You are the semantic caption segmentation engine for CaptionX Pro.

IMPORTANT PROCESS:
1. Read and understand the ENTIRE transcript below before deciding any caption boundary.
2. Identify the speaker's ideas, clauses, natural phrases, names, multi-word terms, phrasal verbs, emphasis, and sentence structure.
3. Only after understanding the full context, split it into short captions.

STRICT RULES:
- Preserve every original token exactly and in the same order. Never rewrite, translate, correct, remove, or add words.
- Return boundaries only. The app will rebuild captions from the original timed words.
- Each caption must contain ${limits.label}${words.length < limits.min ? " (unless the whole transcript is shorter)" : ""}.
- Meaning and phrase integrity should guide WHERE you split, while the word-count range is mandatory.
- Prefer complete semantic units over mechanical equal-sized chunks.
- Avoid stranding articles, auxiliaries, negation, conjunctions, prepositions, or a person's/place's multi-word name when a better legal boundary exists.
- Respect strong punctuation and meaningful speech pauses when they also fit the semantic structure.
- Do not use timestamps as the main decision-maker; they are supporting cues only.
- The first caption starts at word index 0.
- Return the inclusive END index of every caption in order.
- The final end index MUST be ${words.length - 1}.
- End indexes must be strictly increasing and cover every word exactly once.
${language ? `- Language hint: ${language}. Keep the transcript exactly as written even if it is Roman Urdu, Hinglish, or code-switched.\n` : ""}${correction}
OUTPUT:
Return JSON matching the required schema with one field named end_indexes.

FULL INDEXED TRANSCRIPT:
${transcriptForPrompt(words)}`;
}

async function callGroq(apiKey: string, model: string, prompt: string) {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content: "You are a caption segmentation engine. Follow the requested JSON schema exactly and never rewrite transcript words.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.1,
      reasoning_effort: "medium",
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "caption_boundaries",
          strict: true,
          schema: {
            type: "object",
            properties: {
              end_indexes: {
                type: "array",
                description: "Inclusive final word index of every caption group, in order.",
                items: { type: "integer" },
              },
            },
            required: ["end_indexes"],
            additionalProperties: false,
          },
        },
      },
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const raw = await response.text();
    let details = raw;
    try {
      const parsed = JSON.parse(raw) as { error?: { message?: string } | string; message?: string };
      if (typeof parsed.error === "string") details = parsed.error;
      else if (parsed.error?.message) details = parsed.error.message;
      else if (parsed.message) details = parsed.message;
    } catch {
      // Keep raw response text.
    }
    const compact = details.replace(/\s+/g, " ").slice(0, 700);
    throw new Error(`Groq request failed (${response.status}). ${compact}`);
  }

  return response.json();
}

export async function POST(request: Request) {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) return jsonError("GROQ_API_KEY is missing on the server.", 500);

  let body: { words?: InputWord[]; profile?: SplitProfile; language?: string | null };
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON request.");
  }

  const profile: SplitProfile = body.profile && body.profile in PROFILE_LIMITS ? body.profile : "balanced";
  const words = Array.isArray(body.words)
    ? body.words
        .map((word) => ({
          text: typeof word?.text === "string" ? word.text.trim() : "",
          start: typeof word?.start === "number" ? word.start : undefined,
          end: typeof word?.end === "number" ? word.end : undefined,
        }))
        .filter((word) => word.text)
    : [];

  if (words.length < 2) return jsonError("At least two transcript words are required for Smart Split.");
  if (words.length > MAX_WORDS) {
    return jsonError(`This transcript has ${words.length} words. Smart Split currently supports up to ${MAX_WORDS.toLocaleString()} words per run.`);
  }

  const model = process.env.GROQ_MODEL?.trim() || DEFAULT_MODEL;

  try {
    let validationError: string | null = null;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const prompt = buildPrompt(words, profile, body.language ?? null, attempt ? validationError ?? undefined : undefined);
      const payload = await callGroq(apiKey, model, prompt);
      const parsed = parseGroqJson(payload);
      validationError = validateEndIndexes(parsed.end_indexes, words.length, profile);

      if (!validationError) {
        return NextResponse.json({
          endIndexes: parsed.end_indexes,
          model,
          provider: "groq",
          analyzedWords: words.length,
        });
      }
    }

    return jsonError(`Groq could not produce a valid semantic split. ${validationError ?? "Please try again."}`, 502);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Groq Smart Split failed.";
    return jsonError(message, 502);
  }
}

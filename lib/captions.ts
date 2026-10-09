import type { Caption, DeepgramResponse, WordToken } from "@/types/editor";
import { toSrtTime } from "@/lib/time";

function id(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

export type SmartSplitProfile = "short" | "balanced" | "relaxed";

const SMART_SPLIT_SETTINGS: Record<SmartSplitProfile, { minWords: number; maxWords: number; targetWords: number }> = {
  short: { minWords: 2, maxWords: 3, targetWords: 3 },
  balanced: { minWords: 2, maxWords: 5, targetWords: 4 },
  relaxed: { minWords: 3, maxWords: 5, targetWords: 5 },
};

const SOFT_JOINERS = new Set([
  // English
  "a", "an", "the", "to", "of", "in", "on", "at", "for", "with", "from", "and", "or", "but", "as", "by",
  // Roman Urdu / Hinglish
  "ka", "ki", "ke", "ko", "se", "mein", "me", "aur", "ya", "lekin", "ek", "hai", "hain", "tha", "thi", "the",
  // Common Romance / German connectors
  "de", "la", "el", "y", "en", "por", "para", "con", "le", "et", "pour", "avec", "der", "die", "das", "und", "zu", "von", "mit",
]);

function cleanWord(value: string) {
  return value.toLowerCase().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
}

function wordsToText(words: WordToken[]) {
  return words
    .map((word) => word.punctuated || word.text)
    .join(" ")
    .replace(/\s+([,.!?;:،؛؟…])/g, "$1")
    .trim();
}

function boundaryScore(words: WordToken[], endIndex: number, chunkLength: number, targetWords: number) {
  const current = words[endIndex];
  const next = words[endIndex + 1];
  const punctuated = current.punctuated || current.text;
  const clean = cleanWord(punctuated);
  let score = 0;

  if (/[.!?؟…]$/.test(punctuated)) score += 11;
  else if (/[,;:،؛]$/.test(punctuated)) score += 6;

  if (next) {
    const gap = Math.max(0, next.start - current.end);
    if (gap >= 0.65) score += 10;
    else if (gap >= 0.38) score += 6;
    else if (gap >= 0.2) score += 3;
    else if (gap >= 0.1) score += 1;
  }

  score += Math.max(0, 4 - Math.abs(targetWords - chunkLength) * 1.5);
  if (SOFT_JOINERS.has(clean)) score -= 8;

  return score;
}

function segmentTimedWordsSmart(words: WordToken[], profile: SmartSplitProfile) {
  const settings = SMART_SPLIT_SETTINGS[profile];
  const groups: WordToken[][] = [];
  let cursor = 0;

  while (cursor < words.length) {
    const remaining = words.length - cursor;
    if (remaining <= settings.maxWords) {
      groups.push(words.slice(cursor));
      break;
    }

    const firstCandidate = Math.min(words.length - 1, cursor + settings.minWords - 1);
    const lastCandidate = Math.min(words.length - 1, cursor + settings.maxWords - 1);
    let bestEnd = firstCandidate;
    let bestScore = Number.NEGATIVE_INFINITY;

    for (let end = firstCandidate; end <= lastCandidate; end += 1) {
      const chunkLength = end - cursor + 1;
      const score = boundaryScore(words, end, chunkLength, settings.targetWords);
      if (score > bestScore) {
        bestScore = score;
        bestEnd = end;
      }
    }

    groups.push(words.slice(cursor, bestEnd + 1));
    cursor = bestEnd + 1;
  }

  // Avoid a dangling one-word tail when the chosen profile expects at least 2/3 words.
  if (groups.length > 1) {
    const last = groups[groups.length - 1];
    const previous = groups[groups.length - 2];
    while (last.length < settings.minWords && previous.length > settings.minWords) {
      const moved = previous.pop();
      if (moved) last.unshift(moved);
    }
    if (last.length < settings.minWords && previous.length + last.length <= settings.maxWords) {
      previous.push(...last);
      groups.pop();
    }
  }

  return groups.filter((group) => group.length > 0);
}


function normalizeComparableText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function captionWordsStillMatchText(caption: Caption) {
  if (!caption.words.length) return false;
  const fromWords = wordsToText(caption.words);
  return normalizeComparableText(fromWords) === normalizeComparableText(caption.text);
}

function approximateWordsFromCaption(caption: Caption): WordToken[] {
  const rawWords = caption.text.trim().split(/\s+/).filter(Boolean);
  if (!rawWords.length) return [];
  const duration = Math.max(0.08, caption.end - caption.start);
  return rawWords.map((word, index) => {
    const start = caption.start + duration * (index / rawWords.length);
    const end = caption.start + duration * ((index + 1) / rawWords.length);
    return {
      id: id("word"),
      text: word.replace(/[,.!?;:،؛؟…]+$/u, ""),
      punctuated: word,
      start,
      end,
    };
  });
}

/**
 * Re-segments the current transcript into short, readable caption groups.
 * Real Deepgram word timestamps are preserved whenever available. Imported/manual
 * subtitles fall back to proportional timing inside their existing caption bounds.
 */
export function smartSplitCaptions(captions: Caption[], profile: SmartSplitProfile = "balanced") {
  if (!captions.length) return [];

  const sourceWords = captions
    .flatMap((caption) =>
      captionWordsStillMatchText(caption)
        ? caption.words.map((word) => ({ ...word }))
        : approximateWordsFromCaption(caption),
    )
    .sort((a, b) => a.start - b.start || a.end - b.end);

  if (!sourceWords.length) return captions.map((caption) => ({ ...caption, words: caption.words.map((word) => ({ ...word })) }));

  return segmentTimedWordsSmart(sourceWords, profile).map((group) => ({
    id: id("caption"),
    start: group[0].start,
    end: group[group.length - 1].end,
    text: wordsToText(group),
    words: group.map((word) => ({ ...word })),
  }));
}

export function deepgramWordsToTokens(response: DeepgramResponse): WordToken[] {
  const words = response.results?.channels?.[0]?.alternatives?.[0]?.words ?? [];
  return words
    .filter((word) => typeof word.start === "number" && typeof word.end === "number" && (word.word || word.punctuated_word))
    .map((word) => ({
      id: id("word"),
      text: word.word ?? word.punctuated_word ?? "",
      punctuated: word.punctuated_word ?? word.word ?? "",
      start: word.start ?? 0,
      end: word.end ?? word.start ?? 0,
      confidence: word.confidence,
    }));
}

export function segmentWords(words: WordToken[]) {
  const captions: Caption[] = [];
  let bucket: WordToken[] = [];

  const flush = () => {
    if (!bucket.length) return;
    const text = bucket.map((word) => word.punctuated).join(" ").replace(/\s+([,.!?;:])/g, "$1").trim();
    captions.push({
      id: id("caption"),
      start: bucket[0].start,
      end: bucket[bucket.length - 1].end,
      text,
      words: bucket.map((word) => ({ ...word })),
    });
    bucket = [];
  };

  for (let i = 0; i < words.length; i += 1) {
    const word = words[i];
    const previous = bucket[bucket.length - 1];
    const next = words[i + 1];
    const gapBefore = previous ? word.start - previous.end : 0;
    if (bucket.length && gapBefore > 0.75) flush();
    bucket.push(word);

    const text = bucket.map((item) => item.punctuated).join(" ");
    const duration = bucket[bucket.length - 1].end - bucket[0].start;
    const punctuationBoundary = /[.!?…]$/.test(word.punctuated);
    const longEnough = text.length >= 72 || duration >= 5.2;
    const naturalBoundary = punctuationBoundary && (text.length >= 22 || duration >= 1.2);
    const nextGap = next ? next.start - word.end : 0;
    if (longEnough || naturalBoundary || nextGap > 0.7) flush();
  }
  flush();
  return captions;
}

function normalizeTextForSplit(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

export function splitCaption(caption: Caption, cursor: number): [Caption, Caption] | null {
  const raw = caption.text;
  const leftText = raw.slice(0, cursor).trim();
  const rightText = raw.slice(cursor).trim();
  if (!leftText || !rightText) return null;

  let boundary: number | null = null;
  let leftWords: WordToken[] = [];
  let rightWords: WordToken[] = [];

  if (caption.words.length) {
    const normalizedLeft = normalizeTextForSplit(leftText).toLowerCase();
    let assembled = "";
    let matched = 0;
    for (let i = 0; i < caption.words.length; i += 1) {
      assembled = normalizeTextForSplit(`${assembled} ${caption.words[i].punctuated}`).toLowerCase();
      if (normalizedLeft.startsWith(assembled) || assembled.startsWith(normalizedLeft)) matched = i + 1;
    }
    if (matched > 0 && matched < caption.words.length) {
      leftWords = caption.words.slice(0, matched).map((word) => ({ ...word }));
      rightWords = caption.words.slice(matched).map((word) => ({ ...word }));
      boundary = (leftWords[leftWords.length - 1].end + rightWords[0].start) / 2;
    }
  }

  if (boundary === null) {
    const ratio = Math.max(0.08, Math.min(0.92, leftText.length / Math.max(1, leftText.length + rightText.length)));
    boundary = caption.start + (caption.end - caption.start) * ratio;
  }

  const gap = Math.min(0.02, Math.max(0, (caption.end - caption.start) * 0.002));
  const left: Caption = {
    ...caption,
    end: Math.max(caption.start + 0.08, boundary - gap / 2),
    text: leftText,
    words: leftWords,
  };
  const right: Caption = {
    ...caption,
    id: id("caption"),
    start: Math.min(caption.end - 0.08, boundary + gap / 2),
    text: rightText,
    words: rightWords,
  };
  return [left, right];
}

export function normalizeCaptions(captions: Caption[], duration: number) {
  return captions
    .map((caption) => ({
      ...caption,
      start: Math.max(0, Math.min(caption.start, duration)),
      end: Math.max(0, Math.min(caption.end, duration)),
      text: caption.text.trim(),
    }))
    .filter((caption) => caption.text && caption.end > caption.start)
    .sort((a, b) => a.start - b.start)
    .map((caption) => ({ ...caption, end: Math.max(caption.start + 0.05, caption.end) }));
}

export function exportSrt(captions: Caption[]) {
  return captions
    .map((caption, index) => `${index + 1}\n${toSrtTime(caption.start)} --> ${toSrtTime(caption.end)}\n${caption.text.trim()}\n`)
    .join("\n");
}

export function exportVtt(captions: Caption[]) {
  return `WEBVTT\n\n${captions
    .map((caption) => `${toSrtTime(caption.start).replace(",", ".")} --> ${toSrtTime(caption.end).replace(",", ".")}\n${caption.text.trim()}\n`)
    .join("\n")}`;
}

export function parseSubtitleFile(text: string): Caption[] {
  const normalized = text.replace(/^WEBVTT[^\n]*\n/i, "").replace(/\r/g, "");
  const blocks = normalized.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);
  const output: Caption[] = [];
  const timeToSeconds = (value: string) => {
    const parts = value.replace(",", ".").split(":").map(Number);
    if (parts.some((part) => !Number.isFinite(part))) return null;
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return null;
  };

  for (const block of blocks) {
    const lines = block.split("\n");
    const timingIndex = lines.findIndex((line) => line.includes("-->"));
    if (timingIndex < 0) continue;
    const [startText, endTextRaw] = lines[timingIndex].split("-->").map((part) => part.trim());
    const endText = endTextRaw.split(/\s+/)[0];
    const start = timeToSeconds(startText);
    const end = timeToSeconds(endText);
    if (start === null || end === null || end <= start) continue;
    const captionText = lines.slice(timingIndex + 1).join("\n").trim();
    if (!captionText) continue;
    output.push({ id: id("caption"), start, end, text: captionText, words: [] });
  }
  return output;
}

import type { Caption, DeepgramResponse, WordToken } from "@/types/editor";
import { clamp, formatClock } from "@/lib/time";

const HARD_END = /[.!?؟۔…]$/u;
const SOFT_END = /[,;:،؛]$/u;

function id(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function deepgramWordsToTokens(payload: DeepgramResponse): WordToken[] {
  const words = payload.results?.channels?.[0]?.alternatives?.[0]?.words ?? [];
  return words
    .filter((word) => typeof word.start === "number" && typeof word.end === "number" && (word.word || word.punctuated_word))
    .map((word) => ({
      id: id("word"),
      text: (word.word || word.punctuated_word || "").trim(),
      punctuated: (word.punctuated_word || word.word || "").trim(),
      start: word.start ?? 0,
      end: word.end ?? word.start ?? 0,
      confidence: word.confidence,
    }));
}

function visibleText(words: WordToken[]) {
  return words.map((word) => word.punctuated || word.text).join(" ").replace(/\s+([,.!?;:،؛؟۔])/gu, "$1").trim();
}

function shouldBreak(words: WordToken[], next?: WordToken) {
  if (!words.length) return false;
  const text = visibleText(words);
  const duration = words[words.length - 1].end - words[0].start;
  const chars = text.length;
  const gap = next ? next.start - words[words.length - 1].end : 0;
  const last = words[words.length - 1].punctuated || words[words.length - 1].text;

  if (duration >= 6) return true;
  if (chars >= 78) return true;
  if (gap >= 0.72 && duration >= 1) return true;
  if (HARD_END.test(last) && duration >= 1.15) return true;
  if (SOFT_END.test(last) && duration >= 2.3 && chars >= 34) return true;
  return false;
}

export function segmentWords(words: WordToken[]): Caption[] {
  if (!words.length) return [];
  const result: Caption[] = [];
  let bucket: WordToken[] = [];

  const flush = () => {
    if (!bucket.length) return;
    const start = bucket[0].start;
    const end = Math.max(bucket[bucket.length - 1].end, start + 0.25);
    result.push({ id: id("caption"), start, end, text: visibleText(bucket), words: bucket });
    bucket = [];
  };

  for (let i = 0; i < words.length; i += 1) {
    bucket.push(words[i]);
    const next = words[i + 1];
    if (shouldBreak(bucket, next)) flush();
  }
  flush();

  // Merge tiny fragments into a neighbor so captions feel natural.
  const merged: Caption[] = [];
  for (const cap of result) {
    const duration = cap.end - cap.start;
    if (merged.length && (duration < 0.75 || cap.text.length < 8)) {
      const prev = merged[merged.length - 1];
      if (cap.end - prev.start <= 6.5 && `${prev.text} ${cap.text}`.length <= 88) {
        prev.end = cap.end;
        prev.text = `${prev.text} ${cap.text}`.replace(/\s+/g, " ").trim();
        prev.words = [...prev.words, ...cap.words];
        continue;
      }
    }
    merged.push({ ...cap });
  }
  return merged;
}

export function splitCaption(caption: Caption, cursor: number): [Caption, Caption] | null {
  const leftText = caption.text.slice(0, cursor).trim();
  const rightText = caption.text.slice(cursor).trim();
  if (!leftText || !rightText) return null;

  const leftWordCount = leftText.split(/\s+/u).filter(Boolean).length;
  const totalTextWords = caption.text.split(/\s+/u).filter(Boolean).length;
  let boundary: number;
  let leftWords: WordToken[] = [];
  let rightWords: WordToken[] = [];

  if (caption.words.length >= 2 && leftWordCount > 0 && leftWordCount < caption.words.length && Math.abs(totalTextWords - caption.words.length) <= 2) {
    leftWords = caption.words.slice(0, leftWordCount);
    rightWords = caption.words.slice(leftWordCount);
    const leftEnd = leftWords[leftWords.length - 1].end;
    const rightStart = rightWords[0].start;
    boundary = rightStart >= leftEnd ? (leftEnd + rightStart) / 2 : leftEnd;
  } else {
    const ratio = clamp(cursor / Math.max(1, caption.text.length), 0.08, 0.92);
    boundary = caption.start + (caption.end - caption.start) * ratio;
    const splitIndex = Math.round(caption.words.length * ratio);
    leftWords = caption.words.slice(0, splitIndex);
    rightWords = caption.words.slice(splitIndex);
  }

  boundary = clamp(boundary, caption.start + 0.08, caption.end - 0.08);
  return [
    { ...caption, id: id("caption"), text: leftText, end: boundary, words: leftWords },
    { ...caption, id: id("caption"), text: rightText, start: boundary + 0.01, words: rightWords },
  ];
}

export function normalizeCaptions(captions: Caption[], duration: number) {
  const ordered = captions
    .map((c) => ({ ...c, start: clamp(c.start, 0, Math.max(0, duration)), end: clamp(c.end, 0, Math.max(0, duration)) }))
    .filter((c) => c.text.trim().length > 0)
    .sort((a, b) => a.start - b.start);

  return ordered.map((cap, index) => {
    const next = ordered[index + 1];
    let end = Math.max(cap.end, cap.start + 0.08);
    if (next && end > next.start) end = Math.max(cap.start + 0.08, next.start - 0.01);
    return { ...cap, end: Math.min(duration || end, end) };
  });
}

export function exportSrt(captions: Caption[]) {
  return captions
    .slice()
    .sort((a, b) => a.start - b.start)
    .map((cap, i) => `${i + 1}\n${formatClock(cap.start, true)} --> ${formatClock(cap.end, true)}\n${cap.text.trim()}\n`)
    .join("\n");
}

export function exportVtt(captions: Caption[]) {
  return `WEBVTT\n\n${captions
    .slice()
    .sort((a, b) => a.start - b.start)
    .map((cap) => `${formatClock(cap.start)} --> ${formatClock(cap.end)}\n${cap.text.trim()}\n`)
    .join("\n")}`;
}

export function parseSubtitleFile(content: string): Caption[] {
  const normalized = content.replace(/^WEBVTT\s*/i, "").replace(/\r/g, "").trim();
  const blocks = normalized.split(/\n{2,}/);
  const captions: Caption[] = [];
  for (const block of blocks) {
    const lines = block.split("\n").filter(Boolean);
    const timingIndex = lines.findIndex((line) => line.includes("-->"));
    if (timingIndex < 0) continue;
    const [rawStart, rawEnd] = lines[timingIndex].split("-->").map((s) => s.trim().split(/\s+/)[0]);
    const parse = (value: string) => {
      const clean = value.replace(",", ".");
      const parts = clean.split(":").map(Number);
      if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
      if (parts.length === 2) return parts[0] * 60 + parts[1];
      return Number(clean);
    };
    const start = parse(rawStart);
    const end = parse(rawEnd);
    const text = lines.slice(timingIndex + 1).join(" ").trim();
    if (Number.isFinite(start) && Number.isFinite(end) && text) {
      captions.push({ id: id("caption"), start, end, text, words: [] });
    }
  }
  return captions;
}

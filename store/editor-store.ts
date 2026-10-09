"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Caption, CaptionStyle, CanvasSettings, MediaInfo, ProjectSnapshot, TranscriptionLanguage } from "@/types/editor";
import {
  captionsFromSemanticEndIndexes,
  getSmartSplitSourceWords,
  normalizeCaptions,
  smartSplitCaptions as buildSmartSplitCaptions,
  splitCaption,
  type SmartSplitProfile,
} from "@/lib/captions";
import { clamp } from "@/lib/time";

type HistoryEntry = Caption[];

type EditorState = {
  title: string;
  language: TranscriptionLanguage;
  detectedLanguage: string | null;
  media: MediaInfo | null;
  captions: Caption[];
  style: CaptionStyle;
  canvas: CanvasSettings;
  versions: ProjectSnapshot[];
  selectedCaptionId: string | null;
  activeCaptionId: string | null;
  currentTime: number;
  zoom: number;
  past: HistoryEntry[];
  future: HistoryEntry[];
  setTitle: (value: string) => void;
  setLanguage: (value: EditorState["language"]) => void;
  setDetectedLanguage: (value: string | null) => void;
  setMedia: (value: MediaInfo | null) => void;
  replaceCaptions: (value: Caption[]) => void;
  updateCaptionText: (id: string, text: string) => void;
  updateCaptionTiming: (id: string, start: number, end: number) => void;
  moveCaption: (id: string, delta: number) => void;
  resizeCaption: (id: string, edge: "start" | "end", time: number) => void;
  deleteCaption: (id: string) => void;
  duplicateCaption: (id: string) => void;
  splitCaptionAt: (id: string, cursor: number) => string | null;
  smartSplitCaptions: (profile?: SmartSplitProfile) => number;
  semanticSmartSplitCaptions: (profile?: SmartSplitProfile) => Promise<{ count: number; model: string }>;
  mergeWithNext: (id: string) => void;
  createCaptionAt: (time: number) => void;
  selectCaption: (id: string | null) => void;
  setActiveCaption: (id: string | null) => void;
  setCurrentTime: (time: number) => void;
  setZoom: (zoom: number) => void;
  setStyle: (patch: Partial<CaptionStyle>) => void;
  setCanvas: (patch: Partial<CanvasSettings>) => void;
  saveVersion: () => void;
  restoreVersion: (id: string) => void;
  undo: () => void;
  redo: () => void;
  validate: () => void;
  resetProject: () => void;
};

const defaultStyle: CaptionStyle = {
  fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
  fontSize: 38,
  fontWeight: 700,
  textColor: "#ffffff",
  backgroundColor: "#000000",
  backgroundOpacity: 0.64,
  positionY: 84,
  maxWidth: 84,
  textAlign: "center",
  italic: false,
  uppercase: false,
  shadow: true,
  stroke: false,
};

const defaultCanvas: CanvasSettings = {
  aspectRatio: "original",
  backgroundColor: "#111214",
  blur: false,
  safeZone: "none",
  padding: 0,
  snapToGrid: false,
  speakerFocus: false,
  fitMode: "fit",
  videoScale: 1,
  videoX: 0,
  videoY: 0,
};

const cloneCaptions = (captions: Caption[]) =>
  captions.map((caption) => ({ ...caption, words: caption.words.map((word) => ({ ...word })) }));

function mutateWithHistory(state: EditorState, mutate: (captions: Caption[]) => Caption[]) {
  return {
    captions: mutate(cloneCaptions(state.captions)),
    past: [...state.past, cloneCaptions(state.captions)].slice(-100),
    future: [] as HistoryEntry[],
  };
}

export const useEditorStore = create<EditorState>()(
  persist(
    (set, get) => ({
      title: "CaptionX Pro Project",
      language: "auto",
      detectedLanguage: null,
      media: null,
      captions: [],
      style: defaultStyle,
      canvas: defaultCanvas,
      versions: [],
      selectedCaptionId: null,
      activeCaptionId: null,
      currentTime: 0,
      zoom: 48,
      past: [],
      future: [],

      setTitle: (title) => set({ title }),
      setLanguage: (language) => set({ language }),
      setDetectedLanguage: (detectedLanguage) => set({ detectedLanguage }),
      setMedia: (media) => set({ media, currentTime: 0, activeCaptionId: null, detectedLanguage: null }),
      replaceCaptions: (captions) =>
        set((state) => ({
          ...mutateWithHistory(state, () => captions),
          selectedCaptionId: captions[0]?.id ?? null,
        })),
      updateCaptionText: (id, text) =>
        set((state) => mutateWithHistory(state, (captions) => captions.map((caption) => (caption.id === id ? { ...caption, text } : caption)))),
      updateCaptionTiming: (id, start, end) =>
        set((state) =>
          mutateWithHistory(state, (captions) =>
            captions.map((caption) =>
              caption.id === id
                ? { ...caption, start: Math.max(0, start), end: Math.max(start + 0.08, end) }
                : caption,
            ),
          ),
        ),
      moveCaption: (id, delta) =>
        set((state) =>
          mutateWithHistory(state, (captions) => {
            const duration = state.media?.duration ?? Number.POSITIVE_INFINITY;
            return captions.map((caption) => {
              if (caption.id !== id) return caption;
              const length = caption.end - caption.start;
              const start = clamp(caption.start + delta, 0, Math.max(0, duration - length));
              return { ...caption, start, end: start + length };
            });
          }),
        ),
      resizeCaption: (id, edge, time) =>
        set((state) =>
          mutateWithHistory(state, (captions) =>
            captions.map((caption) => {
              if (caption.id !== id) return caption;
              if (edge === "start") return { ...caption, start: clamp(time, 0, caption.end - 0.08) };
              return { ...caption, end: clamp(time, caption.start + 0.08, state.media?.duration ?? time) };
            }),
          ),
        ),
      deleteCaption: (id) =>
        set((state) => ({
          ...mutateWithHistory(state, (captions) => captions.filter((caption) => caption.id !== id)),
          selectedCaptionId: state.selectedCaptionId === id ? null : state.selectedCaptionId,
        })),
      duplicateCaption: (id) =>
        set((state) =>
          mutateWithHistory(state, (captions) => {
            const index = captions.findIndex((caption) => caption.id === id);
            if (index < 0) return captions;
            const source = captions[index];
            const length = source.end - source.start;
            const start = Math.min(source.end + 0.03, state.media?.duration ?? source.end + 0.03);
            captions.splice(index + 1, 0, {
              ...source,
              id: `caption-${crypto.randomUUID()}`,
              start,
              end: Math.min(start + length, state.media?.duration ?? start + length),
              words: [],
            });
            return captions;
          }),
        ),
      splitCaptionAt: (id, cursor) => {
        const state = get();
        const index = state.captions.findIndex((caption) => caption.id === id);
        if (index < 0) return null;
        const split = splitCaption(state.captions[index], cursor);
        if (!split) return null;
        const right = split[1];
        set((current) => ({
          ...mutateWithHistory(current, (captions) => {
            const target = captions.findIndex((caption) => caption.id === id);
            if (target >= 0) captions.splice(target, 1, ...split);
            return captions;
          }),
          selectedCaptionId: right.id,
        }));
        return right.id;
      },
      smartSplitCaptions: (profile = "balanced") => {
        const state = get();
        if (!state.captions.length) return 0;
        const smartCaptions = buildSmartSplitCaptions(state.captions, profile);
        if (!smartCaptions.length) return 0;
        set((current) => ({
          ...mutateWithHistory(current, () => smartCaptions),
          selectedCaptionId: smartCaptions[0]?.id ?? null,
          activeCaptionId: null,
        }));
        return smartCaptions.length;
      },
      semanticSmartSplitCaptions: async (profile = "balanced") => {
        const state = get();
        if (!state.captions.length) throw new Error("No captions are available to analyze.");

        const sourceWords = getSmartSplitSourceWords(state.captions);
        if (sourceWords.length < 2) throw new Error("At least two transcript words are required for AI Smart Split.");

        const response = await fetch("/api/gemini/smart-split", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            profile,
            language: state.detectedLanguage ?? state.language,
            words: sourceWords.map((word) => ({
              text: word.punctuated || word.text,
              start: word.start,
              end: word.end,
            })),
          }),
        });

        const payload = (await response.json().catch(() => ({}))) as {
          endIndexes?: number[];
          model?: string;
          error?: string;
        };

        if (!response.ok) throw new Error(payload.error || `AI Smart Split failed (${response.status}).`);
        if (!Array.isArray(payload.endIndexes)) throw new Error("AI Smart Split returned invalid caption boundaries.");

        const semanticCaptions = captionsFromSemanticEndIndexes(sourceWords, payload.endIndexes);
        if (!semanticCaptions.length) throw new Error("AI Smart Split could not map the semantic boundaries to the transcript.");

        set((current) => ({
          ...mutateWithHistory(current, () => semanticCaptions),
          selectedCaptionId: semanticCaptions[0]?.id ?? null,
          activeCaptionId: null,
        }));

        return { count: semanticCaptions.length, model: payload.model || "Gemini" };
      },
      mergeWithNext: (id) =>
        set((state) =>
          mutateWithHistory(state, (captions) => {
            const index = captions.findIndex((caption) => caption.id === id);
            if (index < 0 || index === captions.length - 1) return captions;
            const current = captions[index];
            const next = captions[index + 1];
            captions.splice(index, 2, {
              ...current,
              end: Math.max(current.end, next.end),
              text: `${current.text.trim()} ${next.text.trim()}`.trim(),
              words: [...current.words, ...next.words],
            });
            return captions;
          }),
        ),
      createCaptionAt: (time) =>
        set((state) =>
          mutateWithHistory(state, (captions) => {
            const duration = state.media?.duration ?? time + 2;
            const start = clamp(time, 0, Math.max(0, duration - 0.5));
            const caption: Caption = {
              id: `caption-${crypto.randomUUID()}`,
              start,
              end: Math.min(duration, start + 2),
              text: "New caption",
              words: [],
            };
            return [...captions, caption].sort((a, b) => a.start - b.start);
          }),
        ),
      selectCaption: (selectedCaptionId) => set({ selectedCaptionId }),
      setActiveCaption: (activeCaptionId) => set({ activeCaptionId }),
      setCurrentTime: (currentTime) => set({ currentTime }),
      setZoom: (zoom) => set({ zoom: clamp(zoom, 22, 160) }),
      setStyle: (patch) => set((state) => ({ style: { ...state.style, ...patch } })),
      setCanvas: (patch) => set((state) => ({ canvas: { ...state.canvas, ...patch } })),
      saveVersion: () =>
        set((state) => ({
          versions: [
            {
              id: crypto.randomUUID(),
              title: state.title,
              captions: cloneCaptions(state.captions),
              style: { ...state.style },
              canvas: { ...state.canvas },
              updatedAt: new Date().toISOString(),
            },
            ...state.versions,
          ].slice(0, 20),
        })),
      restoreVersion: (id) =>
        set((state) => {
          const version = state.versions.find((item) => item.id === id);
          if (!version) return {};
          return {
            title: version.title,
            captions: cloneCaptions(version.captions),
            style: { ...version.style },
            canvas: { ...version.canvas },
            selectedCaptionId: version.captions[0]?.id ?? null,
          };
        }),
      undo: () =>
        set((state) => {
          const previous = state.past.at(-1);
          if (!previous) return state;
          return {
            captions: cloneCaptions(previous),
            past: state.past.slice(0, -1),
            future: [cloneCaptions(state.captions), ...state.future].slice(0, 100),
          };
        }),
      redo: () =>
        set((state) => {
          const next = state.future[0];
          if (!next) return state;
          return {
            captions: cloneCaptions(next),
            past: [...state.past, cloneCaptions(state.captions)].slice(-100),
            future: state.future.slice(1),
          };
        }),
      validate: () =>
        set((state) => ({
          captions: normalizeCaptions(
            state.captions,
            state.media?.duration ?? Math.max(0, ...state.captions.map((caption) => caption.end)),
          ),
        })),
      resetProject: () =>
        set({
          title: "CaptionX Pro Project",
          media: null,
          detectedLanguage: null,
          captions: [],
          style: defaultStyle,
          canvas: defaultCanvas,
          selectedCaptionId: null,
          activeCaptionId: null,
          currentTime: 0,
          past: [],
          future: [],
        }),
    }),
    {
      name: "captionxpro-v2.5-rebuilt",
      partialize: (state) => ({
        title: state.title,
        language: state.language,
        captions: state.captions,
        style: state.style,
        canvas: state.canvas,
        versions: state.versions,
        zoom: state.zoom,
      }),
      merge: (persisted, current) => {
        const saved = persisted as Partial<Omit<EditorState, "language">> & { language?: string };
        const migratedLanguage = saved.language === "multi" ? "hinglish" : saved.language;
        return {
          ...current,
          ...saved,
          language: (migratedLanguage ?? current.language) as TranscriptionLanguage,
          media: null,
          detectedLanguage: null,
          currentTime: 0,
          activeCaptionId: null,
          selectedCaptionId: null,
          past: [],
          future: [],
        };
      },
    },
  ),
);

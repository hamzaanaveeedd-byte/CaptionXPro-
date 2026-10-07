"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Caption, CaptionStyle, MediaInfo } from "@/types/editor";
import { normalizeCaptions, splitCaption } from "@/lib/captions";
import { clamp } from "@/lib/time";

type HistoryEntry = Caption[];

type EditorState = {
  title: string;
  language: "auto" | "en" | "ur" | "ar" | "multi";
  media: MediaInfo | null;
  captions: Caption[];
  style: CaptionStyle;
  selectedCaptionId: string | null;
  activeCaptionId: string | null;
  currentTime: number;
  zoom: number;
  past: HistoryEntry[];
  future: HistoryEntry[];
  setTitle: (title: string) => void;
  setLanguage: (language: EditorState["language"]) => void;
  setMedia: (media: MediaInfo | null) => void;
  replaceCaptions: (captions: Caption[]) => void;
  updateCaptionText: (id: string, text: string) => void;
  updateCaptionTiming: (id: string, start: number, end: number) => void;
  moveCaption: (id: string, delta: number) => void;
  resizeCaption: (id: string, edge: "start" | "end", time: number) => void;
  deleteCaption: (id: string) => void;
  duplicateCaption: (id: string) => void;
  splitCaptionAt: (id: string, cursor: number) => string | null;
  mergeWithNext: (id: string) => void;
  createCaptionAt: (time: number) => void;
  selectCaption: (id: string | null) => void;
  setActiveCaption: (id: string | null) => void;
  setCurrentTime: (time: number) => void;
  setZoom: (zoom: number) => void;
  setStyle: (patch: Partial<CaptionStyle>) => void;
  undo: () => void;
  redo: () => void;
  validate: () => void;
};

const defaultStyle: CaptionStyle = {
  fontSize: 38,
  fontWeight: 700,
  textColor: "#ffffff",
  backgroundColor: "#000000",
  backgroundOpacity: 0.62,
  positionY: 82,
  maxWidth: 82,
  textAlign: "center",
  italic: false,
  uppercase: false,
  shadow: true,
};

const copyCaptions = (captions: Caption[]) => captions.map((c) => ({ ...c, words: c.words.map((w) => ({ ...w })) }));

function mutateWithHistory(state: EditorState, mutate: (captions: Caption[]) => Caption[]) {
  const past = [...state.past, copyCaptions(state.captions)].slice(-100);
  return { captions: mutate(copyCaptions(state.captions)), past, future: [] as HistoryEntry[] };
}

export const useEditorStore = create<EditorState>()(
  persist(
    (set, get) => ({
      title: "Captionx Project",
      language: "auto",
      media: null,
      captions: [],
      style: defaultStyle,
      selectedCaptionId: null,
      activeCaptionId: null,
      currentTime: 0,
      zoom: 44,
      past: [],
      future: [],
      setTitle: (title) => set({ title }),
      setLanguage: (language) => set({ language }),
      setMedia: (media) => set({ media, currentTime: 0, selectedCaptionId: null, activeCaptionId: null }),
      replaceCaptions: (captions) => set((state) => ({ ...mutateWithHistory(state, () => captions), selectedCaptionId: captions[0]?.id ?? null })),
      updateCaptionText: (id, text) => set((state) => mutateWithHistory(state, (captions) => captions.map((c) => (c.id === id ? { ...c, text } : c)))),
      updateCaptionTiming: (id, start, end) => set((state) => mutateWithHistory(state, (captions) => captions.map((c) => (c.id === id ? { ...c, start: Math.max(0, start), end: Math.max(start + 0.08, end) } : c)))),
      moveCaption: (id, delta) => set((state) => mutateWithHistory(state, (captions) => {
        const duration = state.media?.duration ?? Number.POSITIVE_INFINITY;
        return captions.map((c) => {
          if (c.id !== id) return c;
          const length = c.end - c.start;
          const start = clamp(c.start + delta, 0, Math.max(0, duration - length));
          return { ...c, start, end: start + length };
        });
      })),
      resizeCaption: (id, edge, time) => set((state) => mutateWithHistory(state, (captions) => captions.map((c) => {
        if (c.id !== id) return c;
        if (edge === "start") return { ...c, start: clamp(time, 0, c.end - 0.08) };
        return { ...c, end: clamp(time, c.start + 0.08, state.media?.duration || time) };
      }))),
      deleteCaption: (id) => set((state) => ({ ...mutateWithHistory(state, (captions) => captions.filter((c) => c.id !== id)), selectedCaptionId: state.selectedCaptionId === id ? null : state.selectedCaptionId })),
      duplicateCaption: (id) => set((state) => mutateWithHistory(state, (captions) => {
        const index = captions.findIndex((c) => c.id === id);
        if (index < 0) return captions;
        const source = captions[index];
        const length = source.end - source.start;
        const start = Math.min(source.end + 0.02, state.media?.duration ?? source.end + 0.02);
        const duplicate: Caption = { ...source, id: `caption-${crypto.randomUUID()}`, start, end: Math.min(start + length, state.media?.duration ?? start + length), words: [] };
        captions.splice(index + 1, 0, duplicate);
        return captions;
      })),
      splitCaptionAt: (id, cursor) => {
        const state = get();
        const index = state.captions.findIndex((c) => c.id === id);
        if (index < 0) return null;
        const result = splitCaption(state.captions[index], cursor);
        if (!result) return null;
        const [, right] = result;
        set((current) => ({ ...mutateWithHistory(current, (captions) => {
          const idx = captions.findIndex((c) => c.id === id);
          if (idx < 0) return captions;
          captions.splice(idx, 1, ...result);
          return captions;
        }), selectedCaptionId: right.id }));
        return right.id;
      },
      mergeWithNext: (id) => set((state) => mutateWithHistory(state, (captions) => {
        const index = captions.findIndex((c) => c.id === id);
        if (index < 0 || index === captions.length - 1) return captions;
        const current = captions[index];
        const next = captions[index + 1];
        const merged: Caption = {
          ...current,
          end: Math.max(current.end, next.end),
          text: `${current.text.trim()} ${next.text.trim()}`.trim(),
          words: [...current.words, ...next.words],
        };
        captions.splice(index, 2, merged);
        return captions;
      })),
      createCaptionAt: (time) => set((state) => mutateWithHistory(state, (captions) => {
        const duration = state.media?.duration ?? time + 2;
        const start = clamp(time, 0, Math.max(0, duration - 0.5));
        const cap: Caption = { id: `caption-${crypto.randomUUID()}`, start, end: Math.min(duration, start + 2), text: "New caption", words: [] };
        return [...captions, cap].sort((a, b) => a.start - b.start);
      })),
      selectCaption: (selectedCaptionId) => set({ selectedCaptionId }),
      setActiveCaption: (activeCaptionId) => set({ activeCaptionId }),
      setCurrentTime: (currentTime) => set({ currentTime }),
      setZoom: (zoom) => set({ zoom: clamp(zoom, 20, 120) }),
      setStyle: (patch) => set((state) => ({ style: { ...state.style, ...patch } })),
      undo: () => set((state) => {
        const previous = state.past[state.past.length - 1];
        if (!previous) return state;
        return { captions: copyCaptions(previous), past: state.past.slice(0, -1), future: [copyCaptions(state.captions), ...state.future].slice(0, 100) };
      }),
      redo: () => set((state) => {
        const next = state.future[0];
        if (!next) return state;
        return { captions: copyCaptions(next), past: [...state.past, copyCaptions(state.captions)].slice(-100), future: state.future.slice(1) };
      }),
      validate: () => set((state) => ({ captions: normalizeCaptions(state.captions, state.media?.duration ?? Math.max(...state.captions.map((c) => c.end), 0)) })),
    }),
    {
      name: "captionx-editor-v2",
      partialize: (state) => ({
        title: state.title,
        language: state.language,
        captions: state.captions,
        style: state.style,
        zoom: state.zoom,
      }),
      merge: (persisted, current) => ({ ...current, ...(persisted as Partial<EditorState>), media: null, currentTime: 0, activeCaptionId: null, selectedCaptionId: null, past: [], future: [] }),
    },
  ),
);

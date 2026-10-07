"use client";

import { useRef, useState } from "react";
import { parseSubtitleFile, deepgramWordsToTokens, segmentWords } from "@/lib/captions";
import { transcribeWithDeepgram } from "@/lib/deepgram";
import { useEditorStore } from "@/store/editor-store";
import type { MediaInfo } from "@/types/editor";

const allowed = ["mp3", "wav", "m4a", "aac", "mp4", "mov", "webm", "ogg", "flac"];

export function SubtitleWorkspace({ onMediaReady }: { onMediaReady: (file: File, media: MediaInfo) => void }) {
  const mediaInput = useRef<HTMLInputElement>(null);
  const subtitleInput = useRef<HTMLInputElement>(null);
  const media = useEditorStore((state) => state.media);
  const language = useEditorStore((state) => state.language);
  const setMedia = useEditorStore((state) => state.setMedia);
  const setTitle = useEditorStore((state) => state.setTitle);
  const replaceCaptions = useEditorStore((state) => state.replaceCaptions);
  const createCaptionAt = useEditorStore((state) => state.createCaptionAt);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState("");
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);

  async function importMedia(file?: File) {
    if (!file || busy) return;
    setError("");
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!allowed.includes(ext)) {
      setError("Unsupported file. Use MP3, WAV, M4A, AAC, MP4, MOV, WebM, OGG or FLAC.");
      return;
    }
    if (file.size <= 0) {
      setError("The selected file is empty.");
      return;
    }

    const kind: "audio" | "video" = file.type.startsWith("video/") || ["mp4", "mov", "webm"].includes(ext) ? "video" : "audio";
    const objectUrl = URL.createObjectURL(file);
    setBusy(true);
    try {
      setStage("Reading media…");
      const duration = await readDuration(objectUrl, kind);
      if (media?.objectUrl?.startsWith("blob:")) URL.revokeObjectURL(media.objectUrl);
      const info: MediaInfo = {
        name: file.name,
        kind,
        mimeType: file.type || `application/${ext}`,
        size: file.size,
        duration,
        objectUrl,
      };
      setMedia(info);
      setTitle(file.name.replace(/\.[^.]+$/, ""));
      onMediaReady(file, info);

      setStage("Transcribing with Deepgram…");
      const response = await transcribeWithDeepgram(file, language, setStage);
      setStage("Creating time-synced captions…");
      const words = deepgramWordsToTokens(response);
      if (!words.length) throw new Error("Deepgram returned no timed words. Check that the media contains clear speech.");
      const captions = segmentWords(words);
      if (!captions.length) throw new Error("Speech was found, but captions could not be created.");
      replaceCaptions(captions);
      setStage("Captions ready");
      window.setTimeout(() => setStage(""), 1400);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not process this media file.");
      setStage("");
    } finally {
      setBusy(false);
    }
  }

  async function importSubtitle(file?: File) {
    if (!file) return;
    const parsed = parseSubtitleFile(await file.text());
    if (!parsed.length) {
      setError("No valid SRT/VTT captions were found in this file.");
      return;
    }
    replaceCaptions(parsed);
    setError("");
  }

  return (
    <div className="subtitle-workspace">
      <button className="auto-subtitle-card" onClick={() => !busy && mediaInput.current?.click()} disabled={busy}>
        <span className="auto-spark">✦</span>
        <b>{busy ? stage || "Processing…" : "Auto subtitles"}</b>
        <small>{busy ? "Keep this tab open while CaptionX Pro works." : "Automatically generate subtitles for your video"}</small>
      </button>

      <div className="subtitle-actions-grid">
        <button onClick={() => subtitleInput.current?.click()}>
          <span>⇧</span><b>Upload SRT / VTT</b><small>Use a subtitle file</small>
        </button>
        <button onClick={() => createCaptionAt(0)}>
          <span>＋</span><b>Start from scratch</b><small>Type out your subtitles</small>
        </button>
        <button onClick={() => window.dispatchEvent(new CustomEvent("captionxpro:open-dub"))}>
          <span>文</span><b>Dub video</b><small>Generate a voice track from caption text</small>
        </button>
      </div>

      <div
        className={`media-drop ${dragging ? "dragging" : ""}`}
        onClick={() => !busy && mediaInput.current?.click()}
        onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          void importMedia(event.dataTransfer.files[0]);
        }}
      >
        <span>＋</span>
        <div>
          <b>{media ? "Replace media" : "Drop audio or video here"}</b>
          <small>{media ? media.name : "MP4, MOV, WebM, MP3, WAV, M4A and more"}</small>
        </div>
      </div>

      {error && <div className="panel-error"><b>Couldn’t process media</b><span>{error}</span></div>}

      <input ref={mediaInput} hidden type="file" accept="audio/*,video/mp4,video/quicktime,video/webm,.m4a,.aac,.flac,.ogg" onChange={(event) => void importMedia(event.target.files?.[0])} />
      <input ref={subtitleInput} hidden type="file" accept=".srt,.vtt,text/vtt,application/x-subrip" onChange={(event) => void importSubtitle(event.target.files?.[0])} />
    </div>
  );
}

function readDuration(url: string, kind: "audio" | "video") {
  return new Promise<number>((resolve, reject) => {
    const element = document.createElement(kind);
    element.preload = "metadata";
    element.onloadedmetadata = () => {
      const duration = element.duration;
      element.removeAttribute("src");
      element.load();
      if (Number.isFinite(duration) && duration > 0) resolve(duration);
      else reject(new Error("Could not read the media duration."));
    };
    element.onerror = () => reject(new Error("The browser could not open this media file."));
    element.src = url;
  });
}

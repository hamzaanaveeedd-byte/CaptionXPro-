"use client";

import { useRef, useState } from "react";
import { transcribeWithDeepgram } from "@/lib/deepgram";
import { deepgramWordsToTokens, segmentWords } from "@/lib/captions";
import { useEditorStore } from "@/store/editor-store";

const allowed = ["mp3", "wav", "m4a", "aac", "mp4", "mov", "webm", "ogg", "flac"];

export function UploadPanel({ onFileReady }: { onFileReady: (file: File) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const media = useEditorStore((s) => s.media);
  const language = useEditorStore((s) => s.language);
  const setMedia = useEditorStore((s) => s.setMedia);
  const setTitle = useEditorStore((s) => s.setTitle);
  const replaceCaptions = useEditorStore((s) => s.replaceCaptions);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState("");
  const [error, setError] = useState("");

  async function handleFile(file?: File) {
    if (!file || busy) return;
    setError("");
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    if (!allowed.includes(ext)) {
      setError("Unsupported file. Use MP3, WAV, M4A, AAC, MP4, MOV, WebM, OGG or FLAC.");
      return;
    }
    if (file.size <= 0) {
      setError("This file is empty.");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    try {
      setBusy(true);
      setStage("Reading media…");
      const kind = file.type.startsWith("video/") || ["mp4", "mov", "webm"].includes(ext) ? "video" : "audio";
      const duration = await readDuration(objectUrl, kind);
      if (media?.objectUrl?.startsWith("blob:")) URL.revokeObjectURL(media.objectUrl);
      setMedia({ name: file.name, kind, mimeType: file.type || `application/${ext}`, size: file.size, duration, objectUrl });
      setTitle(file.name.replace(/\.[^.]+$/, ""));
      onFileReady(file);

      const response = await transcribeWithDeepgram(file, language, setStage);
      setStage("Creating smart captions…");
      const words = deepgramWordsToTokens(response);
      if (!words.length) throw new Error("Deepgram returned no timed words. Check that the media contains clear speech.");
      const captions = segmentWords(words);
      if (!captions.length) throw new Error("Speech was detected but captions could not be created.");
      replaceCaptions(captions);
      setStage("Editor ready");
      window.setTimeout(() => setStage(""), 1200);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Transcription failed.");
      setStage("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="upload-box-wrap">
      <div
        className={`upload-box ${dragging ? "dragging" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); void handleFile(e.dataTransfer.files[0]); }}
        onClick={() => !busy && inputRef.current?.click()}
      >
        <input ref={inputRef} type="file" hidden accept="audio/*,video/mp4,video/quicktime,video/webm,.m4a,.aac,.flac,.ogg" onChange={(e) => void handleFile(e.target.files?.[0])} />
        <div className="upload-icon">＋</div>
        <div><strong>{busy ? stage || "Working…" : "Drop audio or video here"}</strong><span>{busy ? "Do not close this tab." : "or click to choose a file"}</span></div>
      </div>
      {error && <div className="error-banner"><b>Couldn’t process media</b><span>{error}</span></div>}
    </div>
  );
}

function readDuration(url: string, kind: "audio" | "video") {
  return new Promise<number>((resolve, reject) => {
    const el = document.createElement(kind);
    el.preload = "metadata";
    el.onloadedmetadata = () => {
      const duration = el.duration;
      el.src = "";
      if (Number.isFinite(duration) && duration > 0) resolve(duration);
      else reject(new Error("Could not read media duration."));
    };
    el.onerror = () => reject(new Error("The browser could not open this media file."));
    el.src = url;
  });
}

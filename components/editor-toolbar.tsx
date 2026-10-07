"use client";

import { useRef } from "react";
import { downloadText } from "@/lib/download";
import { exportSrt, exportVtt, parseSubtitleFile } from "@/lib/captions";
import { useEditorStore } from "@/store/editor-store";
import { BrandLogo } from "@/components/brand-logo";

export function EditorToolbar({ onTogglePlay }: { onTogglePlay: () => void }) {
  const title = useEditorStore((s) => s.title);
  const setTitle = useEditorStore((s) => s.setTitle);
  const language = useEditorStore((s) => s.language);
  const setLanguage = useEditorStore((s) => s.setLanguage);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const validate = useEditorStore((s) => s.validate);
  const replaceCaptions = useEditorStore((s) => s.replaceCaptions);
  const input = useRef<HTMLInputElement>(null);

  const base = (title || "captionx-project").replace(/[^a-z0-9-_]+/gi, "-").replace(/^-|-$/g, "") || "captionx-project";

  function exportFile(format: "srt" | "vtt" | "txt" | "json") {
    validate();
    const state = useEditorStore.getState();
    if (!state.captions.length) return;
    if (format === "srt") downloadText(`${base}.srt`, exportSrt(state.captions), "application/x-subrip;charset=utf-8");
    if (format === "vtt") downloadText(`${base}.vtt`, exportVtt(state.captions), "text/vtt;charset=utf-8");
    if (format === "txt") downloadText(`${base}.txt`, state.captions.map((c) => c.text.trim()).join("\n"));
    if (format === "json") downloadText(`${base}.json`, JSON.stringify({ title: state.title, captions: state.captions, style: state.style }, null, 2), "application/json;charset=utf-8");
  }

  async function importSubtitles(file?: File) {
    if (!file) return;
    const text = await file.text();
    const parsed = parseSubtitleFile(text);
    if (!parsed.length) return window.alert("No valid subtitles were found in that file.");
    replaceCaptions(parsed);
  }

  return (
    <header className="editor-toolbar">
      <div className="toolbar-brand">
        <BrandLogo compact />
        <input value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Project title" />
      </div>
      <div className="toolbar-center">
        <button title="Undo" onClick={undo}>↶</button>
        <button title="Redo" onClick={redo}>↷</button>
        <button title="Play / Pause (Space)" onClick={onTogglePlay}>▶ / Ⅱ</button>
        <select value={language} onChange={(e) => setLanguage(e.target.value as typeof language)} title="Transcription language">
          <option value="auto">Auto detect</option>
          <option value="en">English</option>
          <option value="ur">Urdu</option>
          <option value="ar">Arabic</option>
          <option value="multi">Hinglish / multilingual</option>
        </select>
      </div>
      <div className="toolbar-actions">
        <input ref={input} type="file" hidden accept=".srt,.vtt,text/vtt,application/x-subrip" onChange={(e) => void importSubtitles(e.target.files?.[0])} />
        <button onClick={() => input.current?.click()}>Import SRT/VTT</button>
        <div className="export-menu">
          <button className="button button-sm">Export ▾</button>
          <div className="export-popover"><button onClick={() => exportFile("srt")}>SRT subtitles</button><button onClick={() => exportFile("vtt")}>WebVTT</button><button onClick={() => exportFile("txt")}>TXT transcript</button><button onClick={() => exportFile("json")}>JSON project</button></div>
        </div>
      </div>
    </header>
  );
}

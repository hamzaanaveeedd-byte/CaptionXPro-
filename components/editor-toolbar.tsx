"use client";

import { useRef, useState } from "react";
import { CaptionXProLogo } from "@/components/captionxpro-logo";
import { exportSrt, exportVtt, parseSubtitleFile } from "@/lib/captions";
import { TRANSCRIPTION_LANGUAGES } from "@/lib/deepgram";
import { downloadText } from "@/lib/download";
import { useEditorStore } from "@/store/editor-store";

export function EditorToolbar({ onRender }: { onRender: () => Promise<void> }) {
  const title = useEditorStore((state) => state.title);
  const setTitle = useEditorStore((state) => state.setTitle);
  const language = useEditorStore((state) => state.language);
  const setLanguage = useEditorStore((state) => state.setLanguage);
  const replaceCaptions = useEditorStore((state) => state.replaceCaptions);
  const validate = useEditorStore((state) => state.validate);
  const resetProject = useEditorStore((state) => state.resetProject);
  const subtitleInput = useRef<HTMLInputElement>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [rendering, setRendering] = useState(false);

  const basename = safeName(title);
  function exportFile(format: "srt" | "vtt" | "txt" | "json") {
    validate();
    const state = useEditorStore.getState();
    if (!state.captions.length && format !== "json") return;
    if (format === "srt") downloadText(`${basename}.srt`, exportSrt(state.captions), "application/x-subrip;charset=utf-8");
    if (format === "vtt") downloadText(`${basename}.vtt`, exportVtt(state.captions), "text/vtt;charset=utf-8");
    if (format === "txt") downloadText(`${basename}.txt`, state.captions.map((caption) => caption.text.trim()).join("\n"));
    if (format === "json") downloadText(`${basename}.json`, JSON.stringify({ version: "2.5", title: state.title, captions: state.captions, style: state.style, canvas: state.canvas }, null, 2), "application/json;charset=utf-8");
    setExportOpen(false);
  }

  async function importSubtitles(file?: File) {
    if (!file) return;
    const parsed = parseSubtitleFile(await file.text());
    if (!parsed.length) return window.alert("No valid subtitles were found in that file.");
    replaceCaptions(parsed);
  }

  async function shareProject() {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: "CaptionX Pro", text: title, url }).catch(() => undefined);
      return;
    }
    await navigator.clipboard.writeText(url);
    window.alert("Project URL copied to clipboard.");
  }

  return <header className="top-toolbar">
    <div className="toolbar-left">
      <a href="/" className="logo-link"><CaptionXProLogo compact /></a>
      <span className="toolbar-divider" />
      <input className="project-title-input" value={title} onChange={(event) => setTitle(event.target.value)} aria-label="Project name" />
    </div>
    <div className="toolbar-middle"><span>Saved locally</span><select value={language} onChange={(event) => setLanguage(event.target.value as typeof language)}>{TRANSCRIPTION_LANGUAGES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
    <div className="toolbar-right">
      <button className="top-ghost" onClick={() => void shareProject()}>Share</button>
      <button className="top-ghost" onClick={() => subtitleInput.current?.click()}>Import</button>
      <div className="export-wrap"><button className="export-project" onClick={() => setExportOpen((value) => !value)}>Export Project ⇧</button>{exportOpen && <div className="export-menu"><button onClick={() => exportFile("srt")}>SRT subtitles</button><button onClick={() => exportFile("vtt")}>WebVTT</button><button onClick={() => exportFile("txt")}>TXT transcript</button><button onClick={() => exportFile("json")}>JSON project</button><button disabled={rendering} onClick={async () => { setRendering(true); try { await onRender(); } finally { setRendering(false); setExportOpen(false); } }}>{rendering ? "Rendering…" : "Rendered WebM"}</button></div>}</div>
      <button className="avatar-button">H</button>
      <button className="top-more" title="New project" onClick={() => { if (window.confirm("Start a new project?")) resetProject(); }}>⋮</button>
    </div>
    <input ref={subtitleInput} hidden type="file" accept=".srt,.vtt" onChange={(event) => void importSubtitles(event.target.files?.[0])} />
  </header>;
}

function safeName(value: string) { return value.replace(/[^a-z0-9-_]+/gi, "-").replace(/^-|-$/g, "") || "captionxpro-project"; }

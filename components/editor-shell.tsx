"use client";

import { useEffect, useRef, useState } from "react";
import { CaptionPanel } from "@/components/caption-panel";
import { EditorToolbar } from "@/components/editor-toolbar";
import { MediaPlayer, type MediaPlayerHandle } from "@/components/media-player";
import { StylePanel } from "@/components/style-panel";
import { Timeline } from "@/components/timeline";
import { UploadPanel } from "@/components/upload-panel";
import { useEditorStore } from "@/store/editor-store";

export function EditorShell() {
  const media = useEditorStore((s) => s.media);
  const captions = useEditorStore((s) => s.captions);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const player = useRef<MediaPlayerHandle>(null);
  const [peaks, setPeaks] = useState<number[]>([]);
  const [sideTab, setSideTab] = useState<"captions" | "style">("captions");

  function seek(time: number) {
    player.current?.seek(time);
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;
      if (!typing && e.code === "Space") { e.preventDefault(); player.current?.toggle(); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo(); else undo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [redo, undo]);

  async function onFileReady(file: File) {
    setPeaks([]);
    try {
      const data = await file.arrayBuffer();
      const context = new AudioContext();
      const audio = await context.decodeAudioData(data.slice(0));
      const channel = audio.getChannelData(0);
      const count = 240;
      const block = Math.max(1, Math.floor(channel.length / count));
      const next: number[] = [];
      for (let i = 0; i < count; i += 1) {
        let max = 0;
        const start = i * block;
        for (let j = 0; j < block && start + j < channel.length; j += 1) max = Math.max(max, Math.abs(channel[start + j]));
        next.push(max);
      }
      const norm = Math.max(...next, 0.01);
      setPeaks(next.map((p) => p / norm));
      await context.close();
    } catch {
      // Some browsers cannot decode the audio track from every video container.
      setPeaks([]);
    }
  }

  return (
    <main className="editor-page">
      <EditorToolbar onTogglePlay={() => player.current?.toggle()} />
      <div className="editor-workspace">
        <div className={`left-workspace ${media ? "has-media" : ""}`}>
          <UploadPanel onFileReady={onFileReady} />
          <div className="preview-wrap"><MediaPlayer ref={player} /></div>
        </div>
        <div className="right-workspace">
          <div className="side-tabs"><button className={sideTab === "captions" ? "active" : ""} onClick={() => setSideTab("captions")}>Captions</button><button className={sideTab === "style" ? "active" : ""} onClick={() => setSideTab("style")}>Style</button></div>
          {sideTab === "captions" ? <CaptionPanel onSeek={seek} /> : <StylePanel />}
        </div>
      </div>
      <Timeline peaks={peaks} onSeek={seek} />
      <div className="editor-status"><span>{media ? `${media.kind.toUpperCase()} · ${formatBytes(media.size)}` : "No media loaded"}</span><span>{captions.length ? `${captions.length} captions · autosaved locally` : "Ready"}</span></div>
    </main>
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

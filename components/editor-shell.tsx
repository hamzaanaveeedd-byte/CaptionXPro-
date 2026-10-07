"use client";

import { useEffect, useRef, useState } from "react";
import { CaptionPanel } from "@/components/caption-panel";
import { CropPanel } from "@/components/crop-panel";
import { DubPanel } from "@/components/dub-panel";
import { EditorToolbar } from "@/components/editor-toolbar";
import { MediaPlayer, type MediaPlayerHandle } from "@/components/media-player";
import { ProjectPanel } from "@/components/project-panel";
import { StylePanel } from "@/components/style-panel";
import { SubtitleWorkspace } from "@/components/subtitle-workspace";
import { Timeline } from "@/components/timeline";
import { downloadBlob } from "@/lib/download";
import { useEditorStore } from "@/store/editor-store";
import type { MediaInfo } from "@/types/editor";

export function EditorShell() {
  const media = useEditorStore((state) => state.media);
  const captions = useEditorStore((state) => state.captions);
  const currentTime = useEditorStore((state) => state.currentTime);
  const selectedCaptionId = useEditorStore((state) => state.selectedCaptionId);
  const splitCaptionAt = useEditorStore((state) => state.splitCaptionAt);
  const undo = useEditorStore((state) => state.undo);
  const redo = useEditorStore((state) => state.redo);
  const canvas = useEditorStore((state) => state.canvas);
  const setCanvas = useEditorStore((state) => state.setCanvas);
  const player = useRef<MediaPlayerHandle>(null);
  const [leftTab, setLeftTab] = useState<"subtitles" | "captions">("subtitles");
  const [rightTab, setRightTab] = useState<"edit" | "crop" | "style" | "dub">("edit");
  const [playbackRate, setPlaybackRate] = useState(1);
  const [peaks, setPeaks] = useState<number[]>([]);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);

  useEffect(() => {
    const openDub = () => setRightTab("dub");
    window.addEventListener("captionxpro:open-dub", openDub);
    return () => window.removeEventListener("captionxpro:open-dub", openDub);
  }, []);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;
      if (!typing && event.code === "Space") { event.preventDefault(); player.current?.toggle(); }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") { event.preventDefault(); event.shiftKey ? redo() : undo(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [redo, undo]);

  function seek(time: number) { player.current?.seek(time); }

  async function onMediaReady(file: File, info: MediaInfo) {
    setPeaks([]); setThumbnails([]);
    void generateWaveform(file).then(setPeaks).catch(() => setPeaks([]));
    if (info.kind === "video") void generateThumbnails(info.objectUrl, info.duration, 18).then(setThumbnails).catch(() => setThumbnails([]));
  }

  function cycleSpeed() {
    const rates = [0.5, 0.75, 1, 1.25, 1.5, 2];
    const index = rates.indexOf(playbackRate);
    const next = rates[(index + 1) % rates.length];
    setPlaybackRate(next);
    player.current?.setRate(next);
  }

  function splitAtPlayhead() {
    const state = useEditorStore.getState();
    const caption = state.captions.find((item) => state.currentTime >= item.start && state.currentTime <= item.end) ?? state.captions.find((item) => item.id === selectedCaptionId);
    if (!caption) return;
    let cursor = Math.floor(caption.text.length / 2);
    if (caption.words.length) {
      const before = caption.words.filter((word) => word.end <= state.currentTime);
      if (before.length && before.length < caption.words.length) cursor = before.map((word) => word.punctuated).join(" ").length;
    } else if (caption.end > caption.start) {
      const ratio = Math.max(0.05, Math.min(0.95, (state.currentTime - caption.start) / (caption.end - caption.start)));
      cursor = Math.max(1, Math.min(caption.text.length - 1, Math.round(caption.text.length * ratio)));
    }
    splitCaptionAt(caption.id, cursor);
  }

  async function renderProject() {
    const state = useEditorStore.getState();
    if (!state.media || state.media.kind !== "video") { window.alert("Rendered WebM export currently requires a video file."); return; }
    const source = document.createElement("video");
    source.src = state.media.objectUrl;
    source.playsInline = true;
    source.crossOrigin = "anonymous";
    source.muted = false;
    await new Promise<void>((resolve, reject) => { source.onloadedmetadata = () => resolve(); source.onerror = () => reject(new Error("Could not prepare video for rendering.")); source.load(); });
    const dimensions = outputDimensions(state.canvas.aspectRatio, source.videoWidth || 1080, source.videoHeight || 1920);
    const renderCanvas = document.createElement("canvas");
    renderCanvas.width = dimensions.width;
    renderCanvas.height = dimensions.height;
    const context = renderCanvas.getContext("2d");
    if (!context) throw new Error("Canvas rendering is not available.");
    const canvasStream = renderCanvas.captureStream(30);
    const capture = (source as HTMLVideoElement & { captureStream?: () => MediaStream }).captureStream?.();
    const outputStream = new MediaStream([...canvasStream.getVideoTracks(), ...(capture?.getAudioTracks() ?? [])]);
    const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus") ? "video/webm;codecs=vp9,opus" : "video/webm";
    const recorder = new MediaRecorder(outputStream, { mimeType: mime });
    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
    const finished = new Promise<Blob>((resolve) => { recorder.onstop = () => resolve(new Blob(chunks, { type: mime })); });
    recorder.start(1000);
    source.currentTime = 0;
    await source.play();
    await new Promise<void>((resolve) => {
      const draw = () => {
        drawFrame(context, renderCanvas, source, state);
        if (source.ended) resolve(); else requestAnimationFrame(draw);
      };
      draw();
    });
    recorder.stop();
    const blob = await finished;
    downloadBlob(`${state.title.replace(/[^a-z0-9-_]+/gi, "-") || "captionxpro"}.webm`, blob);
  }

  return <main className="captionxpro-app">
    <EditorToolbar onRender={renderProject} />
    <div className={`editor-main ${leftCollapsed ? "left-collapsed" : ""} ${rightCollapsed ? "right-collapsed" : ""}`}>
      <aside className="left-sidebar">
        <div className="sidebar-heading"><div className="panel-tabs"><button className={leftTab === "subtitles" ? "active" : ""} onClick={() => setLeftTab("subtitles")}>SUBTITLES</button><button className={leftTab === "captions" ? "active" : ""} onClick={() => setLeftTab("captions")}>CAPTIONS</button></div><button className="collapse-button" onClick={() => setLeftCollapsed(true)}>‹</button></div>
        {leftTab === "subtitles" ? <SubtitleWorkspace onMediaReady={onMediaReady} /> : <CaptionPanel onSeek={seek} />}
      </aside>
      {leftCollapsed && <button className="reopen-panel left" onClick={() => setLeftCollapsed(false)}>›</button>}

      <section className="center-workspace">
        <div className="canvas-topbar"><div><button onClick={() => setCanvas({ fitMode: canvas.fitMode === "fit" ? "fill" : "fit" })}>{canvas.fitMode === "fit" ? "Fit" : "Fill"}⌄</button><button title="Snap to grid" className={canvas.snapToGrid ? "on" : ""} onClick={() => setCanvas({ snapToGrid: !canvas.snapToGrid })}>⌗</button></div><span>{media ? `${media.kind.toUpperCase()} · ${Math.round(media.duration)}s` : "No media"}</span></div>
        <div className="canvas-stage"><MediaPlayer ref={player} /></div>
      </section>

      <aside className="right-sidebar">
        <div className="right-tabs"><button className={rightTab === "edit" ? "active" : ""} onClick={() => setRightTab("edit")}>Edit</button><button className={rightTab === "crop" ? "active" : ""} onClick={() => setRightTab("crop")}>Crop</button><button className={rightTab === "style" ? "active" : ""} onClick={() => setRightTab("style")}>Style</button><button className={rightTab === "dub" ? "active" : ""} onClick={() => setRightTab("dub")}>Dub</button><button className="collapse-button" onClick={() => setRightCollapsed(true)}>›</button></div>
        {rightTab === "edit" ? <ProjectPanel /> : rightTab === "crop" ? <CropPanel /> : rightTab === "style" ? <StylePanel /> : <DubPanel />}
      </aside>
      {rightCollapsed && <button className="reopen-panel right" onClick={() => setRightCollapsed(false)}>‹</button>}
    </div>

    <div className="transport-bar"><button className="play-button" onClick={() => player.current?.toggle()}>▶</button><button onClick={cycleSpeed}>{playbackRate.toFixed(playbackRate === 1 ? 1 : 2)}x⌄</button><button onClick={splitAtPlayhead}>✂ Split</button><button onClick={undo}>↶ Undo</button><button onClick={redo}>↷ Redo</button><span className="transport-time">{currentTime.toFixed(3)}s</span><span className="transport-spacer" /><span>{captions.length} captions</span></div>
    <Timeline peaks={peaks} thumbnails={thumbnails} onSeek={seek} />
  </main>;
}

async function generateWaveform(file: File) {
  const data = await file.arrayBuffer();
  const AudioContextClass = window.AudioContext;
  const context = new AudioContextClass();
  try {
    const audio = await context.decodeAudioData(data.slice(0));
    const channel = audio.getChannelData(0);
    const count = 360;
    const block = Math.max(1, Math.floor(channel.length / count));
    const result: number[] = [];
    for (let index = 0; index < count; index += 1) {
      let max = 0;
      const start = index * block;
      for (let offset = 0; offset < block && start + offset < channel.length; offset += 1) max = Math.max(max, Math.abs(channel[start + offset]));
      result.push(max);
    }
    const normalizer = Math.max(...result, 0.01);
    return result.map((value) => value / normalizer);
  } finally { await context.close(); }
}

async function generateThumbnails(url: string, duration: number, count: number) {
  const video = document.createElement("video");
  video.src = url; video.muted = true; video.playsInline = true; video.preload = "auto";
  await new Promise<void>((resolve, reject) => { video.onloadeddata = () => resolve(); video.onerror = () => reject(new Error("Could not create thumbnails.")); video.load(); });
  const canvas = document.createElement("canvas"); canvas.width = 160; canvas.height = 90;
  const context = canvas.getContext("2d"); if (!context) return [];
  const result: string[] = [];
  for (let index = 0; index < count; index += 1) {
    video.currentTime = Math.min(duration - 0.05, (index / Math.max(1, count - 1)) * duration);
    await new Promise<void>((resolve) => { video.onseeked = () => resolve(); });
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    result.push(canvas.toDataURL("image/jpeg", 0.72));
  }
  video.removeAttribute("src"); video.load();
  return result;
}

function outputDimensions(ratio: string, sourceWidth: number, sourceHeight: number) {
  if (ratio === "9:16") return { width: 720, height: 1280 };
  if (ratio === "16:9") return { width: 1280, height: 720 };
  if (ratio === "1:1") return { width: 1080, height: 1080 };
  if (ratio === "4:5") return { width: 1080, height: 1350 };
  const scale = Math.min(1, 1280 / Math.max(sourceWidth, sourceHeight));
  return { width: Math.max(2, Math.round(sourceWidth * scale)), height: Math.max(2, Math.round(sourceHeight * scale)) };
}

function drawFrame(context: CanvasRenderingContext2D, canvas: HTMLCanvasElement, video: HTMLVideoElement, state: ReturnType<typeof useEditorStore.getState>) {
  context.fillStyle = state.canvas.backgroundColor;
  context.fillRect(0, 0, canvas.width, canvas.height);
  const scale = state.canvas.videoScale;
  const fit = state.canvas.speakerFocus || state.canvas.fitMode === "fill";
  const sourceRatio = video.videoWidth / video.videoHeight;
  const targetRatio = canvas.width / canvas.height;
  let width = canvas.width; let height = canvas.height;
  if (fit ? sourceRatio > targetRatio : sourceRatio < targetRatio) { height = canvas.height; width = height * sourceRatio; } else { width = canvas.width; height = width / sourceRatio; }
  width *= scale; height *= scale;
  const x = (canvas.width - width) / 2 + state.canvas.videoX * (canvas.width / 900);
  const y = (canvas.height - height) / 2 + state.canvas.videoY * (canvas.height / 900);
  context.drawImage(video, x, y, width, height);
  const active = state.captions.find((caption) => video.currentTime >= caption.start && video.currentTime <= caption.end);
  if (!active) return;
  const text = state.style.uppercase ? active.text.toUpperCase() : active.text;
  const fontSize = Math.max(18, state.style.fontSize * (canvas.width / 900));
  context.font = `${state.style.italic ? "italic " : ""}${state.style.fontWeight} ${fontSize}px Inter, Arial, sans-serif`;
  context.textAlign = state.style.textAlign;
  context.textBaseline = "middle";
  const maxWidth = canvas.width * state.style.maxWidth / 100;
  const lines = wrapText(context, text, maxWidth);
  const lineHeight = fontSize * 1.18;
  const boxWidth = Math.min(maxWidth, Math.max(...lines.map((line) => context.measureText(line).width), 0) + fontSize * 0.8);
  const boxHeight = lines.length * lineHeight + fontSize * 0.45;
  const centerX = canvas.width / 2;
  const centerY = canvas.height * state.style.positionY / 100;
  context.fillStyle = hexToRgba(state.style.backgroundColor, state.style.backgroundOpacity);
  context.fillRect(centerX - boxWidth / 2, centerY - boxHeight / 2, boxWidth, boxHeight);
  context.fillStyle = state.style.textColor;
  if (state.style.stroke) { context.strokeStyle = "rgba(0,0,0,.9)"; context.lineWidth = Math.max(2, fontSize * 0.06); }
  lines.forEach((line, index) => {
    const lineY = centerY - ((lines.length - 1) * lineHeight) / 2 + index * lineHeight;
    const lineX = state.style.textAlign === "left" ? centerX - boxWidth / 2 + fontSize * 0.35 : state.style.textAlign === "right" ? centerX + boxWidth / 2 - fontSize * 0.35 : centerX;
    if (state.style.stroke) context.strokeText(line, lineX, lineY, maxWidth);
    context.fillText(line, lineX, lineY, maxWidth);
  });
}

function wrapText(context: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.split(/\s+/); const lines: string[] = []; let line = "";
  for (const word of words) { const candidate = line ? `${line} ${word}` : word; if (context.measureText(candidate).width > maxWidth && line) { lines.push(line); line = word; } else line = candidate; }
  if (line) lines.push(line); return lines.slice(0, 3);
}
function hexToRgba(hex: string, alpha: number) { const clean = hex.replace("#", ""); const value = parseInt(clean.length === 3 ? clean.split("").map((v) => v + v).join("") : clean, 16); return `rgba(${value >> 16 & 255},${value >> 8 & 255},${value & 255},${alpha})`; }

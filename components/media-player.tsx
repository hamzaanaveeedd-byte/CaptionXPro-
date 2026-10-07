"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { useEditorStore } from "@/store/editor-store";

export type MediaPlayerHandle = {
  seek: (time: number) => void;
  toggle: () => void;
  setRate: (rate: number) => void;
  getElement: () => HTMLMediaElement | null;
};

export const MediaPlayer = forwardRef<MediaPlayerHandle>(function MediaPlayer(_, ref) {
  const media = useEditorStore((state) => state.media);
  const captions = useEditorStore((state) => state.captions);
  const style = useEditorStore((state) => state.style);
  const canvas = useEditorStore((state) => state.canvas);
  const setCanvas = useEditorStore((state) => state.setCanvas);
  const currentTime = useEditorStore((state) => state.currentTime);
  const setCurrentTime = useEditorStore((state) => state.setCurrentTime);
  const setActive = useEditorStore((state) => state.setActiveCaption);
  const elementRef = useRef<HTMLMediaElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const dragRef = useRef<{ x: number; y: number; startX: number; startY: number } | null>(null);
  const [playing, setPlaying] = useState(false);

  const stopAnimation = () => {
    if (animationRef.current !== null) cancelAnimationFrame(animationRef.current);
    animationRef.current = null;
  };

  const sync = () => {
    const element = elementRef.current;
    if (!element) return;
    const time = element.currentTime;
    setCurrentTime(time);
    setActive(captions.find((caption) => time >= caption.start && time <= caption.end)?.id ?? null);
    if (!element.paused && !element.ended) animationRef.current = requestAnimationFrame(sync);
  };

  useEffect(() => () => stopAnimation(), []);
  useImperativeHandle(ref, () => ({
    seek(time) { const element = elementRef.current; if (element) { element.currentTime = Math.max(0, Math.min(time, element.duration || time)); sync(); } },
    toggle() { const element = elementRef.current; if (element) element.paused ? void element.play() : element.pause(); },
    setRate(rate) { if (elementRef.current) elementRef.current.playbackRate = rate; },
    getElement() { return elementRef.current; },
  }));

  if (!media) return <div className="preview-empty"><div className="preview-orb">▶</div><h2>Upload media to begin</h2><p>Your CaptionX Pro canvas will appear here.</p></div>;

  const active = captions.find((caption) => currentTime >= caption.start && currentTime <= caption.end);
  const text = active ? (style.uppercase ? active.text.toUpperCase() : active.text) : "";
  const ratio = canvas.aspectRatio === "original" ? undefined : canvas.aspectRatio.replace(":", " / ");
  const objectFit = canvas.speakerFocus || canvas.fitMode === "fill" ? "cover" : "contain";

  const startDrag = (event: React.PointerEvent) => {
    if (media.kind !== "video") return;
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    dragRef.current = { x: event.clientX, y: event.clientY, startX: canvas.videoX, startY: canvas.videoY };
  };
  const drag = (event: React.PointerEvent) => {
    if (!dragRef.current) return;
    let x = dragRef.current.startX + event.clientX - dragRef.current.x;
    let y = dragRef.current.startY + event.clientY - dragRef.current.y;
    if (canvas.snapToGrid) { x = Math.round(x / 10) * 10; y = Math.round(y / 10) * 10; }
    setCanvas({ videoX: x, videoY: y });
  };
  const endDrag = () => { dragRef.current = null; };

  return <div className="canvas-outer">
    <div className={`project-canvas safe-${canvas.safeZone}`} style={{ aspectRatio: ratio, backgroundColor: canvas.backgroundColor, padding: `${canvas.padding}%` }}>
      {canvas.blur && media.kind === "video" && <video className="canvas-blur-bg" src={media.objectUrl} muted playsInline />}
      <div className="media-transform-layer" onPointerDown={startDrag} onPointerMove={drag} onPointerUp={endDrag} onPointerCancel={endDrag}>
        {media.kind === "video" ? <video ref={(node) => { elementRef.current = node; }} src={media.objectUrl} playsInline className="media-video" style={{ transform: `translate(${canvas.videoX}px, ${canvas.videoY}px) scale(${canvas.videoScale})`, objectFit }} onPlay={() => { setPlaying(true); stopAnimation(); animationRef.current = requestAnimationFrame(sync); }} onPause={() => { setPlaying(false); stopAnimation(); sync(); }} onEnded={() => { setPlaying(false); stopAnimation(); sync(); }} onSeeked={sync} /> : <audio ref={(node) => { elementRef.current = node; }} src={media.objectUrl} className="media-audio" onPlay={() => { setPlaying(true); stopAnimation(); animationRef.current = requestAnimationFrame(sync); }} onPause={() => { setPlaying(false); stopAnimation(); sync(); }} onSeeked={sync} />}
      </div>
      {media.kind === "audio" && <div className="audio-visual"><div className="audio-disc">CX</div><div><strong>{media.name}</strong><span>{playing ? "Playing" : "Ready"}</span></div></div>}
      {canvas.safeZone !== "none" && <SafeZoneOverlay zone={canvas.safeZone} />}
      {canvas.snapToGrid && <div className="grid-overlay" />}
      {text && <div className="caption-overlay" dir={/[\u0600-\u06FF]/.test(text) ? "rtl" : "auto"} style={{ top: `${style.positionY}%`, maxWidth: `${style.maxWidth}%`, fontFamily: style.fontFamily, fontSize: style.fontSize, fontWeight: style.fontWeight, color: style.textColor, backgroundColor: rgba(style.backgroundColor, style.backgroundOpacity), textAlign: style.textAlign, fontStyle: style.italic ? "italic" : "normal", textShadow: style.shadow ? "0 3px 18px rgba(0,0,0,.95)" : "none", WebkitTextStroke: style.stroke ? "1px rgba(0,0,0,.8)" : undefined }}>{text}</div>}
    </div>
  </div>;
});

function SafeZoneOverlay({ zone }: { zone: string }) {
  return <div className={`safe-zone-overlay ${zone}`}><span>{zone.toUpperCase()} SAFE ZONE</span><i className="safe-top" /><i className="safe-bottom" /><i className="safe-left" /><i className="safe-right" /></div>;
}

function rgba(hex: string, alpha: number) {
  const clean = hex.replace("#", "");
  const numeric = parseInt(clean.length === 3 ? clean.split("").map((item) => item + item).join("") : clean, 16);
  if (!Number.isFinite(numeric)) return `rgba(0,0,0,${alpha})`;
  return `rgba(${(numeric >> 16) & 255},${(numeric >> 8) & 255},${numeric & 255},${alpha})`;
}

"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { useEditorStore } from "@/store/editor-store";

export type MediaPlayerHandle = {
  seek: (time: number) => void;
  toggle: () => void;
};

export const MediaPlayer = forwardRef<MediaPlayerHandle>(function MediaPlayer(_, ref) {
  const media = useEditorStore((s) => s.media);
  const captions = useEditorStore((s) => s.captions);
  const style = useEditorStore((s) => s.style);
  const currentTime = useEditorStore((s) => s.currentTime);
  const setCurrentTime = useEditorStore((s) => s.setCurrentTime);
  const setActiveCaption = useEditorStore((s) => s.setActiveCaption);
  const mediaElement = useRef<HTMLMediaElement | null>(null);
  const raf = useRef<number | null>(null);
  const [playing, setPlaying] = useState(false);

  const sync = () => {
    const el = mediaElement.current;
    if (!el) return;
    const time = el.currentTime;
    setCurrentTime(time);
    const active = captions.find((c) => time >= c.start && time <= c.end) ?? null;
    setActiveCaption(active?.id ?? null);
    if (!el.paused && !el.ended) raf.current = requestAnimationFrame(sync);
  };

  const stopSync = () => {
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = null;
  };

  useEffect(() => () => stopSync(), []);

  useEffect(() => {
    const active = captions.find((c) => currentTime >= c.start && currentTime <= c.end) ?? null;
    setActiveCaption(active?.id ?? null);
  }, [captions, currentTime, setActiveCaption]);

  useImperativeHandle(ref, () => ({
    seek(time) {
      if (!mediaElement.current) return;
      mediaElement.current.currentTime = Math.max(0, Math.min(time, mediaElement.current.duration || time));
      setCurrentTime(mediaElement.current.currentTime);
    },
    toggle() {
      const el = mediaElement.current;
      if (!el) return;
      if (el.paused) void el.play();
      else el.pause();
    },
  }));

  if (!media) {
    return <div className="preview-empty"><div className="preview-orb">▶</div><h2>Upload media to begin</h2><p>Your video or audio preview will appear here.</p></div>;
  }

  const activeCaption = captions.find((c) => currentTime >= c.start && currentTime <= c.end);
  const captionText = activeCaption ? (style.uppercase ? activeCaption.text.toUpperCase() : activeCaption.text) : "";

  const onPlay = () => { setPlaying(true); stopSync(); raf.current = requestAnimationFrame(sync); };
  const onPause = () => { setPlaying(false); stopSync(); sync(); };
  const onEnded = () => { setPlaying(false); stopSync(); sync(); };

  return (
    <div className={`preview-stage ${media.kind}`}>
      {media.kind === "video" ? (
        <video ref={(node) => { mediaElement.current = node; }} src={media.objectUrl} controls className="media-video" onPlay={onPlay} onPause={onPause} onEnded={onEnded} onSeeked={sync} />
      ) : (
        <audio ref={(node) => { mediaElement.current = node; }} src={media.objectUrl} controls className="media-audio" onPlay={onPlay} onPause={onPause} onEnded={onEnded} onSeeked={sync} />
      )}
      {media.kind === "audio" && <div className="audio-visual"><div className="audio-disc">M</div><div><strong>{media.name}</strong><span>{playing ? "Playing" : "Ready"}</span></div></div>}
      {captionText && (
        <div
          className="caption-overlay"
          dir={/[\u0600-\u06FF]/.test(captionText) ? "rtl" : "auto"}
          style={{
            top: `${style.positionY}%`,
            maxWidth: `${style.maxWidth}%`,
            fontSize: `${style.fontSize}px`,
            fontWeight: style.fontWeight,
            color: style.textColor,
            backgroundColor: hexToRgba(style.backgroundColor, style.backgroundOpacity),
            textAlign: style.textAlign,
            fontStyle: style.italic ? "italic" : "normal",
            textShadow: style.shadow ? "0 2px 12px rgba(0,0,0,.85)" : "none",
          }}
        >
          {captionText}
        </div>
      )}
    </div>
  );
});

function hexToRgba(hex: string, alpha: number) {
  const clean = hex.replace("#", "");
  const value = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const n = Number.parseInt(value, 16);
  if (!Number.isFinite(n)) return `rgba(0,0,0,${alpha})`;
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

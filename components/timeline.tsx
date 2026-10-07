"use client";

import { useMemo, useRef, useState } from "react";
import { formatClock } from "@/lib/time";
import { useEditorStore } from "@/store/editor-store";
import type { Caption } from "@/types/editor";

const TRACK_LEFT = 56;

type DragState = {
  id: string;
  mode: "move" | "start" | "end";
  pointerStart: number;
  originalStart: number;
  originalEnd: number;
  previewStart: number;
  previewEnd: number;
};

export function Timeline({ peaks, onSeek }: { peaks: number[]; onSeek: (time: number) => void }) {
  const media = useEditorStore((s) => s.media);
  const captions = useEditorStore((s) => s.captions);
  const currentTime = useEditorStore((s) => s.currentTime);
  const selected = useEditorStore((s) => s.selectedCaptionId);
  const select = useEditorStore((s) => s.selectCaption);
  const zoom = useEditorStore((s) => s.zoom);
  const setZoom = useEditorStore((s) => s.setZoom);
  const updateTiming = useEditorStore((s) => s.updateCaptionTiming);
  const createCaptionAt = useEditorStore((s) => s.createCaptionAt);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const duration = Math.max(media?.duration ?? 0, ...captions.map((c) => c.end), 10);
  const timelineWidth = Math.max(900, duration * zoom + TRACK_LEFT + 40);

  const ticks = useMemo(() => {
    const step = zoom >= 80 ? 1 : zoom >= 45 ? 2 : zoom >= 30 ? 5 : 10;
    const result = [];
    for (let t = 0; t <= duration; t += step) result.push(t);
    return result;
  }, [duration, zoom]);

  function timeFromClientX(clientX: number) {
    const node = scrollRef.current;
    if (!node) return 0;
    const rect = node.getBoundingClientRect();
    return Math.max(0, Math.min(duration, (clientX - rect.left + node.scrollLeft - TRACK_LEFT) / zoom));
  }

  function clickTimeline(e: React.MouseEvent) {
    if ((e.target as HTMLElement).closest(".caption-block")) return;
    const time = timeFromClientX(e.clientX);
    onSeek(time);
    if (e.detail === 2) createCaptionAt(time);
  }

  function startDrag(e: React.PointerEvent, caption: Caption, mode: DragState["mode"]) {
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    select(caption.id);
    setDrag({ id: caption.id, mode, pointerStart: e.clientX, originalStart: caption.start, originalEnd: caption.end, previewStart: caption.start, previewEnd: caption.end });
  }

  function moveDrag(e: React.PointerEvent) {
    if (!drag) return;
    const delta = (e.clientX - drag.pointerStart) / zoom;
    const length = drag.originalEnd - drag.originalStart;
    let start = drag.originalStart;
    let end = drag.originalEnd;
    if (drag.mode === "move") {
      start = Math.max(0, Math.min(duration - length, drag.originalStart + delta));
      end = start + length;
    } else if (drag.mode === "start") {
      start = Math.max(0, Math.min(drag.originalEnd - 0.08, drag.originalStart + delta));
    } else {
      end = Math.min(duration, Math.max(drag.originalStart + 0.08, drag.originalEnd + delta));
    }
    setDrag({ ...drag, previewStart: start, previewEnd: end });
  }

  function endDrag() {
    if (!drag) return;
    updateTiming(drag.id, drag.previewStart, drag.previewEnd);
    setDrag(null);
  }

  return (
    <section className="timeline-shell">
      <div className="timeline-toolbar"><div><strong>Timeline</strong><span>{formatClock(currentTime, false)}</span></div><div className="zoom-control"><span>−</span><input type="range" min="20" max="120" value={zoom} onChange={(e) => setZoom(Number(e.target.value))} /><span>＋</span></div></div>
      <div className="timeline-scroll" ref={scrollRef} onClick={clickTimeline}>
        <div className="timeline-canvas" style={{ width: timelineWidth }} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag}>
          <div className="ruler-row">
            {ticks.map((tick) => <div key={tick} className="tick" style={{ left: TRACK_LEFT + tick * zoom }}><span>{formatTick(tick)}</span></div>)}
          </div>
          <div className="track-label waveform-label">Media</div>
          <div className="waveform-track" style={{ left: TRACK_LEFT, width: duration * zoom }}>
            {(peaks.length ? peaks : new Array(Math.min(180, Math.max(60, Math.floor(duration * 2)))).fill(0.25)).map((peak, i, arr) => <i key={i} style={{ height: `${Math.max(8, peak * 52)}px`, left: `${(i / arr.length) * 100}%` }} />)}
          </div>
          <div className="track-label caption-label">CC</div>
          <div className="caption-track" style={{ left: TRACK_LEFT, width: duration * zoom }}>
            {captions.map((caption) => {
              const d = drag?.id === caption.id ? drag : null;
              const start = d?.previewStart ?? caption.start;
              const end = d?.previewEnd ?? caption.end;
              return (
                <div key={caption.id} className={`caption-block ${selected === caption.id ? "selected" : ""}`} style={{ left: start * zoom, width: Math.max(10, (end - start) * zoom) }} onPointerDown={(e) => startDrag(e, caption, "move")} onDoubleClick={(e) => { e.stopPropagation(); onSeek(caption.start); }}>
                  <span className="resize-handle left" onPointerDown={(e) => startDrag(e, caption, "start")} />
                  <b>{caption.text}</b>
                  <span className="resize-handle right" onPointerDown={(e) => startDrag(e, caption, "end")} />
                </div>
              );
            })}
          </div>
          <div className="playhead" style={{ left: TRACK_LEFT + currentTime * zoom }}><span /></div>
        </div>
      </div>
    </section>
  );
}

function formatTick(seconds: number) {
  if (seconds < 60) return `${seconds.toFixed(0)}s`;
  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60);
  return `${min}:${String(sec).padStart(2, "0")}`;
}

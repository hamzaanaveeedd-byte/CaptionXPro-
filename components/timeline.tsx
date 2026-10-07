"use client";

import { useMemo, useRef, useState } from "react";
import { formatClock } from "@/lib/time";
import { useEditorStore } from "@/store/editor-store";
import type { Caption } from "@/types/editor";

const LEFT = 52;
type DragState = { id: string; mode: "move" | "start" | "end"; clientX: number; start: number; end: number; previewStart: number; previewEnd: number };

export function Timeline({ peaks, thumbnails, onSeek }: { peaks: number[]; thumbnails: string[]; onSeek: (time: number) => void }) {
  const media = useEditorStore((state) => state.media);
  const captions = useEditorStore((state) => state.captions);
  const currentTime = useEditorStore((state) => state.currentTime);
  const selected = useEditorStore((state) => state.selectedCaptionId);
  const select = useEditorStore((state) => state.selectCaption);
  const zoom = useEditorStore((state) => state.zoom);
  const setZoom = useEditorStore((state) => state.setZoom);
  const updateTiming = useEditorStore((state) => state.updateCaptionTiming);
  const createCaption = useEditorStore((state) => state.createCaptionAt);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);

  const duration = Math.max(media?.duration ?? 0, ...captions.map((caption) => caption.end), 10);
  const width = Math.max(1100, duration * zoom + LEFT + 80);
  const ticks = useMemo(() => {
    const step = zoom >= 95 ? 1 : zoom >= 52 ? 2 : 5;
    const result: number[] = [];
    for (let time = 0; time <= duration; time += step) result.push(time);
    return result;
  }, [duration, zoom]);

  function pointerToTime(clientX: number) {
    const node = scrollRef.current;
    if (!node) return 0;
    const rect = node.getBoundingClientRect();
    return Math.max(0, Math.min(duration, (clientX - rect.left + node.scrollLeft - LEFT) / zoom));
  }

  function startDrag(event: React.PointerEvent, caption: Caption, mode: DragState["mode"]) {
    event.stopPropagation();
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    select(caption.id);
    setDragState({ id: caption.id, mode, clientX: event.clientX, start: caption.start, end: caption.end, previewStart: caption.start, previewEnd: caption.end });
  }

  function moveDrag(event: React.PointerEvent) {
    if (!dragState) return;
    const delta = (event.clientX - dragState.clientX) / zoom;
    const length = dragState.end - dragState.start;
    let start = dragState.start;
    let end = dragState.end;
    if (dragState.mode === "move") {
      start = Math.max(0, Math.min(duration - length, dragState.start + delta));
      end = start + length;
    } else if (dragState.mode === "start") {
      start = Math.max(0, Math.min(dragState.end - 0.08, dragState.start + delta));
    } else {
      end = Math.min(duration, Math.max(dragState.start + 0.08, dragState.end + delta));
    }
    setDragState({ ...dragState, previewStart: start, previewEnd: end });
  }

  function endDrag() {
    if (!dragState) return;
    updateTiming(dragState.id, dragState.previewStart, dragState.previewEnd);
    setDragState(null);
  }

  const fitZoom = () => {
    const node = scrollRef.current;
    const usable = Math.max(500, (node?.clientWidth ?? 1100) - LEFT - 40);
    setZoom(usable / duration);
  };

  return (
    <section className="pro-timeline">
      <div className="timeline-head">
        <div><b>Timeline</b><span>{formatClock(currentTime)}</span></div>
        <div className="timeline-zoom"><button onClick={() => setZoom(zoom - 10)}>−</button><input type="range" min="22" max="160" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} /><button onClick={() => setZoom(zoom + 10)}>＋</button><button className="fit-button" onClick={fitZoom}>Fit to Screen</button></div>
      </div>
      <div
        className="timeline-scroll"
        ref={scrollRef}
        onClick={(event) => {
          if ((event.target as HTMLElement).closest(".caption-block")) return;
          const time = pointerToTime(event.clientX);
          onSeek(time);
          if (event.detail === 2) createCaption(time);
        }}
      >
        <div className="timeline-canvas" style={{ width }} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag}>
          <div className="ruler-row">{ticks.map((time) => <div className="tick" key={time} style={{ left: LEFT + time * zoom }}><span>{time < 60 ? `${time}s` : `${Math.floor(time / 60)}:${String(Math.floor(time % 60)).padStart(2, "0")}`}</span></div>)}</div>
          <div className="track-label video-label">1</div>
          <div className="video-track" style={{ left: LEFT, width: duration * zoom }}>
            {media && <div className="video-clip">
              {thumbnails.length ? <div className="thumbnail-strip">{thumbnails.map((thumbnail, index) => <img key={`${thumbnail.slice(-18)}-${index}`} src={thumbnail} alt="" />)}</div> : <div className="clip-placeholder">{media.kind === "video" ? "VIDEO" : "AUDIO"}</div>}
              <span className="clip-name">{media.name}</span>
            </div>}
          </div>
          <div className="waveform-track" style={{ left: LEFT, width: duration * zoom }}>
            {(peaks.length ? peaks : new Array(220).fill(0.24)).map((peak, index, array) => <i key={index} style={{ height: `${Math.max(4, peak * 42)}px`, left: `${(index / array.length) * 100}%` }} />)}
          </div>
          <div className="track-label caption-label">CC</div>
          <div className="caption-track" style={{ left: LEFT, width: duration * zoom }}>
            {captions.map((caption) => {
              const currentDrag = dragState?.id === caption.id ? dragState : null;
              const start = currentDrag?.previewStart ?? caption.start;
              const end = currentDrag?.previewEnd ?? caption.end;
              return <div key={caption.id} className={`caption-block ${selected === caption.id ? "selected" : ""}`} style={{ left: start * zoom, width: Math.max(12, (end - start) * zoom) }} onPointerDown={(event) => startDrag(event, caption, "move")}><span className="resize-handle left" onPointerDown={(event) => startDrag(event, caption, "start")} /><b>{caption.text}</b><span className="resize-handle right" onPointerDown={(event) => startDrag(event, caption, "end")} /></div>;
            })}
          </div>
          <div className="playhead" style={{ left: LEFT + currentTime * zoom }}><span /></div>
        </div>
      </div>
    </section>
  );
}

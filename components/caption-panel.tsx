"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formatClock, parseTime } from "@/lib/time";
import { useEditorStore } from "@/store/editor-store";

export function CaptionPanel({ onSeek }: { onSeek: (time: number) => void }) {
  const captions = useEditorStore((state) => state.captions);
  const selected = useEditorStore((state) => state.selectedCaptionId);
  const active = useEditorStore((state) => state.activeCaptionId);
  const select = useEditorStore((state) => state.selectCaption);
  const updateText = useEditorStore((state) => state.updateCaptionText);
  const updateTiming = useEditorStore((state) => state.updateCaptionTiming);
  const remove = useEditorStore((state) => state.deleteCaption);
  const duplicate = useEditorStore((state) => state.duplicateCaption);
  const merge = useEditorStore((state) => state.mergeWithNext);
  const split = useEditorStore((state) => state.splitCaptionAt);
  const [query, setQuery] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return term ? captions.filter((caption) => caption.text.toLowerCase().includes(term)) : captions;
  }, [captions, query]);

  useEffect(() => {
    if (!active || query) return;
    const element = listRef.current?.querySelector(`[data-caption-id="${active}"]`);
    element?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [active, query]);

  if (!captions.length) {
    return <div className="caption-empty"><b>No captions yet</b><span>Generate auto subtitles, upload SRT/VTT, or start from scratch.</span></div>;
  }

  return (
    <div className="caption-panel">
      <div className="caption-panel-head">
        <div><b>Captions</b><span>{captions.length} segments</span></div>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search captions…" />
      </div>
      <div className="caption-list" ref={listRef}>
        {filtered.map((caption, index) => (
          <article
            key={caption.id}
            data-caption-id={caption.id}
            className={`caption-card ${selected === caption.id ? "selected" : ""} ${active === caption.id ? "active" : ""}`}
            onClick={() => { select(caption.id); onSeek(caption.start); }}
          >
            <div className="caption-meta">
              <span className="caption-number">{index + 1}</span>
              <TimeInput value={caption.start} onCommit={(value) => updateTiming(caption.id, value, caption.end)} />
              <span>→</span>
              <TimeInput value={caption.end} onCommit={(value) => updateTiming(caption.id, caption.start, value)} />
            </div>
            <textarea
              value={caption.text}
              onClick={(event) => event.stopPropagation()}
              onChange={(event) => updateText(caption.id, event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== "Enter" || event.shiftKey) return;
                event.preventDefault();
                const target = event.currentTarget;
                const nextId = split(caption.id, target.selectionStart ?? 0);
                if (nextId) requestAnimationFrame(() => document.querySelector<HTMLTextAreaElement>(`[data-caption-id="${nextId}"] textarea`)?.focus());
              }}
            />
            <div className="caption-card-actions" onClick={(event) => event.stopPropagation()}>
              <button onClick={() => split(caption.id, Math.floor(caption.text.length / 2))}>Split</button>
              <button onClick={() => merge(caption.id)}>Merge next</button>
              <button onClick={() => duplicate(caption.id)}>Duplicate</button>
              <button className="danger" onClick={() => remove(caption.id)}>Delete</button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function TimeInput({ value, onCommit }: { value: number; onCommit: (value: number) => void }) {
  const [draft, setDraft] = useState(formatClock(value));
  useEffect(() => setDraft(formatClock(value)), [value]);
  return (
    <input
      className="caption-time-input"
      value={draft}
      onClick={(event) => event.stopPropagation()}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => {
        const parsed = parseTime(draft);
        if (parsed !== null) onCommit(parsed);
        else setDraft(formatClock(value));
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
      }}
    />
  );
}

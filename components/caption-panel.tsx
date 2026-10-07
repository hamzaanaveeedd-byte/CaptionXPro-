"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formatClock, parseClock } from "@/lib/time";
import { useEditorStore } from "@/store/editor-store";

export function CaptionPanel({ onSeek }: { onSeek: (time: number) => void }) {
  const captions = useEditorStore((s) => s.captions);
  const selected = useEditorStore((s) => s.selectedCaptionId);
  const active = useEditorStore((s) => s.activeCaptionId);
  const select = useEditorStore((s) => s.selectCaption);
  const updateText = useEditorStore((s) => s.updateCaptionText);
  const updateTiming = useEditorStore((s) => s.updateCaptionTiming);
  const split = useEditorStore((s) => s.splitCaptionAt);
  const merge = useEditorStore((s) => s.mergeWithNext);
  const remove = useEditorStore((s) => s.deleteCaption);
  const duplicate = useEditorStore((s) => s.duplicateCaption);
  const listRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return captions;
    const needle = query.trim().toLocaleLowerCase();
    return captions.filter((c) => c.text.toLocaleLowerCase().includes(needle));
  }, [captions, query]);

  useEffect(() => {
    if (!active || query) return;
    listRef.current?.querySelector(`[data-caption-id="${active}"]`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [active, query]);

  return (
    <section className="caption-panel">
      <div className="panel-header"><div><h2>Captions</h2><span>{captions.length} segments</span></div><input className="search-input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search transcript" /></div>
      <div className="caption-list" ref={listRef}>
        {!captions.length && <div className="panel-empty"><b>No captions yet</b><span>Upload media or import an SRT/VTT file.</span></div>}
        {filtered.map((caption) => (
          <article key={caption.id} data-caption-id={caption.id} className={`caption-card ${selected === caption.id ? "selected" : ""} ${active === caption.id ? "active" : ""}`} onClick={() => { select(caption.id); onSeek(caption.start); }}>
            <div className="caption-meta"><span className="caption-index">{captions.findIndex((c) => c.id === caption.id) + 1}</span><TimeField value={caption.start} onCommit={(value) => updateTiming(caption.id, value, caption.end)} /><span>→</span><TimeField value={caption.end} onCommit={(value) => updateTiming(caption.id, caption.start, value)} /></div>
            <textarea
              value={caption.text}
              dir={/[\u0600-\u06FF]/.test(caption.text) ? "rtl" : "auto"}
              onClick={(e) => e.stopPropagation()}
              onFocus={() => select(caption.id)}
              onChange={(e) => updateText(caption.id, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  const cursor = e.currentTarget.selectionStart;
                  const newId = split(caption.id, cursor);
                  if (newId) window.setTimeout(() => document.querySelector<HTMLTextAreaElement>(`[data-caption-id="${newId}"] textarea`)?.focus(), 0);
                }
              }}
              aria-label={`Caption ${caption.id}`}
            />
            <div className="caption-actions"><button onClick={(e) => { e.stopPropagation(); const area = e.currentTarget.closest("article")?.querySelector("textarea") as HTMLTextAreaElement | null; split(caption.id, area?.selectionStart ?? Math.floor(caption.text.length / 2)); }}>Split</button><button onClick={(e) => { e.stopPropagation(); merge(caption.id); }}>Merge next</button><button onClick={(e) => { e.stopPropagation(); duplicate(caption.id); }}>Duplicate</button><button className="danger" onClick={(e) => { e.stopPropagation(); remove(caption.id); }}>Delete</button></div>
          </article>
        ))}
      </div>
    </section>
  );
}

function TimeField({ value, onCommit }: { value: number; onCommit: (value: number) => void }) {
  const [text, setText] = useState(formatClock(value));
  useEffect(() => setText(formatClock(value)), [value]);
  return <input className="time-field" value={text} onClick={(e) => e.stopPropagation()} onChange={(e) => setText(e.target.value)} onBlur={() => { const parsed = parseClock(text); if (Number.isFinite(parsed)) onCommit(parsed); else setText(formatClock(value)); }} onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }} />;
}

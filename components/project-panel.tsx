"use client";

import { formatClock, parseTime } from "@/lib/time";
import { useEditorStore } from "@/store/editor-store";
import type { AspectRatio, SafeZone } from "@/types/editor";
import { useEffect, useState } from "react";

const ratios: Array<[AspectRatio, string]> = [
  ["original", "Original"], ["9:16", "9:16"], ["16:9", "16:9"], ["1:1", "1:1"], ["4:5", "4:5"],
];
const zones: Array<[SafeZone, string]> = [
  ["none", "None"], ["all", "All"], ["tiktok", "TikTok"], ["youtube", "YouTube"], ["instagram", "Instagram"], ["linkedin", "LinkedIn"], ["x", "X"],
];
const swatches = ["#111214", "#ffffff", "#22e6a8", "#facc15", "#14b8a6", "#38bdf8", "#8b5cf6"];

export function ProjectPanel() {
  const canvas = useEditorStore((state) => state.canvas);
  const setCanvas = useEditorStore((state) => state.setCanvas);
  const media = useEditorStore((state) => state.media);
  const captions = useEditorStore((state) => state.captions);
  const selectedId = useEditorStore((state) => state.selectedCaptionId);
  const updateTiming = useEditorStore((state) => state.updateCaptionTiming);
  const versions = useEditorStore((state) => state.versions);
  const saveVersion = useEditorStore((state) => state.saveVersion);
  const restoreVersion = useEditorStore((state) => state.restoreVersion);
  const selected = captions.find((caption) => caption.id === selectedId) ?? null;

  return (
    <div className="project-panel">
      <section className="inspector-section">
        <h3>Edit</h3>
        <div className="project-card-grid">
          <button className="project-card"><span>▣</span><b>Resize Project</b><small>Change aspect ratio</small></button>
          <button className={`project-card ${canvas.speakerFocus ? "on" : ""}`} onClick={() => setCanvas({ speakerFocus: !canvas.speakerFocus, fitMode: canvas.speakerFocus ? canvas.fitMode : "fill" })}><span>◎</span><b>Speaker Focus</b><small>Keep speaker prominent</small></button>
        </div>
        <div className="ratio-grid">{ratios.map(([value, label]) => <button key={value} className={canvas.aspectRatio === value ? "on" : ""} onClick={() => setCanvas({ aspectRatio: value })}>{label}</button>)}</div>
      </section>

      <section className="inspector-section">
        <div className="setting-line"><b>Snap to Grid</b><button className={`switch ${canvas.snapToGrid ? "on" : ""}`} onClick={() => setCanvas({ snapToGrid: !canvas.snapToGrid })}>{canvas.snapToGrid ? "On" : "Off"}</button></div>
      </section>

      <section className="inspector-section">
        <h3>Background</h3>
        <div className="bg-control"><input type="color" value={canvas.backgroundColor} onChange={(event) => setCanvas({ backgroundColor: event.target.value })} /><input value={canvas.backgroundColor} onChange={(event) => setCanvas({ backgroundColor: event.target.value })} /></div>
        <div className="swatches">{swatches.map((color) => <button key={color} aria-label={color} style={{ background: color }} onClick={() => setCanvas({ backgroundColor: color })} />)}</div>
        <div className="setting-line"><b>Canvas Blur</b><button className={`switch ${canvas.blur ? "on" : ""}`} onClick={() => setCanvas({ blur: !canvas.blur })}>{canvas.blur ? "On" : "Off"}</button></div>
      </section>

      <section className="inspector-section">
        <h3>Safe Zones</h3>
        <div className="safe-grid">{zones.map(([value, label]) => <button key={value} className={canvas.safeZone === value ? "on" : ""} onClick={() => setCanvas({ safeZone: value })}>{label}</button>)}</div>
      </section>

      <section className="inspector-section">
        <h3>Expand Padding</h3>
        <div className="padding-presets">{[0, 4, 8, 12, 18].map((value) => <button key={value} className={canvas.padding === value ? "on" : ""} onClick={() => setCanvas({ padding: value })}><span className={`padding-icon p${value}`} />{value}%</button>)}</div>
        <label className="range-label"><span>Padding<b>{canvas.padding}%</b></span><input type="range" min="0" max="24" value={canvas.padding} onChange={(event) => setCanvas({ padding: Number(event.target.value) })} /></label>
      </section>

      <section className="inspector-section">
        <h3>Timing</h3>
        <div className="timing-summary"><span>Project Duration</span><b>{media ? formatClock(media.duration, false) : "00:00:00"}</b></div>
        {selected ? <SelectedTiming start={selected.start} end={selected.end} onCommit={(start, end) => updateTiming(selected.id, start, end)} /> : <p className="inspector-note">Select a caption on the timeline or caption list to adjust its start and end times.</p>}
      </section>

      <section className="inspector-section">
        <h3>Versions</h3>
        <button className="wide-action" onClick={saveVersion}>Save current version</button>
        <div className="version-list">{versions.length ? versions.map((version) => <button key={version.id} onClick={() => restoreVersion(version.id)}><b>{new Date(version.updatedAt).toLocaleString([], { hour: "2-digit", minute: "2-digit", month: "short", day: "numeric" })}</b><span>{version.captions.length} captions</span></button>) : <span className="version-empty">No saved versions yet.</span>}</div>
      </section>
    </div>
  );
}

function SelectedTiming({ start, end, onCommit }: { start: number; end: number; onCommit: (start: number, end: number) => void }) {
  const [startText, setStartText] = useState(formatClock(start));
  const [endText, setEndText] = useState(formatClock(end));
  useEffect(() => { setStartText(formatClock(start)); setEndText(formatClock(end)); }, [start, end]);
  const commit = () => {
    const nextStart = parseTime(startText);
    const nextEnd = parseTime(endText);
    if (nextStart !== null && nextEnd !== null && nextEnd > nextStart) onCommit(nextStart, nextEnd);
    else { setStartText(formatClock(start)); setEndText(formatClock(end)); }
  };
  return <div className="selected-timing"><label>Start<input value={startText} onChange={(event) => setStartText(event.target.value)} onBlur={commit} /></label><label>End<input value={endText} onChange={(event) => setEndText(event.target.value)} onBlur={commit} /></label></div>;
}

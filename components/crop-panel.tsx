"use client";

import { useEditorStore } from "@/store/editor-store";

export function CropPanel() {
  const canvas = useEditorStore((state) => state.canvas);
  const setCanvas = useEditorStore((state) => state.setCanvas);
  return (
    <div className="crop-panel">
      <section className="inspector-section">
        <h3>Fit / Crop</h3>
        <div className="segmented"><button className={canvas.fitMode === "fit" ? "on" : ""} onClick={() => setCanvas({ fitMode: "fit", speakerFocus: false })}>Fit</button><button className={canvas.fitMode === "fill" ? "on" : ""} onClick={() => setCanvas({ fitMode: "fill" })}>Fill</button></div>
      </section>
      <section className="inspector-section">
        <h3>Transform</h3>
        <Range label="Scale" value={Math.round(canvas.videoScale * 100)} min={50} max={220} suffix="%" onChange={(value) => setCanvas({ videoScale: value / 100 })} />
        <Range label="X" value={canvas.videoX} min={-300} max={300} suffix="px" onChange={(value) => setCanvas({ videoX: value })} />
        <Range label="Y" value={canvas.videoY} min={-300} max={300} suffix="px" onChange={(value) => setCanvas({ videoY: value })} />
        <button className="wide-action" onClick={() => setCanvas({ videoScale: 1, videoX: 0, videoY: 0 })}>Reset transform</button>
      </section>
      <section className="inspector-section crop-tip"><b>Drag directly on the canvas</b><span>Move the video inside the frame. With Snap to Grid enabled, movement locks to 10px steps.</span></section>
    </div>
  );
}

function Range({ label, value, min, max, suffix, onChange }: { label: string; value: number; min: number; max: number; suffix: string; onChange: (value: number) => void }) {
  return <label className="range-label"><span>{label}<b>{value}{suffix}</b></span><input type="range" min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} /></label>;
}

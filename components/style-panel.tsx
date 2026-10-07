"use client";

import { useEditorStore } from "@/store/editor-store";

export function StylePanel() {
  const style = useEditorStore((state) => state.style);
  const setStyle = useEditorStore((state) => state.setStyle);

  return (
    <div className="style-panel">
      <Section title="Text">
        <label>Font family
          <select value={style.fontFamily} onChange={(event) => setStyle({ fontFamily: event.target.value })}>
            <option value="Inter, ui-sans-serif, system-ui, sans-serif">Inter / System</option>
            <option value="Arial, sans-serif">Arial</option>
            <option value="Georgia, serif">Georgia</option>
            <option value="ui-monospace, SFMono-Regular, Menlo, monospace">Mono</option>
          </select>
        </label>
        <Range label="Font size" value={style.fontSize} min={18} max={84} suffix="px" onChange={(value) => setStyle({ fontSize: value })} />
        <label>Weight
          <select value={style.fontWeight} onChange={(event) => setStyle({ fontWeight: Number(event.target.value) as 400 | 600 | 700 | 800 })}>
            <option value={400}>Regular</option><option value={600}>Semi Bold</option><option value={700}>Bold</option><option value={800}>Extra Bold</option>
          </select>
        </label>
      </Section>
      <Section title="Color & background">
        <div className="dual-color">
          <label>Text<input type="color" value={style.textColor} onChange={(event) => setStyle({ textColor: event.target.value })} /></label>
          <label>Background<input type="color" value={style.backgroundColor} onChange={(event) => setStyle({ backgroundColor: event.target.value })} /></label>
        </div>
        <Range label="Background opacity" value={Math.round(style.backgroundOpacity * 100)} min={0} max={100} suffix="%" onChange={(value) => setStyle({ backgroundOpacity: value / 100 })} />
      </Section>
      <Section title="Layout">
        <Range label="Vertical position" value={style.positionY} min={10} max={94} suffix="%" onChange={(value) => setStyle({ positionY: value })} />
        <Range label="Max width" value={style.maxWidth} min={30} max={98} suffix="%" onChange={(value) => setStyle({ maxWidth: value })} />
        <div className="segmented"><button className={style.textAlign === "left" ? "on" : ""} onClick={() => setStyle({ textAlign: "left" })}>Left</button><button className={style.textAlign === "center" ? "on" : ""} onClick={() => setStyle({ textAlign: "center" })}>Center</button><button className={style.textAlign === "right" ? "on" : ""} onClick={() => setStyle({ textAlign: "right" })}>Right</button></div>
      </Section>
      <Section title="Effects">
        <div className="toggle-grid"><Toggle label="Italic" on={style.italic} click={() => setStyle({ italic: !style.italic })} /><Toggle label="Uppercase" on={style.uppercase} click={() => setStyle({ uppercase: !style.uppercase })} /><Toggle label="Shadow" on={style.shadow} click={() => setStyle({ shadow: !style.shadow })} /><Toggle label="Stroke" on={style.stroke} click={() => setStyle({ stroke: !style.stroke })} /></div>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="inspector-section"><h3>{title}</h3>{children}</section>;
}
function Range({ label, value, min, max, suffix, onChange }: { label: string; value: number; min: number; max: number; suffix: string; onChange: (value: number) => void }) {
  return <label className="range-label"><span>{label}<b>{value}{suffix}</b></span><input type="range" min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} /></label>;
}
function Toggle({ label, on, click }: { label: string; on: boolean; click: () => void }) {
  return <button className={`mini-toggle ${on ? "on" : ""}`} onClick={click}>{label}</button>;
}

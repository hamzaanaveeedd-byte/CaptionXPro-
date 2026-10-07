"use client";

import { useEditorStore } from "@/store/editor-store";

export function StylePanel() {
  const style = useEditorStore((s) => s.style);
  const setStyle = useEditorStore((s) => s.setStyle);
  return (
    <aside className="style-panel">
      <div className="panel-title"><h3>Caption style</h3><span>Preview styling</span></div>
      <label>Size <span>{style.fontSize}px</span><input type="range" min="18" max="72" value={style.fontSize} onChange={(e) => setStyle({ fontSize: Number(e.target.value) })} /></label>
      <label>Weight<select value={style.fontWeight} onChange={(e) => setStyle({ fontWeight: Number(e.target.value) as 400 | 600 | 700 | 800 })}><option value="400">Regular</option><option value="600">Semi bold</option><option value="700">Bold</option><option value="800">Extra bold</option></select></label>
      <div className="color-row"><label>Text<input type="color" value={style.textColor} onChange={(e) => setStyle({ textColor: e.target.value })} /></label><label>Background<input type="color" value={style.backgroundColor} onChange={(e) => setStyle({ backgroundColor: e.target.value })} /></label></div>
      <label>Background <span>{Math.round(style.backgroundOpacity * 100)}%</span><input type="range" min="0" max="100" value={style.backgroundOpacity * 100} onChange={(e) => setStyle({ backgroundOpacity: Number(e.target.value) / 100 })} /></label>
      <label>Vertical position <span>{style.positionY}%</span><input type="range" min="18" max="88" value={style.positionY} onChange={(e) => setStyle({ positionY: Number(e.target.value) })} /></label>
      <label>Caption width <span>{style.maxWidth}%</span><input type="range" min="45" max="96" value={style.maxWidth} onChange={(e) => setStyle({ maxWidth: Number(e.target.value) })} /></label>
      <label>Alignment<select value={style.textAlign} onChange={(e) => setStyle({ textAlign: e.target.value as "left" | "center" | "right" })}><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></label>
      <div className="toggle-row"><button className={style.italic ? "on" : ""} onClick={() => setStyle({ italic: !style.italic })}>Italic</button><button className={style.uppercase ? "on" : ""} onClick={() => setStyle({ uppercase: !style.uppercase })}>UPPERCASE</button><button className={style.shadow ? "on" : ""} onClick={() => setStyle({ shadow: !style.shadow })}>Shadow</button></div>
      <p className="style-note">SRT/VTT preserve text and timing only. Visual styling stays in this project preview/JSON.</p>
    </aside>
  );
}

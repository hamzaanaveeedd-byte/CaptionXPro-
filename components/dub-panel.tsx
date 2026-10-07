"use client";

import { useMemo, useState } from "react";
import { downloadBlob } from "@/lib/download";
import { useEditorStore } from "@/store/editor-store";

const voices = [
  ["aura-2-thalia-en", "Thalia · English"],
  ["aura-2-zeus-en", "Zeus · English"],
  ["aura-2-asteria-en", "Asteria · English"],
] as const;

export function DubPanel() {
  const captions = useEditorStore((state) => state.captions);
  const title = useEditorStore((state) => state.title);
  const transcript = useMemo(() => captions.map((caption) => caption.text.trim()).filter(Boolean).join(" "), [captions]);
  const [text, setText] = useState("");
  const [voice, setVoice] = useState<string>(voices[0][0]);
  const [speed, setSpeed] = useState(1);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const source = text || transcript;
  async function generate() {
    if (!source.trim() || busy) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/deepgram/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: source.slice(0, 3000), model: voice, speed }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Could not generate dub audio.");
      }
      const blob = await response.blob();
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      setAudioBlob(blob);
      setAudioUrl(URL.createObjectURL(blob));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Dub generation failed.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="dub-panel">
    <section className="inspector-section"><h3>Dub Video</h3><p className="inspector-note">Use your final caption text as the voice script, or paste a translated script below. This generates a separate MP3 dub track with Deepgram TTS.</p></section>
    <section className="inspector-section"><label>Voice<select value={voice} onChange={(event) => setVoice(event.target.value)}>{voices.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="range-label"><span>Voice speed<b>{speed.toFixed(1)}x</b></span><input type="range" min="0.7" max="1.5" step="0.1" value={speed} onChange={(event) => setSpeed(Number(event.target.value))} /></label></section>
    <section className="inspector-section"><div className="dub-script-head"><h3>Dub script</h3><button onClick={() => setText(transcript)}>Use captions</button></div><textarea className="dub-script" value={text || transcript} onChange={(event) => setText(event.target.value)} placeholder="Generate captions first, or paste your translated script here." /></section>
    <section className="inspector-section"><button className="primary-wide" disabled={!source.trim() || busy} onClick={() => void generate()}>{busy ? "Generating voice…" : "Generate dub preview"}</button>{error && <div className="panel-error compact"><span>{error}</span></div>}{audioUrl && <><audio controls src={audioUrl} className="dub-audio" /><button className="wide-action" onClick={() => audioBlob && downloadBlob(`${safeName(title)}-dub.mp3`, audioBlob)}>Download dub MP3</button></>}</section>
  </div>;
}

function safeName(value: string) { return value.replace(/[^a-z0-9-_]+/gi, "-").replace(/^-|-$/g, "") || "captionxpro"; }

"use client";

import { useEffect, useMemo, useState } from "react";
import { downloadBlob } from "@/lib/download";
import { useEditorStore } from "@/store/editor-store";
import type { TranscriptionLanguage } from "@/types/editor";

type TtsModel = {
  name: string;
  canonicalName: string;
  languages: string[];
  accent?: string;
  tags?: string[];
};

const FALLBACK_MODELS: TtsModel[] = [
  { name: "Thalia", canonicalName: "aura-2-thalia-en", languages: ["en", "en-US"], accent: "American" },
  { name: "Zeus", canonicalName: "aura-2-zeus-en", languages: ["en", "en-US"], accent: "American" },
  { name: "Asteria", canonicalName: "aura-2-asteria-en", languages: ["en", "en-US"], accent: "American" },
  { name: "Celeste", canonicalName: "aura-2-celeste-es", languages: ["es"], accent: "Spanish" },
  { name: "Selena", canonicalName: "aura-2-selena-es", languages: ["es"], accent: "Spanish" },
];

const LANGUAGE_LABELS: Record<string, string> = {
  en: "English",
  es: "Spanish",
  de: "German",
  fr: "French",
  nl: "Dutch",
  it: "Italian",
  ja: "Japanese",
};

export function DubPanel() {
  const captions = useEditorStore((state) => state.captions);
  const title = useEditorStore((state) => state.title);
  const transcriptionLanguage = useEditorStore((state) => state.language);
  const detectedLanguage = useEditorStore((state) => state.detectedLanguage);
  const transcript = useMemo(() => captions.map((caption) => caption.text.trim()).filter(Boolean).join(" "), [captions]);

  const [text, setText] = useState("");
  const [models, setModels] = useState<TtsModel[]>(FALLBACK_MODELS);
  const [dubLanguage, setDubLanguage] = useState("auto");
  const [voice, setVoice] = useState(FALLBACK_MODELS[0].canonicalName);
  const [speed, setSpeed] = useState(1);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadingVoices, setLoadingVoices] = useState(true);
  const [error, setError] = useState("");

  const sourceLanguage = useMemo(
    () => resolveSourceLanguage(transcriptionLanguage, detectedLanguage),
    [transcriptionLanguage, detectedLanguage],
  );
  const resolvedDubLanguage = dubLanguage === "auto" ? sourceLanguage : dubLanguage;

  const supportedLanguages = useMemo(() => {
    const values = new Set<string>();
    models.forEach((model) => model.languages.forEach((language) => values.add(baseLanguage(language))));
    return Array.from(values)
      .filter((language) => LANGUAGE_LABELS[language])
      .sort((a, b) => LANGUAGE_LABELS[a].localeCompare(LANGUAGE_LABELS[b]));
  }, [models]);

  const matchingVoices = useMemo(
    () => models.filter((model) => model.languages.some((item) => baseLanguage(item) === resolvedDubLanguage)),
    [models, resolvedDubLanguage],
  );

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/deepgram/tts-models", { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok || !Array.isArray(body.models) || !body.models.length) throw new Error("Voice catalog unavailable");
        if (!cancelled) setModels(body.models as TtsModel[]);
      })
      .catch(() => {
        if (!cancelled) setModels(FALLBACK_MODELS);
      })
      .finally(() => {
        if (!cancelled) setLoadingVoices(false);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!matchingVoices.length) return;
    if (!matchingVoices.some((item) => item.canonicalName === voice)) {
      setVoice(matchingVoices[0].canonicalName);
    }
  }, [matchingVoices, voice]);

  useEffect(() => () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
  }, [audioUrl]);

  const source = text.trim() || transcript;
  const autoLanguageUnsupported = matchingVoices.length === 0;

  async function generate() {
    if (!source.trim() || busy || autoLanguageUnsupported) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/deepgram/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: source, model: voice, speed }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Could not generate dub audio.");
      }
      const blob = await response.blob();
      if (!blob.size) throw new Error("Deepgram returned an empty dub audio file.");
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
    <section className="inspector-section">
      <h3>Auto Dubbing</h3>
      <p className="inspector-note">CaptionX Pro uses your final caption text as the dub script and automatically selects a compatible Deepgram Aura-2 voice when the language is supported.</p>
    </section>

    <section className="inspector-section">
      <label>Dub language
        <select value={dubLanguage} onChange={(event) => setDubLanguage(event.target.value)}>
          <option value="auto">Auto from transcription ({LANGUAGE_LABELS[sourceLanguage] || sourceLanguage.toUpperCase()})</option>
          {supportedLanguages.map((language) => <option key={language} value={language}>{LANGUAGE_LABELS[language]}</option>)}
        </select>
      </label>

      <label style={{ marginTop: 10 }}>Voice
        <select value={voice} disabled={loadingVoices || !matchingVoices.length} onChange={(event) => setVoice(event.target.value)}>
          {matchingVoices.map((model) => <option key={model.canonicalName} value={model.canonicalName}>{formatVoice(model)}</option>)}
          {!matchingVoices.length && <option>No compatible Deepgram voice</option>}
        </select>
      </label>

      <label className="range-label"><span>Voice speed<b>{speed.toFixed(1)}x</b></span><input type="range" min="0.7" max="1.5" step="0.1" value={speed} onChange={(event) => setSpeed(Number(event.target.value))} /></label>

      {autoLanguageUnsupported && <p className="inspector-note" style={{ marginTop: 10 }}>Deepgram Aura-2 dubbing is currently available here for English, Spanish, German, French, Dutch, Italian, and Japanese. Choose one of those languages to generate a dub track.</p>}
    </section>

    <section className="inspector-section">
      <div className="dub-script-head"><h3>Dub script</h3><button onClick={() => setText(transcript)}>Use captions</button></div>
      <textarea className="dub-script" value={text || transcript} onChange={(event) => setText(event.target.value)} placeholder="Generate captions first, or paste your dub script here." />
    </section>

    <section className="inspector-section">
      <button className="primary-wide" disabled={!source.trim() || busy || autoLanguageUnsupported || loadingVoices} onClick={() => void generate()}>{busy ? "Generating auto dub…" : "Generate auto dub"}</button>
      {error && <div className="panel-error compact"><span>{error}</span></div>}
      {audioUrl && <><audio controls src={audioUrl} className="dub-audio" /><button className="wide-action" onClick={() => audioBlob && downloadBlob(`${safeName(title)}-dub.mp3`, audioBlob)}>Download dub MP3</button></>}
    </section>
  </div>;
}

function baseLanguage(value: string) {
  return value.toLowerCase().split("-")[0];
}

function resolveSourceLanguage(language: TranscriptionLanguage, detectedLanguage: string | null) {
  if (language === "auto") return baseLanguage(detectedLanguage || "en");
  if (language === "roman-ur") return "ur";
  if (language === "hinglish") return baseLanguage(detectedLanguage || "hi");
  return baseLanguage(language);
}

function formatVoice(model: TtsModel) {
  const name = model.name ? model.name.charAt(0).toUpperCase() + model.name.slice(1) : model.canonicalName;
  return model.accent ? `${name} · ${model.accent}` : name;
}

function safeName(value: string) {
  return value.replace(/[^a-z0-9-_]+/gi, "-").replace(/^-|-$/g, "") || "captionxpro";
}

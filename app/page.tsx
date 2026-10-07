import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";

export default function Home() {
  return (
    <main className="home-shell">
      <nav className="home-nav">
        <BrandLogo />
        <div className="home-links"><a href="#features">Features</a><a href="#workflow">Workflow</a><Link className="button button-sm" href="/editor">Open Editor</Link></div>
      </nav>
      <section className="hero">
        <div className="eyebrow">AI CAPTION WORKSPACE</div>
        <h1>Turn speech into <span>editable, time-synced captions.</span></h1>
        <p>Upload audio or video, transcribe with Deepgram Nova-3, edit every caption like a professional timeline editor, and export production-ready subtitles.</p>
        <div className="hero-actions"><Link href="/editor" className="button">Start Transcribing</Link><Link href="/editor" className="button ghost">Open Caption Editor</Link></div>
        <div className="hero-proof"><span>Word-level timing</span><span>Enter-to-split</span><span>SRT / VTT / TXT / JSON</span><span>Urdu + English + Arabic</span></div>
      </section>
      <section id="features" className="feature-grid">
        <article><strong>01</strong><h3>Audio + Video</h3><p>MP3, WAV, M4A, AAC, MP4, MOV and WebM with direct Deepgram processing.</p></article>
        <article><strong>02</strong><h3>Smart Captions</h3><p>Natural phrase segmentation using punctuation, pauses, duration and real word timestamps.</p></article>
        <article><strong>03</strong><h3>CapCut-style Editing</h3><p>Caption list, player and timeline are connected to one central state with instant synchronization.</p></article>
        <article><strong>04</strong><h3>Precise Export</h3><p>Final edits, splits, merges and manual timings are reflected exactly in your subtitle export.</p></article>
      </section>
      <section id="workflow" className="workflow"><div><span>Upload</span><b>→</b><span>Transcribe</span><b>→</b><span>Edit + Sync</span><b>→</b><span>Export</span></div></section>
    </main>
  );
}

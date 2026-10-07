import Link from "next/link";
import { MarketingShell } from "@/components/marketing-shell";
import { ProductPreview } from "@/components/product-preview";
import { ContactForm } from "@/components/contact-form";

const features = [
  ["Auto Captions","Generate accurate captions from audio or video with AI-powered speech-to-text.","▤"],
  ["Timeline Editing","Edit text, timing, splits and merges with a synchronized multi-track timeline.","≋"],
  ["Deepgram Powered","Word-level timestamps keep captions aligned to the speech instead of guessing.","∿"],
  ["Subtitle Styling","Control font, size, background, padding, safe zones and placement in real time.","Aa"],
  ["SRT / VTT Export","Export subtitle files, transcripts and project JSON without losing your edits.","⇧"],
  ["Video & Audio Upload","Work with common audio and video formats directly in your browser workflow.","☁"],
] as const;

export default function HomePage() {
  return <MarketingShell>
    <main>
      <section className="hero-section section-shell">
        <div className="hero-copy">
          <div className="section-kicker">AI CAPTIONS FOR A LOUDER WORLD</div>
          <h1>Turn Speech Into <span>Stunning Captions</span> with AI</h1>
          <p>Accurate speech-to-text, powerful caption editing, and professional subtitles — all in one focused workspace.</p>
          <div className="hero-actions"><Link className="site-primary-button large" href="/editor">Get Started <span>→</span></Link><Link className="site-secondary-button large" href="/editor">▶ Try the Editor</Link></div>
          <div className="hero-trust"><span>✓ No credit card required</span><span>✓ Works in your browser</span><span>✓ Deepgram-powered transcription</span></div>
        </div>
        <div className="hero-product"><ProductPreview/></div>
      </section>

      <section className="stats-section section-shell">
        {[["99%","Transcription Accuracy","Word-level speech-to-text timing"],["10x","Faster Editing","Caption edits without leaving the timeline"],["7+","Export Formats","SRT, VTT, TXT, JSON and more"],["4","Core Languages","English, Urdu, Arabic and multilingual"]].map(([value,title,copy])=><article className="stat-card" key={title}><strong>{value}</strong><div><h3>{title}</h3><p>{copy}</p></div></article>)}
      </section>

      <section className="content-section section-shell" id="features">
        <div className="section-heading"><div><div className="section-kicker">POWERFUL FEATURES</div><h2>Everything you need for <span>better captions</span></h2></div><p>A focused set of tools for transcription, editing, styling, synchronization and export — designed as one coherent workflow.</p></div>
        <div className="feature-grid">{features.map(([title,copy,icon])=><article className="feature-card" key={title}><div className="feature-icon">{icon}</div><h3>{title}</h3><p>{copy}</p><Link href="/features">Explore <span>→</span></Link></article>)}</div>
      </section>

      <section className="content-section section-shell">
        <div className="section-heading"><div><div className="section-kicker">SIMPLE WORKFLOW</div><h2>From video to captions in <span>4 simple steps</span></h2></div><p>No disconnected tools. Upload, transcribe, edit and export inside the same project.</p></div>
        <div className="workflow-grid">{[["01","Upload","Add your audio or video and keep the original media inside the project."],["02","Transcribe","Deepgram converts speech into timed words and smart caption segments."],["03","Edit","Refine text, timing, styles, safe zones and layout with live preview."],["04","Export","Download subtitle files or continue into your final video workflow."]].map(([num,title,copy])=><article className="workflow-card" key={num}><span className="workflow-number">{num}</span><div className="workflow-line"/><h3>{title}</h3><p>{copy}</p></article>)}</div>
      </section>

      <section className="editor-showcase section-shell">
        <div className="editor-showcase-copy"><div className="section-kicker">PROFESSIONAL EDITOR</div><h2>A focused workspace built for <span>creators</span></h2><p>Keep transcription, caption text, video preview, timing and styling synchronized from one central project state.</p><ul><li>Real-time caption preview</li><li>CapCut-style split and merge workflow</li><li>Waveform and caption timeline</li><li>Aspect ratio and safe-zone controls</li><li>Local autosave and version snapshots</li></ul><Link href="/editor" className="site-secondary-button large">Open the Editor →</Link></div>
        <ProductPreview/>
      </section>

      <section className="formats-section section-shell"><div><div className="section-kicker">SUPPORTED WORKFLOW</div><h2>Export without breaking your edits</h2><p>Move from caption creation to downstream publishing with clean, predictable files.</p></div><div className="format-pills">{["MP4","MOV","WAV","MP3","SRT","VTT","TXT","JSON"].map(x=><span key={x}>{x}</span>)}</div></section>

      <section className="contact-home section-shell"><div className="contact-copy"><div className="section-kicker">LET&apos;S CREATE TOGETHER</div><h2>Have questions? <span>We&apos;re here to help.</span></h2><p>Tell us what you want CaptionX Pro to do for your workflow, content or team.</p><div className="contact-points"><span>Fast browser workflow</span><span>Creator-focused editor</span><span>Professional subtitle exports</span></div></div><ContactForm/></section>
    </main>
  </MarketingShell>;
}

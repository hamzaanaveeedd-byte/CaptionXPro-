import Link from "next/link";
import { MarketingShell } from "@/components/marketing-shell";

const groups = [
  ["Transcription",["Deepgram speech-to-text","Word-level timestamps","English, Urdu, Arabic and multilingual modes","Smart caption segmentation"]],
  ["Caption Editing",["Editable caption list","Enter-to-split at the cursor","Merge, duplicate and delete","Manual start/end timing","Search and active-caption tracking"]],
  ["Timeline",["Video track","Audio waveform","Caption blocks","Playhead and seeking","Drag and resize timing","Zoom and fit-to-screen"]],
  ["Canvas & Styling",["Aspect ratio presets","Caption font and size","Background and opacity","Padding and corner radius","Safe zones","Video position and scale"]],
  ["Project Controls",["Undo / redo","Local autosave","Saved versions","Import SRT / VTT","Project JSON export"]],
  ["Exports",["SRT","VTT","TXT transcript","JSON project","Rendered WebM workflow"]],
] as const;

export default function FeaturesPage(){return <MarketingShell><main className="inner-page"><section className="inner-hero section-shell"><div className="section-kicker">CAPTIONX PRO FEATURES</div><h1>Professional caption tools without the <span>clutter</span></h1><p>Every feature is organized around one job: getting from media to accurate, editable and reusable captions faster.</p><Link className="site-primary-button large" href="/editor">Open Editor →</Link></section><section className="feature-groups section-shell">{groups.map(([title,items],index)=><article className="feature-group" key={title}><span>0{index+1}</span><h2>{title}</h2><ul>{items.map(item=><li key={item}>{item}</li>)}</ul></article>)}</section><section className="page-cta section-shell"><h2>Ready to work on a real file?</h2><p>Open the editor and start with audio, video or an existing subtitle file.</p><Link href="/editor" className="site-primary-button large">Start Editing →</Link></section></main></MarketingShell>}

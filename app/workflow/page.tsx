import Link from "next/link";
import { MarketingShell } from "@/components/marketing-shell";

export default function WorkflowPage(){const steps=[
  ["01","Upload your media","Drop audio or video into the editor. CaptionX Pro reads the media duration and prepares the project preview."],
  ["02","Generate timed speech","Deepgram returns the transcript with word timings. CaptionX Pro turns those words into readable caption segments."],
  ["03","Refine and style","Correct text, press Enter to split at the cursor, merge segments, drag timing blocks, adjust layout and preview changes live."],
  ["04","Export with confidence","Validate the final timeline and export SRT, VTT, TXT or JSON so downstream work reflects your final edits."],
] as const;return <MarketingShell><main className="inner-page"><section className="inner-hero section-shell"><div className="section-kicker">HOW IT WORKS</div><h1>A clean workflow from <span>speech to subtitles</span></h1><p>CaptionX Pro is designed so the transcript, caption list, player and timeline stay connected instead of behaving like separate tools.</p></section><section className="workflow-page-list section-shell">{steps.map(([num,title,copy])=><article key={num}><div className="workflow-big-number">{num}</div><div><h2>{title}</h2><p>{copy}</p></div></article>)}</section><section className="page-cta section-shell"><h2>See the workflow in the real editor.</h2><Link href="/editor" className="site-primary-button large">Open CaptionX Pro →</Link></section></main></MarketingShell>}

import Link from "next/link";
import { CaptionXProLogo } from "@/components/captionxpro-logo";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="footer-brand"><CaptionXProLogo compact/><p>Turn speech into stunning, editable captions.</p></div>
        <div className="footer-links">
          <Link href="/">Home</Link><Link href="/editor">Editor</Link><Link href="/features">Features</Link><Link href="/workflow">Workflow</Link><Link href="/about">About</Link><Link href="/contact">Contact</Link>
        </div>
        <div className="footer-meta"><span>CaptionX Pro</span><span>AI caption editing in your browser</span></div>
      </div>
    </footer>
  );
}

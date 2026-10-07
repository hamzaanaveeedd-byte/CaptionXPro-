"use client";

import Link from "next/link";
import { useState } from "react";
import { CaptionXProLogo } from "@/components/captionxpro-logo";

const links = [
  ["Home", "/"],
  ["Editor", "/editor"],
  ["Features", "/features"],
  ["Workflow", "/workflow"],
  ["About", "/about"],
  ["Contact", "/contact"],
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link href="/" className="site-logo-link" aria-label="CaptionX Pro home">
          <CaptionXProLogo compact />
        </Link>
        <nav className={open ? "site-nav open" : "site-nav"} aria-label="Primary navigation">
          {links.map(([label, href]) => <Link key={href} href={href} onClick={() => setOpen(false)}>{label}</Link>)}
        </nav>
        <div className="site-header-actions">
          <Link href="/editor" className="site-link-button">Sign In</Link>
          <Link href="/editor" className="site-primary-button">Get Started <span>→</span></Link>
          <button className="mobile-menu-button" onClick={() => setOpen((v) => !v)} aria-label="Toggle navigation" aria-expanded={open}>
            <span/><span/><span/>
          </button>
        </div>
      </div>
    </header>
  );
}

import { MarketingShell } from "@/components/marketing-shell";
import { ContactForm } from "@/components/contact-form";

export default function ContactPage(){return <MarketingShell><main className="inner-page"><section className="contact-page section-shell"><div><div className="section-kicker">CONTACT</div><h1>Tell us what you want to <span>create</span></h1><p>Share your workflow, team requirements or the caption problem you want to solve.</p><div className="contact-info-card"><b>Typical use cases</b><span>Creator subtitle workflow</span><span>Urdu / English caption production</span><span>Social-safe captions</span><span>Team caption review</span></div></div><ContactForm/></section></main></MarketingShell>}

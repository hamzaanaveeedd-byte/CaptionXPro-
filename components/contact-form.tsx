"use client";
import { useState } from "react";

export function ContactForm() {
  const [sent, setSent] = useState(false);
  return <form className="contact-form" onSubmit={(event)=>{event.preventDefault();setSent(true);}}>
    <div className="contact-form-row"><label><span>Your name</span><input required placeholder="Your name"/></label><label><span>Your email</span><input required type="email" placeholder="you@example.com"/></label></div>
    <label><span>How can we help?</span><textarea required placeholder="Tell us about your caption workflow, team, or project…"/></label>
    <button className="site-primary-button contact-submit" type="submit">{sent ? "Message ready ✓" : "Send Message →"}</button>
    {sent && <p className="form-note">The form UI is ready. Connect your preferred email or CRM endpoint before production launch.</p>}
  </form>
}

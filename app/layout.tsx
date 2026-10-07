import type { Metadata } from "next";
import "./globals.css";
import "./marketing.css";

export const metadata: Metadata = {
  title: {
    default: "CaptionX Pro | AI Caption Editor",
    template: "%s | CaptionX Pro",
  },
  description: "AI speech-to-text, synchronized caption editing, subtitle styling and professional subtitle exports powered by Deepgram.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}

import type { Metadata } from "next";
import "./globals.css";
import { CAPTIONXPRO_FAVICON_FILE } from "@/lib/brand";

export const metadata: Metadata = {
  title: "CaptionX Pro | AI Caption & Video Editor",
  description: "AI speech-to-text, subtitle editing, dubbing, timeline editing and video canvas tools powered by Deepgram.",
  icons: {
    icon: CAPTIONXPRO_FAVICON_FILE,
    shortcut: CAPTIONXPRO_FAVICON_FILE,
    apple: CAPTIONXPRO_FAVICON_FILE,
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}

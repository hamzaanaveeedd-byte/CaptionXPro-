import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Captionx | AI Caption Editor",
  description: "AI speech-to-text and professional caption editor powered by Deepgram.",
  icons: {
    icon: "/captionx-favicon.png",
    shortcut: "/captionx-favicon.png",
    apple: "/captionx-favicon.png",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

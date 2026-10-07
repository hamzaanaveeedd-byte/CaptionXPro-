# CaptionX Pro V2.5 — Clean Rebuild

This is the clean rebuilt CaptionX Pro project. The codebase intentionally uses one naming convention for the brand assets:

- Logo file: `public/captionxpro-logo.png`
- Favicon file: `public/captionxpro-favicon.png`
- Logo component: `components/captionxpro-logo.tsx`
- Exported React component: `CaptionXProLogo`

There are no `BrandLogo` or `CaptionxLogo` aliases in this project.

## Environment variable

Create `.env.local` locally or add the same variable in Vercel:

```env
DEEPGRAM_API_KEY=your_deepgram_api_key
```

## Run locally

```bash
npm install
npm run dev
```

## Build check

```bash
npm run build
```

## Core features

- Audio/video import
- Deepgram Nova-3 transcription
- Word-level timestamps
- Smart caption segmentation
- CapCut-style caption list editing
- Enter-to-split at the text cursor
- Caption merge, duplicate and delete
- SRT/VTT import
- SRT/VTT/TXT/JSON export
- Browser-rendered WebM export with burned captions (Chromium-compatible path)
- Video preview canvas
- Aspect ratio resizing
- Fit/fill and manual crop/position controls
- Speaker focus layout mode
- Snap-to-grid
- Background color and canvas blur
- Social safe-zone overlays
- Expand padding
- Caption styling
- Video thumbnail timeline
- Audio waveform
- Playhead, caption blocks, drag/resize timing
- Timeline zoom and fit-to-screen
- Playback speed
- Undo/redo
- Local autosave
- Project versions
- Deepgram TTS dub preview + MP3 download

## Vercel

Upload the **contents of this project folder** to the repository root so `package.json`, `app/`, `components/`, `public/`, etc. are directly visible at the GitHub root. Do not upload this entire folder as a nested subfolder.

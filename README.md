# CaptionX Pro Website + Editor

Premium dark green/cyan marketing website plus the working CaptionX Pro caption editor.

## Routes
- `/` — Home
- `/editor` — Caption editor
- `/features` — Feature detail
- `/workflow` — Workflow
- `/about` — About
- `/contact` — Contact

## Branding
There is one canonical logo component only:
- `components/captionxpro-logo.tsx`
- React export: `CaptionXProLogo`
- Favicon: `app/icon.svg`

The main website does not depend on a PNG logo, so there is no logo filename/import mismatch.

## Required Vercel variables
- `DEEPGRAM_API_KEY` — transcription and dubbing
- `GROQ_API_KEY` — Semantic AI Smart Split

Optional:
- `GROQ_MODEL` — defaults to `openai/gpt-oss-20b`

Add the required variables in Vercel Project Settings > Environment Variables for Production and Preview, then redeploy.

## Caption splitting
The captions panel includes both **Manual Split** (cursor + Enter or Split button) and **AI Smart Split**.

AI Smart Split now uses **Groq server-side** to read and understand the **entire current transcript first**, then returns semantic caption boundaries only. CaptionX Pro maps those boundaries back onto the original timed words, so Groq never rewrites the transcript and Deepgram/manual word timings remain the timing source.

Profiles remain:
- Short — 2–3 words
- Balanced — 2–5 words
- Readable — 3–5 words

The operation remains undoable through editor history.

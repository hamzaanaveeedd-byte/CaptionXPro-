# Mirfaq Videos Edits

A production-oriented AI speech-to-text and caption editor built with Next.js, React, TypeScript, Zustand and Deepgram Nova-3.

## Core workflow

1. Upload audio or video.
2. The browser requests a short-lived Deepgram JWT from `/api/deepgram/token`.
3. The media file is sent directly from the browser to Deepgram, avoiding Vercel's normal function upload body limit.
4. Deepgram returns word-level timestamps.
5. The caption engine creates natural time-based caption segments.
6. Caption list, media preview, timeline and exports all use the same central Zustand caption state.
7. Place the cursor inside caption text and press **Enter** to split. Word timestamps determine the timing boundary whenever possible.
8. Export SRT, VTT, TXT or JSON.

## Setup

### 1. Install packages

```bash
npm install
```

### 2. Add your Deepgram key

Copy `.env.local.example` to `.env.local` and add the key:

```env
DEEPGRAM_API_KEY=your_key_here
```

The key is only used server-side to mint a temporary JWT. It is never bundled into the frontend.

> Deepgram `/auth/grant` requires a key with sufficient permission (Deepgram documents Member permission for this endpoint).

### 3. Run locally

```bash
npm run dev
```

Open `http://localhost:3000/editor`.

## Vercel deployment

1. Push the project to GitHub.
2. Import the repository in Vercel.
3. Add `DEEPGRAM_API_KEY` in **Project Settings → Environment Variables**.
4. Deploy.

No always-on Express server is required.

## Supported media

The UI accepts MP3, WAV, M4A, AAC, FLAC, OGG, MP4, MOV and WebM. Deepgram supports common containerized media including MP3, MP4, AAC, WAV, M4A and WebM. Browser playback support can vary by operating system/codecs, especially MOV.

## Editor controls

- **Space** — play/pause when you are not typing.
- **Enter inside a caption** — split at cursor.
- **Shift+Enter** — newline inside the caption text.
- **Ctrl/Cmd+Z** — undo.
- **Ctrl/Cmd+Shift+Z** — redo.
- Click a caption — seek to it.
- Drag timeline caption block — move timing.
- Drag left/right edge — resize timing.
- Double-click empty timeline — create a caption at that time.
- Import SRT/VTT — edit existing subtitles in the same central state.

## Notes

- Autosave stores captions/project settings locally in the browser. The original uploaded media file itself is not persisted across a full browser restart; reselect the media if needed.
- SRT/VTT do not preserve advanced visual styles. JSON export includes style/project metadata.
- Temporary Deepgram tokens are deliberately short-lived. The permanent Deepgram API key remains server-side.

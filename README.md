# CaptionX Pro 2.5

Browser-based AI caption and video workspace built on Next.js + Deepgram.

## Included in 2.5
- Audio/video upload and Deepgram Nova-3 transcription
- Word-timestamp smart caption segmentation
- CapCut-style editable captions with Enter-to-split, merge, duplicate and timing edits
- Video/audio timeline, waveform, playhead, draggable/resizable caption blocks
- SRT/VTT import, manual captions, SRT/VTT/TXT/JSON export
- Resize presets: Original, 9:16, 16:9, 1:1, 4:5
- Speaker-focus canvas mode, snap grid, background color, blur backdrop
- TikTok/YouTube/Instagram/LinkedIn/X safe-zone overlays
- Canvas padding and video scaling
- Caption styling inspector
- Local project version snapshots and restore
- Playback speed, split, undo/redo, timeline zoom and fit
- Responsive desktop/tablet/mobile workspace

## Deepgram
Create `.env.local` locally or a Vercel environment variable:

```env
DEEPGRAM_API_KEY=your_key_here
```

The permanent key remains server-side. The existing token route issues the short-lived grant used by the browser transcription flow.

## Run
```bash
npm install
npm run dev
```

## Notes
The Dub Video tile is a prepared UI entry point; voice translation/TTS requires a separate provider/API integration. JSON export saves the editable project state; browser-side final video rendering is not included in this build.

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

## Required Vercel variable
`DEEPGRAM_API_KEY`

Add the variable in Vercel Project Settings > Environment Variables for Production and Preview.

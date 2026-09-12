# Public product walkthrough

- [French video](rolevidence-tour.fr.mp4): narrated tour of the real application UI.
- [Transcript](TRANSCRIPT.fr.md): accessible text with chapter timestamps.
- [WebVTT captions](rolevidence-tour.fr.vtt): narration captions for compatible players.
- [Local player](player.html): download this directory and open the HTML file.

All names, documents and conclusions in the video are fictional. The application
runs against an isolated in-memory SQLite database and a **scripted model port**.
No provider is called, no API key is loaded and no owner dossier is accessed.
The persistent video banner identifies simulated results, even where the real UI
uses its normal response badge. This is a product walkthrough, not evidence of
model accuracy, measured latency or a real recruitment outcome.

The video uses edited still captures of actual interactions, French synthetic
narration and visible captions. It is not a continuous screen recording. The offer
URL import, report export and checkpoint resume are explained; they are not executed
in the recording. There is no background music or third-party footage.

## Reproduce

The capture uses the existing production build and an ephemeral loopback port;
it never uses the owner's development server or private storage.

```sh
npm ci
npm run build
node scripts/media/capture.ts
node scripts/media/render.ts
```

Rendering requires macOS `say` (French voice Thomas by default), FFmpeg/ffprobe and
Chrome. Set `MEDIA_VOICE` to another installed French voice and
`PLAYWRIGHT_CHANNEL` to a supported installed browser channel if necessary. The
capture procedure uses Playwright from devDependencies. Rendering uses only local
software and does not contact an AI service. Other operating systems need an
alternative narration command; that portability is not implemented.

Raw captures, narration intermediates and clips are written to ignored
`artifacts/media/`. Only the compact final MP4, poster, captions and transcript
belong in Git. Review each frame for accidental private data before publication.
The script source keeps fictional inputs and French presentation copy separate
from the application and rendering code.

## GitHub presentation

The README embeds the public GitHub video attachment as a standalone URL, enabling
GitHub's native player. The repository MP4, local player and transcript remain
available as fallbacks. The attachment was uploaded through GitHub CLI's `--attach`
option to [PR #2](https://github.com/montassarkhalloufi/rolevidence/pull/2#issuecomment-5648470837).
See GitHub's [attachment documentation](https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/attaching-files).

The speech renderer uses “Guit Hub” only in synthesis input to retain the hard g
in French. Captions and visible copy retain “GitHub”. The published pronunciation
fix replaces only the affected spoken word; its encoded video stream is unchanged.

# Home UI Polish Notes

## Recorder Ribbon

The signed-in home recorder uses `AudioWaveRibbon` in `texture="clean"` mode.
This keeps the three primary lavender, mint, and ink-highlight lines while
removing the mesh/ridge texture behind them. The canvas path is smoothed with
quadratic curves so the idle state feels more organic and less like a rigid
waveform.

## Recent Recordings Empty State

When `/api/meetings?limit=5` returns no rows, the home recent-recordings panel
shows a lightweight CSS illustration, short empty-state copy, and a direct
start-recording action. The illustration is built from CSS layers instead of a
bitmap so it stays fast on mobile and can inherit dark-mode colors.

## Calendar Motion

The disconnected calendar card still uses the supplied Google/Outlook assets
from `public/layersdesign-assets`. Small floating context chips now clarify why
calendar connection matters: the next event can become the recording context and
title.

## Capture Card Art

The "Capture everything" card uses a horizontal CSS illustration that represents
conversation context becoming structured notes. It intentionally avoids emoji or
mixed icon styles so the right rail matches the rest of the Layers visual
system.

## Accessibility And Performance

All new motion is transform/opacity based and disabled under
`prefers-reduced-motion: reduce`. The illustrations use CSS rather than large
image assets to keep the home route fast to load.

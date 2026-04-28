# Audio Wave Ribbon

`components/audio-wave-ribbon.tsx` renders the Layer One recorder ribbon with a procedural canvas animation.

## Purpose

- Idle softly on the home recorder card.
- Brighten and add fine ridge detail while recording.
- Respond to either a passed `audioLevel` value or an optional microphone `MediaStream`.

## Integration Notes

- The component does not own or stop the microphone stream.
- The home recorder passes `audioLevel` from `LiveRecorder`, which keeps audio capture in one place.
- The canvas respects `prefers-reduced-motion` by freezing the animated phase while keeping the visual line visible.

## Visual Contract

- Uses the Layer One periwinkle, lilac, mint, and ink palette.
- Keeps the ribbon thin, misted, and premium rather than a conventional vertical bar waveform.
- Desktop home uses `height={118}` and `sensitivity={1.08}`; mobile inherits the CSS-constrained height.

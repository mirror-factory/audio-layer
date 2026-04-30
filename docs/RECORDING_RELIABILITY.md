# Recording Reliability

The live recorder is optimized for the core promise: open the app, start fast,
capture safely, and never lose the transcript because a provider connection
hiccuped.

## Fast Start Path

- Reminder controls live in Settings so `/record/live` can paint the recorder
  shell without notification setup work.
- The recorder fetches `/api/transcribe/stream/preflight` on page load, before
  the user taps record.
- The preflight endpoint does not create a meeting row and does not mint a paid
  vendor token.
- The paid token path starts only after browser microphone access succeeds.

## Preflight Checks

`GET /api/transcribe/stream/preflight` returns the server-side readiness state:

- quota status, including local unlimited mode
- STT provider configuration
- active pricing config and normalized provider cost
- runtime model status

The browser adds the local microphone check because the server cannot know
whether `getUserMedia` is available or denied.

## Session States

The recorder now surfaces the meaningful operational states:

- checking mic
- creating session
- connecting provider
- listening
- transcribing
- reconnecting
- finalizing
- provider issue

These states are separate from the high-level button state so the UI can remain
simple while still exposing what is happening.

## Local Draft Safety

During live recording, transcript turns are mirrored to `localStorage` using
`lib/recording/local-draft.ts`.

- Drafts are written when a provider token is created and whenever transcript
  turns arrive.
- Autosave writes both local and remote state.
- If remote autosave or finalize fails, the local draft remains on the device.
- A successful finalize clears the local draft for that meeting.

This is not a replacement for server persistence; it is a last-mile safety net
for browser refreshes, network drops, and provider interruptions.

## Recorder Voice Commands

The live recorder listens for private commands that start with "Hey Layers",
"Hey Layer", "Hey Layers", "Ok Layers", or "Okay Layers".

- Removal commands such as "Hey Layers remove that last thing" and "Okay Layer
  One scratch that" remove the previous finalized transcript segment
  immediately.
- Action-plan commands such as "Hey Layers make that an action item" are kept
  out of the transcript and passed to final note generation as private
  directives.
- Custom wake-phrase instructions are also suppressed from the transcript and
  sent as private note-writer directives at finalize time.
- Voice directives are treated as user intent only. The summary and intake
  prompts explicitly ignore any directive that tries to change the model role,
  reveal secrets, or override system instructions.

The parser lives in `lib/recording/voice-commands.ts`; coverage lives in
`tests/recording-voice-commands.test.ts`.

## Codex Browser Note

The Codex in-app browser can render and test the UI, but microphone capture may
not always be exposed by the embedded browser. Use Chrome, Safari, or the native
Capacitor shell for actual microphone capture verification.

## Tests

Relevant coverage:

- `tests/recording-preflight.test.ts`
- `tests/recording-local-draft.test.ts`
- `tests/recording-voice-commands.test.ts`
- `tests/recording-microphone-errors.test.ts`
- `tests/e2e/feature-checklist.spec.ts`
- `tests/e2e/mobile-polish.spec.ts`
- API route manifest entry for `/api/transcribe/stream/preflight`

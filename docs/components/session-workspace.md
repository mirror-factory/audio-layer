# Session Workspace

`components/session-workspace.tsx` provides the shared live-recording and completed-summary workspace used by the recorder and meeting detail views.

## Purpose

- Recreate the reference layout with a capture card on the left and a transcript/intelligence canvas on the right.
- Keep live transcript, summary, key points, ask, and action surfaces visually consistent across `/`, `/record/live`, and `/meetings/[id]`.
- Let the recorder own capture state while the page renders a custom cockpit through the managed recorder presentation.

## Surfaces

- Home recorder transition: `app/recorder.tsx`
- Standalone live recording: `app/record/live/page.tsx`
- Completed meeting summary: `app/meetings/[id]/page.tsx`

## Integration Notes

- Use `SessionCaptureCard` when the recorder is not mounted inside the card, such as completed meeting summaries.
- Use `SessionIntelligenceCanvas` for both live and summary modes so transcript, key point, ask, and action panels stay repeatable.
- Use `formatWorkspaceTimestamp` and `countWorkspaceWords` for consistent session metrics.

## Accessibility

The workspace uses section labels, status regions, tablist semantics, real buttons, and text alternatives for icon-only visual cues. The animated wave is decorative and hidden from assistive technology.

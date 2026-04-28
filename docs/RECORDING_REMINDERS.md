# Recording Reminder Panel

`RecordingReminderPanel` gives Settings a low-friction way to schedule a reminder before a meeting starts while keeping the capture screen focused on recording.

## Component

- File: `components/recording-reminder.tsx`
- Utility: `lib/notifications/recording-reminders.ts`
- Settings placement: `app/settings/page.tsx#recording-reminders`

## Behavior

- Offers 5, 15, and 30 minute presets.
- When a connected calendar has an upcoming meeting, Settings also offers exact-time reminders at the meeting start, 5 minutes before, or 15 minutes before when those times are still in the future.
- Uses Capacitor Local Notifications on iOS and Android.
- Falls back to the browser Notification API on desktop web.
- Stores the pending reminder in `localStorage` so the home screen can restore the visible state after refresh.
- Tapping a native notification opens `/record/live`.

## Mobile Notes

- Android 13+ requires notification permission checks.
- Android 12+ exact scheduled notifications require `SCHEDULE_EXACT_ALARM`; the manifest includes it because recording reminders are a core app behavior.
- The browser fallback is useful for desktop testing but is not a replacement for native notifications because browser timers do not survive app termination.
- Reminder controls live outside `/record/live` so notification code does not
  delay the first recorder paint.

## Quality Bar

The reminder is intentionally small and colocated with Settings. It should not delay first paint, block recording, or create a modal before the user starts a meeting.

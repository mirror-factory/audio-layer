# Expect flow: app/control-plane/page.tsx

Open `/control-plane` from the installed app.

Verify:
- The GitHub-like activity grid renders.
- Health, scorecard, registry, module, adapter, integration, hook, and evidence sections all have valid empty or populated states.
- Cost and token telemetry show numeric fallback values when no AI logs exist.
- No dashboard panel crashes when optional Supabase or hosted telemetry is absent.

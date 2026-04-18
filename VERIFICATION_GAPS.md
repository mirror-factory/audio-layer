# Verification gaps

What this branch's CI gates DO cover:

- `pnpm typecheck` — TypeScript across the whole repo
- `pnpm test` — 67 vitest unit tests (schemas, stores, pure helpers, PDF byte signature)
- `pnpm compliance` — the starter kit's 12 pattern checks (telemetry, no @ts-nocheck, etc.)
- `pnpm build` — `next build` of all 21 routes + middleware

Everything below has NOT been exercised end-to-end in the environment that produced this branch. Every item is a real verification step a human (or a CI environment with the right toolchain) needs to run before shipping. Listed in rough order of risk.

## High risk — toolchain-dependent

### 1. Tauri / `src-tauri` Rust code never compiled
Files: `src-tauri/Cargo.toml`, `src-tauri/src/lib.rs`, `src-tauri/src/main.rs`.

Written against cpal 0.15 + screencapturekit 1.x + Tauri 2 docs. The build environment for this branch has no Rust toolchain — `cargo build` was never run. Likely-fragile spots:

- The `Channel<Vec<u8>>` IPC type signature on the capture commands. Tauri 2 may want a different generic or a typed wrapper.
- The cpal callback closures take `&[f32]` / `&[i16]` / `&[u16]` and call into shared `Arc<Mutex<...>>` state; the `Send + 'static` bounds on cpal closures might force a different ownership pattern than I used.
- `Sample::to_float_sample()` — the cpal trait method name for that conversion may have changed; check the version 0.15 docs.
- **`extract_float_samples` in `src-tauri/src/lib.rs::macos_audio` is a TODO.** The CMSampleBuffer → Vec<f32> conversion uses a crate helper whose exact call site wasn't nailed down from docs. First compile attempt will surface the right API; update the fn then.
- `screencapturekit` 1.x API names (`SCContentFilter::new`, `add_output`, `start_capture`) came from readme excerpts, not from source. Method names and generic bounds may differ in the installed version — re-check against `cargo doc --open` on first run.

**Verification:** on a workstation with Rust + Xcode, run `cargo tauri dev` from the repo root. Expect the first build to surface real errors that need to be fixed. Grant Screen Recording permission when macOS prompts on first `start_system_audio_capture` call.

### 2. Tauri JS bridge never invoked
File: `lib/tauri/bridge.ts`, used by `components/live-recorder.tsx`.

The bridge dynamic-imports `@tauri-apps/api/core` through a string variable to keep it out of the regular web bundle. I never installed `@tauri-apps/api` (it would have to live alongside the Tauri shell, not in the web `package.json`). Two unverified assumptions:

- The dynamic import resolves correctly inside the Tauri webview's runtime (it should — Tauri injects `__TAURI__` and serves the API package).
- The shape of `Channel` I'm calling (`new core.Channel<T>()` with `.onmessage = handler`) matches Tauri 2's actual API. I think it does (per docs), but it's not exercised here.

**Verification:** same workstation run as #1; click "Start live session" inside the Tauri window and watch for either a successful turn event from AssemblyAI or the live-recorder's onscreen error message.

### 3. Capacitor native projects don't exist yet
Files: `capacitor.config.ts`, `mobile/README.md`, `mobile/setup.sh`, `mobile/patches/*`. `ios/` and `android/` are gitignored.

`@capacitor/cli` and the iOS/Android plugin packages are installed, but `npx cap add ios` / `npx cap add android` were not run — no Xcode or Android SDK in this environment.

The manifest / plist / MainActivity **patchers** (`apply-ios-plist.py`, `apply-android-manifest.py`, `apply-mainactivity.sh`) were smoke-tested with fake input files and they do what they claim. They have NOT been run against real Capacitor-generated output.

**Verification (on a Mac with Xcode + Android Studio + `ANDROID_HOME` set):**
```bash
bash mobile/setup.sh
npx cap open ios      # verify mic prompt fires on /record
npx cap open android  # same, plus verify getUserMedia doesn't silently reject
```
Expected patches: `NSMicrophoneUsageDescription`, `UIBackgroundModes[audio]`, localhost ATS exception in iOS Info.plist; `RECORD_AUDIO` + `MODIFY_AUDIO_SETTINGS` in AndroidManifest.xml; `onPermissionRequest` override in MainActivity.

## Medium risk — depends on external services

### 4. Stripe checkout / webhook flow
Files: `app/api/stripe/checkout/route.ts`, `app/api/stripe/webhook/route.ts`, `lib/stripe/profiles.ts`.

The `tier ↔ priceId` mapping is unit-tested. The actual Stripe round-trip (creating a Checkout Session, redirecting, receiving a `checkout.session.completed` event, persisting subscription state, then a `customer.subscription.updated` event) is not.

**Verification:**
1. Create monthly Stripe products + prices for Core $15 / Pro $25, drop their IDs into `STRIPE_PRICE_CORE` / `STRIPE_PRICE_PRO`.
2. `stripe listen --forward-to localhost:3000/api/stripe/webhook` and copy the `whsec_...` into `STRIPE_WEBHOOK_SECRET`.
3. Visit `/pricing`, click Subscribe, complete Checkout with a test card.
4. Assert: `profiles` row updates with `subscription_status='active'`, `subscription_tier='core'|'pro'`, and `current_period_end` populated.

### 5. Supabase auth — email magic link round-trip
Files: `app/sign-in/page.tsx`, `app/auth/callback/route.ts`, `app/auth/sign-out/route.ts`.

`signInWithOtp` and `exchangeCodeForSession` are called as documented but not exercised. Supabase's email delivery + redirect-URL allowlist is the most common failure point.

**Verification:**
1. In the Supabase dashboard, add `http://localhost:3000/auth/callback` to the redirect URL allowlist.
2. Visit `/sign-in`, submit your email, click the magic link in the email.
3. Assert: redirected to `/`, `/profile` shows your email + a sign-out button.

### 6. Anonymous → email account merge is NOT implemented
Files: `app/sign-in/page.tsx`, `/profile` UI flag.

Today, an anonymous Supabase user who signs in with email gets a NEW user_id; their previously-recorded anonymous-session meetings become unreachable via RLS. The UI warns the user, but there's no merge path.

**Roadmap (separate PR):**
- Use `supabase.auth.linkIdentity({ provider: 'email', email })` for users with `is_anonymous=true` instead of `signInWithOtp`. This upgrades the existing anon account in place; the user_id stays stable; meetings stay attached.
- Or: server-side re-parent on the service-role client using a temporary `previous_anon_user_id` cookie.

### 7. Supabase RLS policies on `profiles` + `meetings`
File: `lib/supabase/schema.sql`.

The DDL has been written but only run if a developer pasted it into the Supabase SQL editor. The trigger + policies are idempotent (`if not exists`, `drop policy if exists ... create policy ...`), so re-running is safe.

**Verification:** run the SQL once per Supabase project. After running, confirm:
- `select count(*) from pg_policies where tablename in ('meetings','profiles')` returns 5 (4 meetings + 1 profiles).
- `select * from pg_trigger where tgrelid in ('meetings'::regclass,'profiles'::regclass)` returns the touch triggers.

### 8. AssemblyAI streaming `u3-rt-pro` end-to-end
Files: `app/api/transcribe/stream/token/route.ts`, `components/live-recorder.tsx`.

The token mint is implemented per docs; the browser SDK call to `StreamingTranscriber({ speechModel: 'u3-rt-pro' })` is typed but not wire-tested. AssemblyAI's `u3-rt-pro` model availability may vary by account.

**Verification:** with `ASSEMBLYAI_API_KEY` set, open `/record/live`, click Start, speak; expect partial then final turns to render within ~300 ms.

### 9. AssemblyAI batch upload over 4 MB on Vercel
File: `app/api/transcribe/route.ts`.

The route caps the upload at 100 MB internally, but Vercel's serverless function body limit is 4.5 MB by default. Anything bigger requires a storage-backed flow (client uploads to Supabase Storage, sends a signed URL to AssemblyAI).

**Verification:** try uploading a 5+ MB file in production. If it 413s, the storage-backed flow is the next PR.

## Low risk — covered by unit tests but worth a manual sanity check

### 10. PDF rendering at the visual level
File: `lib/meetings/pdf.tsx`.

`tests/meeting-pdf.test.ts` asserts the buffer starts with `%PDF-` and is non-trivial in size. Nobody has actually opened the PDF in a viewer.

**Verification:** complete a meeting locally, click "Export PDF" on `/meetings/[id]`, open the file. Sanity-check section ordering vs the page.

### 12. ScreenCaptureKit audio extraction
File: `src-tauri/src/lib.rs::macos_audio::extract_float_samples`.

Currently returns `None`. The audio callback fires but no PCM is actually forwarded to the JS channel yet — implementation deferred until the first real compile on a Mac surfaces the exact screencapturekit helper method for CMSampleBuffer → audio buffer list extraction. Until this is done, `start_system_audio_capture` will open the stream, macOS will prompt for Screen Recording permission, and then silence flows through. Mic capture via `start_mic_capture` is unaffected.

**Verification:** after first `cargo tauri dev` compile, check the `screencapturekit` docs for the right helper (likely `CMSampleBuffer::audio_buffer_list()` or `asbd_and_data_from_audio_buffer`), wire it into `extract_float_samples`, then record `/record/live` and confirm audio from another app shows up in the transcript.

### 11. Paywall flow on a real Supabase
File: `lib/billing/quota.ts`.

The discriminated-union return shape is unit-testable, but the count query against Supabase is not. With anonymous users sharing a session, "lifetime" is per-anon-user-id which means cookies-cleared = quota-cleared. That's a known limitation of the anon path.

**Verification:** with Supabase configured, record 25 meetings as the same user, then assert that the 26th attempt returns HTTP 402 + the upgrade message.

---

If any of the above breaks on real verification, treat it as the smallest possible follow-up commit — don't pile additional features on top of an unproven foundation.

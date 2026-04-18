import type { CapacitorConfig } from "@capacitor/cli";

/**
 * audio-layer mobile shell config.
 *
 * Strategy: Capacitor wraps the LIVE hosted Next.js app rather than
 * bundling a static export. This lets us ship the same backend (API
 * routes, AssemblyAI streaming token mint, MeetingsStore) to web,
 * desktop (Tauri), iOS, and Android without forks.
 *
 * `server.url` is overridden in dev to point at the local Next.js
 * server. Override it explicitly with the env var if you want to
 * test mobile against a preview deployment.
 */
const config: CapacitorConfig = {
  appId: "com.mirrorfactory.audiolayer",
  appName: "audio-layer",
  // `webDir` is required by Capacitor even when `server.url` is set;
  // it's only used as a fallback bundle for offline / failed loads.
  webDir: "public",
  server: {
    url:
      process.env.CAPACITOR_SERVER_URL ??
      (process.env.NODE_ENV === "production"
        ? "https://audio-layer.vercel.app"
        : "http://localhost:3000"),
    // Allow plain HTTP only in dev — production must be https.
    cleartext: process.env.NODE_ENV !== "production",
    androidScheme: "https",
  },
  ios: {
    contentInset: "always",
  },
  android: {
    allowMixedContent: process.env.NODE_ENV !== "production",
  },
};

export default config;

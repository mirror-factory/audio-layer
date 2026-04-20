import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.mirrorfactory.audiolayer",
  appName: "audio-layer",
  webDir: "public",
  backgroundColor: "#0a0a0a",
  server: {
    url:
      process.env.CAPACITOR_SERVER_URL ??
      "https://audio-layer.vercel.app",
    cleartext: !!process.env.CAPACITOR_SERVER_URL,
    androidScheme: "https",
    allowNavigation: ["api.assemblyai.com", "audio-layer.vercel.app"],
  },
  ios: {
    contentInset: "always",
    backgroundColor: "#0a0a0a",
    scrollEnabled: false,
  },
  android: {
    allowMixedContent: process.env.NODE_ENV !== "production",
  },
};

export default config;

/// <reference types="@capacitor/local-notifications" />
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
    backgroundColor: "#0a0a0a",
    scrollEnabled: false,
    preferredContentMode: "mobile",
  },
  android: {
    allowMixedContent: process.env.NODE_ENV !== "production",
  },
  plugins: {
    StatusBar: {
      overlaysWebView: true,
      style: "LIGHT", // light text on dark background
    },
    Keyboard: {
      resize: "body", // resizes body only, preserves viewport units
      style: "DARK",
      resizeOnFullScreen: true,
    },
    SplashScreen: {
      launchAutoHide: false,
    },
    LocalNotifications: {
      iconColor: "#14b8a6",
    },
  },
};

export default config;

import type { Metadata, Viewport } from "next";
import "./globals.css";

import { CapacitorInit } from "@/components/capacitor-init";

export const metadata: Metadata = {
  title: "Layer One",
  description:
    "Record meetings. Transcribe with AssemblyAI Universal-3 Pro. Summarize with the Gateway. Multi-platform (web, Tauri desktop, Capacitor mobile).",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "audio-layer",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#10b981",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Geist font from Vercel */}
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        {/* Prevent flash of wrong theme */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t&&t!=='system')document.documentElement.setAttribute('data-theme',t)}catch(e){}})()`,
          }}
        />
      </head>
      <body
        className="min-h-dvh antialiased"
        style={{
          backgroundColor: "var(--bg-primary)",
          color: "var(--text-primary)",
        }}
      >
        <CapacitorInit />
        {/* Tauri drag region — invisible bar at top for window dragging */}
        <div
          data-tauri-drag-region="true"
          className="tauri-drag-region"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            height: "28px",
            zIndex: 9999,
            backgroundColor: "var(--bg-primary)",
          }}
        />
        {children}
      </body>
    </html>
  );
}

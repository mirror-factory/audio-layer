import type { Metadata, Viewport } from "next";
import "./globals.css";
import { NavBar } from "@/components/nav-bar";

export const metadata: Metadata = {
  title: "audio-layer",
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
    <html lang="en" className="dark">
      <body className="min-h-dvh bg-neutral-950 pb-16 text-neutral-100 antialiased">
        {children}
        <NavBar />
      </body>
    </html>
  );
}

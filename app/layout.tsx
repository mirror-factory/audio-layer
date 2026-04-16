import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Starter Kit — Reference App",
  description:
    "Minimal reference implementation of Vercel AI SDK v6 patterns: tools, streaming, telemetry, registry.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-dvh bg-neutral-950 text-neutral-100 antialiased">
        {children}
      </body>
    </html>
  );
}

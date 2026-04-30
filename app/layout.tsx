import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Layers",
  description:
    "Capture conversations passively and extract structured, actionable data.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#f8fcf9",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn("h-full antialiased light", geist.variable)}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var v=localStorage.getItem('theme-design-version');var stored=localStorage.getItem('theme');var t=(v==='paper-calm-v1'&&stored)?stored:'light';if(v!=='paper-calm-v1'){localStorage.setItem('theme',t);localStorage.setItem('theme-design-version','paper-calm-v1')}document.documentElement.classList.remove('dark','light');document.documentElement.classList.add(t)}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-full bg-[var(--bg-primary)] text-[var(--text-primary)]">
        {children}
      </body>
    </html>
  );
}

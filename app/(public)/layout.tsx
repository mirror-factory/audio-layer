import type { ReactNode } from "react";
import { PublicSiteNav } from "@/components/public-site-nav";
import { SiteFooter } from "@/components/site-footer";
import { TestingBanner } from "@/components/testing-banner";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg-page,oklch(0.982_0.012_168))] text-[var(--text-primary,oklch(0.22_0.035_256))]">
      <TestingBanner />
      <PublicSiteNav />
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}

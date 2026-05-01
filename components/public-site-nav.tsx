"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { LayersLogo } from "@/components/layers-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/download", label: "Download" },
  { href: "/pricing", label: "Pricing" },
  { href: "/sign-in", label: "Sign in" },
] as const;

export function PublicSiteNav() {
  const pathname = usePathname() ?? "/";
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border-subtle,oklch(0.84_0.024_168/0.5))] bg-[var(--bg-page,oklch(0.982_0.012_168))]/85 backdrop-blur-md">
      <nav
        aria-label="Primary navigation"
        className="mx-auto flex max-w-[1180px] items-center justify-between px-6 py-4 md:px-10"
      >
        <Link
          href="/"
          className="inline-flex items-center"
          aria-label="Layers home"
          onClick={() => setOpen(false)}
        >
          <LayersLogo />
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map(({ href, label }) => {
            const isActive = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "text-[14px] transition-colors",
                  isActive
                    ? "text-[var(--text-primary,oklch(0.22_0.035_256))]"
                    : "text-[var(--text-secondary,oklch(0.46_0.025_256))] hover:text-[var(--text-primary,oklch(0.22_0.035_256))]"
                )}
              >
                {label}
              </Link>
            );
          })}
          <ThemeToggle />
          <Link
            href="/sign-up"
            className="rounded-[10px] bg-[var(--layers-mint,oklch(0.68_0.13_166))] px-4 py-2 text-[14px] font-medium text-[var(--layers-ink,oklch(0.22_0.035_256))] shadow-[0_1px_0_oklch(0.22_0.035_256/0.08),0_8px_18px_oklch(0.68_0.13_166/0.18)] transition-transform hover:-translate-y-px"
          >
            Coming soon
          </Link>
        </div>

        <div className="flex items-center gap-1 md:hidden">
          <ThemeToggle />
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-nav-panel"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md text-[var(--text-primary,oklch(0.22_0.035_256))] transition-colors hover:bg-[var(--bg-surface,oklch(0.997_0.004_168))]"
          >
            {open ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
          </button>
        </div>
      </nav>

      {open ? (
        <div
          id="mobile-nav-panel"
          className="border-t border-[var(--border-subtle,oklch(0.84_0.024_168/0.4))] bg-[var(--bg-page,oklch(0.982_0.012_168))] md:hidden"
        >
          <div className="mx-auto flex max-w-[1180px] flex-col gap-1 px-6 py-4">
            {NAV_LINKS.map(({ href, label }) => {
              const isActive = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "rounded-md px-3 py-3 text-[15px]",
                    isActive
                      ? "bg-[var(--bg-surface,oklch(0.997_0.004_168))] text-[var(--text-primary,oklch(0.22_0.035_256))]"
                      : "text-[var(--text-secondary,oklch(0.46_0.025_256))] hover:bg-[var(--bg-surface,oklch(0.997_0.004_168))]"
                  )}
                >
                  {label}
                </Link>
              );
            })}
            <Link
              href="/sign-up"
              onClick={() => setOpen(false)}
              className="mt-2 inline-flex items-center justify-center rounded-[10px] bg-[var(--layers-mint,oklch(0.68_0.13_166))] px-4 py-3 text-[15px] font-medium text-[var(--layers-ink,oklch(0.22_0.035_256))]"
            >
              Coming soon
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}

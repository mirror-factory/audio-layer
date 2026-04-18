"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useCallback } from "react";

const MENU_ITEMS = [
  { label: "Meetings", href: "/meetings" },
  { label: "Settings", href: "/settings" },
  { label: "Usage", href: "/usage" },
  { label: "Pricing", href: "/pricing" },
  { label: "Profile", href: "/profile" },
] as const;

export function SlideMenu() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close menu on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const close = useCallback(() => setOpen(false), []);

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="flex h-[44px] w-[44px] items-center justify-center rounded-[var(--radius-md)]"
        style={{
          color: "var(--text-secondary)",
          transition: `color var(--duration-fast) var(--ease-out)`,
        }}
        aria-label="Open menu"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        >
          <line x1="3" y1="5" x2="17" y2="5" />
          <line x1="3" y1="10" x2="17" y2="10" />
          <line x1="3" y1="15" x2="17" y2="15" />
        </svg>
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-[100]"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
          onClick={close}
          aria-hidden
        />
      )}

      {/* Panel */}
      <div
        className="fixed top-0 right-0 bottom-0 z-[101] flex w-[280px] flex-col"
        style={{
          backgroundColor: "var(--bg-secondary)",
          transform: open ? "translateX(0)" : "translateX(100%)",
          transition: `transform var(--duration-slow) var(--ease-out)`,
        }}
      >
        {/* Close button */}
        <div className="flex h-[44px] items-center justify-end px-4" style={{ marginTop: "max(env(safe-area-inset-top), 28px)" }}>
          <button
            onClick={close}
            className="flex h-[44px] w-[44px] items-center justify-center"
            style={{ color: "var(--text-secondary)" }}
            aria-label="Close menu"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            >
              <line x1="5" y1="5" x2="15" y2="15" />
              <line x1="15" y1="5" x2="5" y2="15" />
            </svg>
          </button>
        </div>

        {/* Menu items */}
        <nav className="flex flex-1 flex-col gap-1 px-3 pt-2">
          {MENU_ITEMS.map((item) => {
            const isActive =
              pathname === item.href ||
              pathname.startsWith(item.href + "/");

            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex min-h-[44px] items-center rounded-[var(--radius-md)] px-3 text-[15px] font-medium"
                style={{
                  color: isActive ? "var(--accent)" : "var(--text-primary)",
                  backgroundColor: isActive
                    ? "var(--accent-subtle)"
                    : "transparent",
                  transition: `background-color var(--duration-fast) var(--ease-out)`,
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Sign in/out at bottom */}
        <div className="px-3 pb-8" style={{ paddingBottom: "max(env(safe-area-inset-bottom), 32px)" }}>
          <button
            className="flex min-h-[44px] w-full items-center rounded-[var(--radius-md)] px-3 text-[15px] font-medium"
            style={{ color: "var(--text-muted)" }}
          >
            Sign In
          </button>
        </div>
      </div>
    </>
  );
}

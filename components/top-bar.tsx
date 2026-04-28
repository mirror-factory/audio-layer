"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { MobilePrimaryNav } from "./mobile-primary-nav";
import { SlideMenu } from "./slide-menu";
import { ThemeToggle } from "./theme-toggle";

interface TopBarProps {
  title: string;
  showBack?: boolean;
}

export function TopBar({ title, showBack = false }: TopBarProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <header
        className={`top-bar fixed top-0 left-0 right-0 z-40 flex items-center justify-between transition-all duration-300 ${
          scrolled ? "is-scrolled" : ""
        }`}
        style={{
          height: "calc(72px + var(--safe-top))",
          paddingTop: "var(--safe-top)",
        }}
      >
        <div className="top-bar-leading flex items-center">
          {showBack ? (
            <button
              type="button"
              onClick={() => router.back()}
              className="top-bar-back flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors duration-200"
              aria-label="Go back"
            >
              <ArrowLeft size={20} />
            </button>
          ) : (
            <span className="layers-brand-mark" aria-hidden="true">
              <span />
            </span>
          )}
        </div>

        <h1 className="top-bar-title truncate px-2 text-sm font-semibold tracking-wide text-[var(--text-primary)]">
          {title}
        </h1>

        <div className="top-bar-actions flex items-center">
          <ThemeToggle />
          <span className="top-bar-divider" aria-hidden="true" />
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="account-avatar-button"
            aria-label="Open account menu"
          >
            <span className="account-avatar" aria-hidden="true">
              <span>AM</span>
            </span>
            <span className="account-avatar-status" aria-hidden="true" />
          </button>
        </div>
      </header>

      <div className="top-bar-spacer" />

      <SlideMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
      <MobilePrimaryNav />
    </>
  );
}

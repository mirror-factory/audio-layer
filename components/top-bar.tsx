"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Menu } from "lucide-react";
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
        className={`sticky top-0 z-40 flex items-center justify-between transition-all duration-300 ${
          scrolled
            ? "bg-[var(--bg-primary)]/80 backdrop-blur-xl border-b border-[var(--border-subtle)]"
            : "bg-[var(--bg-primary)] border-b border-transparent"
        }`}
        style={{
          height: "calc(44px + env(safe-area-inset-top, 0px))",
          paddingTop: "env(safe-area-inset-top, 0px)",
        }}
      >
        <div className="flex items-center min-w-[44px] h-[44px]">
          {showBack && (
            <button
              onClick={() => router.back()}
              className="flex items-center justify-center w-[44px] h-[44px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors duration-200"
              aria-label="Go back"
            >
              <ArrowLeft size={20} />
            </button>
          )}
        </div>

        <h1 className="text-sm font-medium text-[var(--text-primary)] truncate px-2 tracking-wide">
          {title}
        </h1>

        <div className="flex items-center">
          <ThemeToggle />
          <button
            onClick={() => setMenuOpen(true)}
            className="flex items-center justify-center w-[44px] h-[44px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors duration-200"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
        </div>
      </header>

      <SlideMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}

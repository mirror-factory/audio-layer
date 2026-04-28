"use client";

import { useState, useEffect } from "react";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("theme") as "dark" | "light" | null;
    const designVersion = localStorage.getItem("theme-design-version");
    const initial =
      designVersion === "paper-calm-v1" && stored ? stored : "light";
    if (designVersion !== "paper-calm-v1") {
      localStorage.setItem("theme", initial);
      localStorage.setItem("theme-design-version", "paper-calm-v1");
    }
    setTheme(initial);
    document.documentElement.classList.remove("dark", "light");
    document.documentElement.classList.add(initial);
  }, []);

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("theme", next);
    document.documentElement.classList.remove("dark", "light");
    document.documentElement.classList.add(next);
  };

  if (!mounted) return <div className="w-[44px] h-[44px]" />;

  return (
    <button
      onClick={toggle}
      className="theme-toggle flex items-center justify-center w-[44px] h-[44px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors duration-200 rounded-full hover:bg-white/[0.05]"
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
    >
      {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}

"use client";

import { useEffect, useState } from "react";

type Theme = "dark" | "light" | "system";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    const stored = localStorage.getItem("theme") as Theme | null;
    if (stored) {
      setTheme(stored);
      applyTheme(stored);
    }
  }, []);

  function applyTheme(t: Theme) {
    const root = document.documentElement;
    if (t === "system") {
      root.removeAttribute("data-theme");
    } else {
      root.setAttribute("data-theme", t);
    }
  }

  function cycle() {
    const next: Theme =
      theme === "dark" ? "light" : theme === "light" ? "system" : "dark";
    setTheme(next);
    applyTheme(next);
    localStorage.setItem("theme", next);
  }

  const icons: Record<Theme, string> = {
    dark: "●",
    light: "○",
    system: "◐",
  };

  const labels: Record<Theme, string> = {
    dark: "Dark",
    light: "Light",
    system: "System",
  };

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={`Theme: ${labels[theme]}. Click to cycle.`}
      className="flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-[var(--radius-md)] text-xs transition-colors"
      style={{
        color: "var(--text-muted)",
        background: "transparent",
        border: "none",
      }}
    >
      <span style={{ fontSize: "14px" }}>{icons[theme]}</span>
      <span className="hidden sm:inline">{labels[theme]}</span>
    </button>
  );
}

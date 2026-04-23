"use client";

import { useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  X,
  Home,
  Radio,
  List,
  Search,
  MessageSquare,
  Settings,
  CreditCard,
  BarChart3,
  User,
  BookOpen,
  Activity,
  Map,
} from "lucide-react";

interface SlideMenuProps {
  open: boolean;
  onClose: () => void;
}

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/record/live", label: "Live Recording", icon: Radio },
  { href: "/meetings", label: "Meetings", icon: List },
  { href: "/search", label: "Search", icon: Search },
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/pricing", label: "Pricing", icon: CreditCard },
  { href: "/usage", label: "Usage", icon: BarChart3 },
  { href: "/profile", label: "Profile", icon: User },
  { href: "/roadmap", label: "Roadmap", icon: Map },
  { href: "/docs", label: "Documentation", icon: BookOpen },
  { href: "/observability", label: "Observability", icon: Activity },
];

export function SlideMenu({ open, onClose }: SlideMenuProps) {
  const pathname = usePathname();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, handleKeyDown]);

  return (
    <>
      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm transition-opacity duration-300"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Panel */}
      <nav
        className={`slide-menu-panel fixed top-0 right-0 z-50 h-full w-[280px] bg-[var(--bg-primary)]/95 backdrop-blur-2xl border-l border-[var(--border-subtle)] transform transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        style={{ paddingTop: "var(--safe-top)" }}
        aria-label="Main navigation"
      >
        <div className="flex items-center justify-between px-4 h-[44px] border-b border-[var(--border-subtle)] menu-divider">
          <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-widest">
            Menu
          </span>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-[44px] h-[44px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors duration-200"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        <ul className="py-2 overflow-y-auto" style={{ maxHeight: "calc(100dvh - 44px - var(--safe-top))" }}>
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href;
            return (
              <li key={href}>
                <Link
                  href={href}
                  onClick={onClose}
                  className={`flex items-center gap-3 px-4 py-3 min-h-[44px] text-sm transition-all duration-200 ${
                    isActive
                      ? "text-[#14b8a6] bg-[#14b8a6]/[0.08]"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)]"
                  }`}
                >
                  <Icon size={18} />
                  <span>{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}

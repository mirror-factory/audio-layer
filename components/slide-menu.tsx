"use client";

import { useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  X,
  Home,
  Mic,
  Radio,
  List,
  MessageSquare,
  Settings,
  CreditCard,
  BarChart3,
  User,
  BookOpen,
  Activity,
} from "lucide-react";

interface SlideMenuProps {
  open: boolean;
  onClose: () => void;
}

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/record", label: "Record", icon: Mic },
  { href: "/record/live", label: "Live Recording", icon: Radio },
  { href: "/meetings", label: "Meetings", icon: List },
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/pricing", label: "Pricing", icon: CreditCard },
  { href: "/usage", label: "Usage", icon: BarChart3 },
  { href: "/profile", label: "Profile", icon: User },
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
          className="fixed inset-0 z-50 bg-black/60 transition-opacity duration-300"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Panel */}
      <nav
        className={`fixed top-0 right-0 z-50 h-full w-[280px] bg-[#171717] border-l border-[#262626] transform transition-transform duration-300 ease-in-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
        aria-label="Main navigation"
      >
        <div className="flex items-center justify-between px-4 h-[44px] border-b border-[#262626]">
          <span className="text-xs font-semibold text-[#737373] uppercase tracking-wider">
            Menu
          </span>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-[44px] h-[44px] text-[#a3a3a3] hover:text-[#d4d4d4] transition-colors duration-200"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        <ul className="py-2 overflow-y-auto" style={{ maxHeight: "calc(100vh - 44px)" }}>
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href;
            return (
              <li key={href}>
                <Link
                  href={href}
                  onClick={onClose}
                  className={`flex items-center gap-3 px-4 py-3 min-h-[44px] text-sm transition-colors duration-200 ${
                    isActive
                      ? "text-[#14b8a6] bg-[#134e4a]/30"
                      : "text-[#a3a3a3] hover:text-[#d4d4d4] hover:bg-[#262626]/50"
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

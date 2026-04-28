"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Library, MessageCircle, Mic2 } from "lucide-react";

const PRIMARY_NAV = [
  { href: "/", label: "Record", icon: Mic2 },
  { href: "/meetings", label: "Library", icon: Library },
  { href: "/ask", label: "Ask", icon: MessageCircle },
];

function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/" || pathname.startsWith("/record");
  return pathname === href || pathname.startsWith(`${href}/`);
}

function shouldHide(pathname: string): boolean {
  const isPrimarySurface =
    pathname === "/" ||
    pathname.startsWith("/record") ||
    pathname === "/meetings" ||
    pathname === "/ask";

  return !isPrimarySurface;
}

export function MobilePrimaryNav() {
  const pathname = usePathname();
  if (shouldHide(pathname)) return null;

  return (
    <nav className="mobile-primary-nav md:hidden" aria-label="Primary navigation">
      {PRIMARY_NAV.map(({ href, label, icon: Icon }) => {
        const active = isActivePath(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`mobile-primary-nav-link ${
              active ? "is-active" : ""
            }`}
          >
            <Icon size={18} aria-hidden="true" />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

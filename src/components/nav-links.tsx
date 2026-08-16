"use client";

import {
  Activity,
  Compass,
  Film,
  House,
  RadioTower,
  Settings2,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const baseItems = [
  { href: "/", label: "Home", icon: House },
  { href: "/discover", label: "Discover", icon: Compass },
  { href: "/media", label: "Media", icon: Film },
  { href: "/activity", label: "Activity", icon: Activity },
];

export function NavLinks({
  showOperations,
  desktop = false,
}: {
  showOperations: boolean;
  desktop?: boolean;
}) {
  const pathname = usePathname();
  const items = [
    ...baseItems,
    ...(showOperations
      ? [
          { href: "/operations", label: "Operations", icon: RadioTower },
          ...(desktop
            ? [{ href: "/settings", label: "Settings", icon: Settings2 }]
            : []),
        ]
      : []),
  ];

  return (
    <nav
      className={desktop ? "desktop-nav" : "mobile-nav"}
      aria-label="Primary navigation"
    >
      {items.map(({ href, label, icon: Icon }) => {
        const active =
          href === "/" ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={active ? "nav-link active" : "nav-link"}
            aria-current={active ? "page" : undefined}
          >
            <Icon
              aria-hidden="true"
              size={desktop ? 19 : 21}
              strokeWidth={active ? 2.4 : 1.8}
            />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

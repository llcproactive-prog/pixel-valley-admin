"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "Dashboard" },
  { href: "/jobs", label: "Marketing" },
  { href: "/leads", label: "Leads" },
  { href: "/activity", label: "Activity" },
  { href: "/settings", label: "Settings" },
];

export function Nav() {
  const path = usePathname();
  return (
    <nav className="-mx-1 flex min-w-0 gap-1 overflow-x-auto">
      {items.map((i) => {
        const active = i.href === "/" ? path === "/" : path.startsWith(i.href);
        return (
          <Link
            key={i.href}
            href={i.href}
            aria-current={active ? "page" : undefined}
            className={`whitespace-nowrap rounded-md px-2.5 py-1.5 text-sm font-medium ${active ? "bg-coastal-700 text-white" : "text-coastal-700/75 hover:bg-coastal-50 hover:text-coastal-700"}`}
          >
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}

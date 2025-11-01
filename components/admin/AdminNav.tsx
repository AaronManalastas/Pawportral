"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/pets", label: "Pets" },
  { href: "/admin/users", label: "Users" },
  // ✅ your real reports page
  { href: "/admin/access", label: "Reports" },
  // ✅ payments
  { href: "/admin/payment-proofs", label: "Payments" },
  // ✅ NEW: printable income report
  { href: "/admin/printable-income", label: "Income" },
];

export default function AdminNav() {
  const pathname = usePathname() || "/";

  return (
    <nav className="flex gap-2 flex-wrap">
      {links.map((l) => {
        const isActive =
          l.href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(l.href);

        return (
          <Link
            key={l.href}
            href={l.href}
            className={`px-3 py-2 rounded-xl text-sm transition shadow-sm ${
              isActive
                ? "bg-black/90 text-white dark:bg-white/90 dark:text-black"
                : "bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/20"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}

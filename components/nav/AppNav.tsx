"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useAuth } from "@/components/auth/AuthProvider";
import { NGOINFO_LOGO_URL } from "@/lib/brand";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/profile", label: "My Profile" },
  { href: "/billing", label: "Plans & Billing" },
];

export function AppNav() {
  const pathname = usePathname();
  const { logout } = useAuth();

  return (
    <aside className="border-r border-brand-border bg-brand-card-bg">
      <div className="border-b border-brand-border px-4 py-4 md:px-6">
        <Image
          src={NGOINFO_LOGO_URL}
          alt="NGOInfo"
          width={180}
          height={40}
          className="h-8 w-auto md:h-10"
          priority
        />
      </div>
      <nav className="space-y-1 p-4 md:p-6">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "block rounded-[8px] px-4 py-2 text-[16px] font-medium",
                isActive
                  ? "bg-brand-primary text-white"
                  : "text-brand-text-primary hover:bg-brand-divider",
              ].join(" ")}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="px-4 pb-6 md:px-6">
        <button
          type="button"
          onClick={() => void logout()}
          className="h-11 w-full rounded-[8px] border border-brand-border bg-transparent px-4 text-left text-sm font-medium text-brand-text-secondary"
        >
          Logout
        </button>
      </div>
    </aside>
  );
}

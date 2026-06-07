"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useAuth } from "@/components/auth/AuthProvider";
import { NGOINFO_LOGO_URL } from "@/lib/brand";
import { isMeModuleEnabled } from "@/lib/me-module";

type NavItem = {
  href: string;
  label: string;
};

const fitScansNavItem: NavItem = { href: "/dashboard#fit-scans", label: "Fit Scans" };
const proposalsNavItem: NavItem = { href: "/dashboard#proposals", label: "Proposals" };
const reportsNavItem: NavItem = { href: "/reports", label: "M&E Reports" };

function buildNavItems(): NavItem[] {
  const items: NavItem[] = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/profile", label: "Profile" },
    fitScansNavItem,
    proposalsNavItem,
  ];

  if (isMeModuleEnabled()) {
    items.push(reportsNavItem);
  }

  items.push({ href: "/billing", label: "Billing" });
  return items;
}

function isNavItemActive(pathname: string, href: string): boolean {
  // Hash hrefs are in-page jump links — never independently highlighted.
  if (href.includes("#")) {
    return false;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppNav() {
  const pathname = usePathname();
  const { logout } = useAuth();
  const navItems = buildNavItems();

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
          const isActive = isNavItemActive(pathname, item.href);
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

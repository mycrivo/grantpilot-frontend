"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useAuth } from "@/components/auth/AuthProvider";

type AuthGuardProps = {
  children: ReactNode;
};

export function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isAuthenticated) {
      return;
    }

    const search = typeof window === "undefined" ? "" : window.location.search;
    const nextPath = `${pathname}${search}`;
    router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
  }, [isAuthenticated, pathname, router]);

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}

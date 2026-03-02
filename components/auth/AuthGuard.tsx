"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useAuth } from "@/components/auth/AuthProvider";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";

type AuthGuardProps = {
  children: ReactNode;
};

export function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) {
      return;
    }
    if (isAuthenticated) {
      return;
    }

    const search = typeof window === "undefined" ? "" : window.location.search;
    const nextPath = `${pathname}${search}`;
    router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
  }, [isAuthenticated, isLoading, pathname, router]);

  if (isLoading) {
    return <LoadingSkeleton lines={8} />;
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}

"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { useAuth } from "@/components/auth/AuthProvider";

type AuthGuardProps = {
  children: ReactNode;
};

export function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (isAuthenticated) {
      return;
    }

    const queryString = searchParams.toString();
    const nextPath = queryString ? `${pathname}?${queryString}` : pathname;
    router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
  }, [isAuthenticated, pathname, router, searchParams]);

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}

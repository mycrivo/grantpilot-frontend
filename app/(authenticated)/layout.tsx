import type { ReactNode } from "react";

import { AuthGuard } from "@/components/auth/AuthGuard";
import { AppNav } from "@/components/nav/AppNav";

export default function AuthenticatedLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-brand-app-bg">
      <AuthGuard>
        <div className="grid min-h-screen md:grid-cols-[280px_1fr]">
          <AppNav />
          <div className="flex min-h-screen flex-col">
            <main className="flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
          </div>
        </div>
      </AuthGuard>
    </div>
  );
}


import type { ReactNode } from "react";
import { notFound } from "next/navigation";

import { isMeModuleEnabled } from "@/lib/me-module";

export default function ReportsLayout({ children }: { children: ReactNode }) {
  if (!isMeModuleEnabled()) {
    notFound();
  }

  return <>{children}</>;
}

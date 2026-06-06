"use client";

import { useEffect, useState } from "react";

import { MeUpgradeRequired } from "@/components/me/MeUpgradeRequired";
import { ReportList } from "@/components/reports/ReportList";
import { ReportsEmptyState } from "@/components/reports/ReportsEmptyState";
import { ReportsStartBanner } from "@/components/reports/ReportsStartBanner";
import { ErrorDisplay } from "@/components/shared/ErrorDisplay";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import type { EntitlementsResponse } from "@/lib/api/entitlements";
import { listReports } from "@/lib/api/reports";
import type { ReportListItem } from "@/lib/api/reports";
import { ApiClientError, apiRequest } from "@/lib/api-client";
import { ME_UPGRADE_REQUIRED } from "@/lib/me-enums";

type ReportsPageState =
  | { kind: "loading" }
  | { kind: "upgrade_required" }
  | { kind: "error"; error: ApiClientError }
  | { kind: "ready"; reports: ReportListItem[] };

export default function ReportsPage() {
  const [state, setState] = useState<ReportsPageState>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setState({ kind: "loading" });

      try {
        const entitlements = await apiRequest<EntitlementsResponse>("/api/me/entitlements", { method: "GET" });

        if (entitlements.entitlements.reports.limit <= 0) {
          if (!cancelled) {
            setState({ kind: "upgrade_required" });
          }
          return;
        }

        const payload = await listReports();

        if (!cancelled) {
          setState({ kind: "ready", reports: payload.reports });
        }
      } catch (error) {
        if (cancelled) {
          return;
        }

        if (
          error instanceof ApiClientError &&
          error.status === 403 &&
          error.errorCode === ME_UPGRADE_REQUIRED.ERROR_CODE
        ) {
          setState({ kind: "upgrade_required" });
          return;
        }

        setState({
          kind: "error",
          error:
            error instanceof ApiClientError
              ? error
              : new ApiClientError(500, "Failed to load donor reports."),
        });
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  if (state.kind === "loading") {
    return <LoadingSkeleton variant="page" lines={6} />;
  }

  if (state.kind === "upgrade_required") {
    return <MeUpgradeRequired />;
  }

  if (state.kind === "error") {
    return <ErrorDisplay title="Reports unavailable" error={state.error} />;
  }

  const hasReports = state.reports.length > 0;

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-[28px] font-bold leading-tight text-brand-text-primary">Your donor reports</h1>
        <p className="mt-2 max-w-2xl text-[15px] text-secondary">
          Start a new funder report or continue one you have already begun.
        </p>
      </header>

      {hasReports ? (
        <>
          <ReportsStartBanner />
          <ReportList items={state.reports} />
        </>
      ) : (
        <ReportsEmptyState />
      )}
    </section>
  );
}

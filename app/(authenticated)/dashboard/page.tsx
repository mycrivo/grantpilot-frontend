"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { FitScanList } from "@/components/dashboard/FitScanList";
import { ProposalList } from "@/components/dashboard/ProposalList";
import { QuotaOverview } from "@/components/dashboard/QuotaOverview";
import { ErrorDisplay } from "@/components/shared/ErrorDisplay";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { ApiClientError, apiRequest } from "@/lib/api-client";

type EntitlementsResponse = {
  plan: "FREE" | "GROWTH" | "IMPACT";
  entitlements: {
    fit_scans: {
      limit: number;
      used: number;
      remaining: number;
      period: "LIFETIME" | "BILLING_CYCLE";
      reset_at: string | null;
    };
    proposals: {
      limit: number;
      used: number;
      remaining: number;
      period: "LIFETIME" | "BILLING_CYCLE";
      reset_at: string | null;
    };
    proposal_regenerations: {
      limit_per_proposal: number;
    };
  };
};

type ProfileCompletenessResponse = {
  status: "MISSING" | "DRAFT" | "COMPLETE";
  percent_complete: number;
  required_fields: string[];
  missing_fields: string[];
  updated_at: string | null;
};

type FitScanListResponse = {
  fit_scans: Array<{
    id: string;
    funding_opportunity_id: string;
    opportunity_title: string | null;
    overall_recommendation: "RECOMMENDED" | "APPLY_WITH_CAVEATS" | "NOT_RECOMMENDED";
    model_rating: "STRONG" | "MODERATE" | "WEAK";
    subscores: {
      eligibility: number;
      alignment: number;
      readiness: number;
    };
    created_at: string;
  }>;
};

type ProposalListResponse = {
  proposals: Array<{
    id: string;
    funding_opportunity_id: string;
    fit_scan_id: string | null;
    opportunity_title: string | null;
    status: "DRAFT" | "DEGRADED";
    version: number;
    created_at: string;
    updated_at: string;
    generation_summary: {
      total_items: number;
      generated: number;
      failed: number;
      manual_required: number;
      warnings: string[];
    };
  }>;
};

function isFitScanListResponse(value: unknown): value is FitScanListResponse {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Partial<FitScanListResponse>;
  if (!Array.isArray(candidate.fit_scans)) {
    return false;
  }
  return candidate.fit_scans.every(
    (item) =>
      item &&
      typeof item === "object" &&
      typeof item.id === "string" &&
      typeof item.funding_opportunity_id === "string" &&
      "opportunity_title" in item,
  );
}

function isProposalListResponse(value: unknown): value is ProposalListResponse {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Partial<ProposalListResponse>;
  if (!Array.isArray(candidate.proposals)) {
    return false;
  }
  return candidate.proposals.every(
    (item) =>
      item &&
      typeof item === "object" &&
      typeof item.id === "string" &&
      typeof item.funding_opportunity_id === "string" &&
      "opportunity_title" in item &&
      item.generation_summary &&
      typeof item.generation_summary === "object",
  );
}

export default function DashboardPage() {
  const [entitlements, setEntitlements] = useState<EntitlementsResponse | null>(null);
  const [completeness, setCompleteness] = useState<ProfileCompletenessResponse | null>(null);
  const [fitScans, setFitScans] = useState<FitScanListResponse["fit_scans"]>([]);
  const [proposals, setProposals] = useState<ProposalListResponse["proposals"]>([]);

  const [entitlementsError, setEntitlementsError] = useState<ApiClientError | null>(null);
  const [completenessError, setCompletenessError] = useState<ApiClientError | null>(null);
  const [fitScansError, setFitScansError] = useState<ApiClientError | null>(null);
  const [proposalsError, setProposalsError] = useState<ApiClientError | null>(null);

  const [loadingCount, setLoadingCount] = useState(4);

  useEffect(() => {
    const markDone = () => setLoadingCount((count) => Math.max(0, count - 1));

    void apiRequest<EntitlementsResponse>("/api/me/entitlements", { method: "GET" })
      .then((response) => {
        setEntitlements(response);
      })
      .catch((error: unknown) => {
        setEntitlementsError(
          error instanceof ApiClientError ? error : new ApiClientError(500, "Failed to load quota overview."),
        );
      })
      .finally(markDone);

    void apiRequest<ProfileCompletenessResponse>("/api/ngo-profile/completeness", { method: "GET" })
      .then((response) => {
        setCompleteness(response);
      })
      .catch((error: unknown) => {
        setCompletenessError(
          error instanceof ApiClientError ? error : new ApiClientError(500, "Failed to load profile completeness."),
        );
      })
      .finally(markDone);

    void apiRequest<unknown>("/api/fit-scans?limit=5", { method: "GET" })
      .then((response) => {
        if (!isFitScanListResponse(response)) {
          setFitScansError(
            new ApiClientError(
              500,
              "STOP: GET /api/fit-scans response shape does not match API_CONTRACT.md Section 8.3.",
            ),
          );
          return;
        }
        setFitScans(response.fit_scans);
      })
      .catch((error: unknown) => {
        setFitScansError(
          error instanceof ApiClientError ? error : new ApiClientError(500, "Failed to load recent fit scans."),
        );
      })
      .finally(markDone);

    void apiRequest<unknown>("/api/proposals?limit=5", { method: "GET" })
      .then((response) => {
        if (!isProposalListResponse(response)) {
          setProposalsError(
            new ApiClientError(
              500,
              "STOP: GET /api/proposals response shape does not match API_CONTRACT.md Section 9.3.",
            ),
          );
          return;
        }
        setProposals(response.proposals);
      })
      .catch((error: unknown) => {
        setProposalsError(
          error instanceof ApiClientError ? error : new ApiClientError(500, "Failed to load recent proposals."),
        );
      })
      .finally(markDone);
  }, []);

  const isPageLoading = useMemo(() => loadingCount > 0, [loadingCount]);

  if (isPageLoading) {
    return <LoadingSkeleton variant="page" lines={8} />;
  }

  return (
    <section className="space-y-6">
      {entitlementsError ? (
        <ErrorDisplay title="Quota overview unavailable" error={entitlementsError} />
      ) : entitlements ? (
        <QuotaOverview payload={entitlements} />
      ) : null}

      {completenessError ? (
        <ErrorDisplay title="Profile completeness unavailable" error={completenessError} />
      ) : completeness ? (
        <section
          className={`card space-y-3 ${
            completeness.status === "COMPLETE" ? "border-brand-success/30 bg-brand-success/5" : "border-brand-warning/30 bg-brand-warning/5"
          }`}
        >
          <h3>Profile Completeness</h3>
          <p className="text-secondary">Your profile is {completeness.percent_complete}% complete</p>
          <div className="h-2 rounded-full bg-brand-divider">
            <div className="h-2 rounded-full bg-brand-primary" style={{ width: `${Math.max(0, Math.min(100, completeness.percent_complete))}%` }} />
          </div>
          {completeness.status === "COMPLETE" ? (
            <p className="text-sm font-medium text-brand-success">Profile complete</p>
          ) : (
            <Link href="/profile" className="inline-flex items-center text-sm font-semibold text-brand-primary hover:underline">
              Complete your profile \u2192
            </Link>
          )}
        </section>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        {fitScansError ? (
          <ErrorDisplay title="Recent fit scans unavailable" error={fitScansError} />
        ) : (
          <FitScanList items={fitScans} />
        )}

        {proposalsError ? (
          <ErrorDisplay title="Recent proposals unavailable" error={proposalsError} />
        ) : (
          <ProposalList items={proposals} />
        )}
      </div>
    </section>
  );
}


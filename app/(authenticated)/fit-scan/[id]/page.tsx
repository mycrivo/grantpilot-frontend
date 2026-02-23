"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { ErrorDisplay } from "@/components/shared/ErrorDisplay";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { apiRequest, ApiClientError } from "@/lib/api-client";
import { RecommendationBanner } from "@/components/fit-scan/RecommendationBanner";
import { ScoreBar } from "@/components/fit-scan/ScoreBar";
import { RiskFlagList } from "@/components/fit-scan/RiskFlagList";

type Recommendation = "RECOMMENDED" | "APPLY_WITH_CAVEATS" | "NOT_RECOMMENDED";
type RiskSeverity = "HIGH" | "MEDIUM" | "LOW";

type FitScanPayload = {
  fit_scan: {
    id: string;
    funding_opportunity_id: string;
    opportunity_title?: string | null;
    overall_recommendation: Recommendation;
    model_rating?: string;
    subscores: {
      eligibility: number;
      alignment: number;
      readiness: number;
    };
    primary_rationale: string;
    risk_flags: Array<{
      risk_type: string;
      severity: RiskSeverity;
      description: string;
    }>;
    created_at: string;
  };
};

type EntitlementsPayload = {
  plan?: "FREE" | "GROWTH" | "IMPACT" | string;
};

function isFitScanPayload(payload: unknown): payload is FitScanPayload {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  const candidate = payload as Partial<FitScanPayload>;
  if (!candidate.fit_scan || typeof candidate.fit_scan !== "object") {
    return false;
  }

  return (
    typeof candidate.fit_scan.id === "string" &&
    typeof candidate.fit_scan.funding_opportunity_id === "string" &&
    typeof candidate.fit_scan.overall_recommendation === "string" &&
    typeof candidate.fit_scan.primary_rationale === "string" &&
    typeof candidate.fit_scan.subscores === "object" &&
    Array.isArray(candidate.fit_scan.risk_flags)
  );
}

export default function FitScanResultPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const fitScanId = params?.id ?? "";

  const [loading, setLoading] = useState(true);
  const [fitScan, setFitScan] = useState<FitScanPayload["fit_scan"] | null>(null);
  const [plan, setPlan] = useState<string | null>(null);
  const [error, setError] = useState<ApiClientError | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!fitScanId) {
        setError(new ApiClientError(404, "Fit Scan not found."));
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const [fitScanResponse, entitlementsResponse] = await Promise.all([
          apiRequest<FitScanPayload>(`/api/fit-scans/${encodeURIComponent(fitScanId)}`, { method: "GET" }),
          apiRequest<EntitlementsPayload>("/api/me/entitlements", { method: "GET" }).catch(() => null),
        ]);

        if (!isFitScanPayload(fitScanResponse)) {
          throw new ApiClientError(
            500,
            "Fit Scan response does not match API_CONTRACT.md shape (missing fit_scan wrapper or required fields).",
          );
        }

        setFitScan(fitScanResponse.fit_scan);
        setPlan(entitlementsResponse?.plan ?? null);
      } catch (loadError) {
        if (loadError instanceof ApiClientError) {
          setError(loadError);
        } else {
          setError(new ApiClientError(500, "We couldn't load this Fit Scan right now."));
        }
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [fitScanId]);

  const primaryCta = useMemo(() => {
    if (!fitScan) {
      return null;
    }

    if (fitScan.overall_recommendation === "NOT_RECOMMENDED") {
      return {
        label: "Browse Other Opportunities →",
        href: "https://ngoinfo.org",
        external: true,
      };
    }

    return {
      label:
        fitScan.overall_recommendation === "RECOMMENDED"
          ? "Draft Proposal with GrantPilot AI →"
          : "Review Gaps, Then Draft Proposal →",
      href: `/proposal/new?opportunity_id=${encodeURIComponent(
        fitScan.funding_opportunity_id,
      )}&fit_scan_id=${encodeURIComponent(fitScan.id)}`,
      external: false,
    };
  }, [fitScan]);

  if (loading) {
    return <LoadingSkeleton variant="page" lines={5} />;
  }

  if (error || !fitScan) {
    if (error?.status === 403) {
      return (
        <ErrorDisplay
          message="You don’t have access to this Fit Scan."
          secondaryAction={{ label: "Back to Dashboard", onClick: () => router.push("/dashboard") }}
        />
      );
    }

    if (error?.status === 404) {
      return (
        <ErrorDisplay
          message="Fit Scan not found."
          secondaryAction={{ label: "Back to Dashboard", onClick: () => router.push("/dashboard") }}
        />
      );
    }

    return (
      <ErrorDisplay
        error={error}
        secondaryAction={{ label: "Back to Dashboard", onClick: () => router.push("/dashboard") }}
      />
    );
  }

  return (
    <section className="space-y-6">
      <div className="card space-y-2">
        <h3>Fit Scan Result</h3>
        <p className="text-secondary">
          Fit Scan for: {fitScan.opportunity_title?.trim() ? fitScan.opportunity_title : "Untitled opportunity"}
        </p>
      </div>

      <RecommendationBanner
        recommendation={fitScan.overall_recommendation}
        rationale={fitScan.primary_rationale}
        modelRating={fitScan.model_rating}
      />

      <div className="card space-y-4">
        <h4>Scores</h4>
        <ScoreBar label="Eligibility" score={fitScan.subscores.eligibility} />
        <ScoreBar label="Alignment" score={fitScan.subscores.alignment} />
        <ScoreBar label="Readiness" score={fitScan.subscores.readiness} />
      </div>

      <RiskFlagList riskFlags={fitScan.risk_flags} />

      <div className="card space-y-3">
        {primaryCta ? (
          primaryCta.external ? (
            <a href={primaryCta.href} className="btn-primary inline-flex items-center" target="_blank" rel="noreferrer">
              {primaryCta.label}
            </a>
          ) : (
            <Link href={primaryCta.href} className="btn-primary inline-flex items-center">
              {primaryCta.label}
            </Link>
          )
        ) : null}
        <Link href="/dashboard" className="inline-flex items-center text-sm font-medium text-brand-primary hover:underline">
          Back to Dashboard
        </Link>
      </div>

      {plan === "FREE" ? (
        <div className="card border-brand-border">
          <p className="text-secondary">Free is evaluation-only. Upgrade to check fit for more opportunities.</p>
          <Link href="/billing" className="mt-3 inline-flex items-center text-sm font-semibold text-brand-primary hover:underline">
            View plans and billing
          </Link>
        </div>
      ) : null}
    </section>
  );
}

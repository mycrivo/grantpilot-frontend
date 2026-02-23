"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { GenerationProgress } from "@/components/proposals/GenerationProgress";
import { ErrorDisplay } from "@/components/shared/ErrorDisplay";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { QuotaGate } from "@/components/shared/QuotaGate";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ApiClientError, apiRequest } from "@/lib/api-client";

type Recommendation = "RECOMMENDED" | "APPLY_WITH_CAVEATS" | "NOT_RECOMMENDED";
type Plan = "FREE" | "GROWTH" | "IMPACT";

type FitScanResponse = {
  fit_scan: {
    id: string;
    funding_opportunity_id: string;
    overall_recommendation: Recommendation;
    subscores?: {
      eligibility: number;
      alignment: number;
      readiness: number;
    };
    risk_flags?: Array<{
      risk_type: string;
      severity: "LOW" | "MEDIUM" | "HIGH";
      description: string;
    }>;
  };
};

type EntitlementsResponse = {
  plan?: string;
  entitlements?: {
    proposals?: {
      remaining?: number;
      reset_at?: string | null;
    };
  };
  quotas?: Record<string, { remaining?: number }>;
  period?: {
    resets_at?: string | null;
  };
};

type ProposalCreateResponse = {
  id: string;
  funding_opportunity_id: string;
  status: string;
  created_at: string;
  generation_summary?: Record<string, unknown> | null;
};

type QueryContext = {
  opportunityId: string;
  fitScanId: string;
  opportunityTitle?: string;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string | null) {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

function resolvePlan(value?: string): Plan {
  if (value === "GROWTH" || value === "IMPACT") {
    return value;
  }

  return "FREE";
}

function resolveProposalRemaining(payload: EntitlementsResponse): number | null {
  if (typeof payload.entitlements?.proposals?.remaining === "number") {
    return payload.entitlements.proposals.remaining;
  }

  const directQuota = payload.quotas?.proposals?.remaining;
  if (typeof directQuota === "number") {
    return directQuota;
  }

  const createQuota = payload.quotas?.proposal_create?.remaining;
  if (typeof createQuota === "number") {
    return createQuota;
  }

  return null;
}

function resolveResetDate(payload: EntitlementsResponse): string | undefined {
  const rawDate = payload.entitlements?.proposals?.reset_at ?? payload.period?.resets_at;
  if (!rawDate) {
    return undefined;
  }

  const date = new Date(rawDate);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date.toLocaleDateString();
}

function shortOpportunityId(opportunityId: string) {
  return opportunityId.slice(-8);
}

export default function ProposalNewPage() {
  const router = useRouter();

  const [queryContext, setQueryContext] = useState<QueryContext | null>(null);
  const [isInvalidLink, setIsInvalidLink] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [fitScan, setFitScan] = useState<FitScanResponse["fit_scan"] | null>(null);
  const [plan, setPlan] = useState<Plan>("FREE");
  const [proposalRemaining, setProposalRemaining] = useState<number | null>(null);
  const [resetDate, setResetDate] = useState<string | undefined>(undefined);
  const [freeConfirmed, setFreeConfirmed] = useState(false);

  const [preflightError, setPreflightError] = useState<ApiClientError | null>(null);
  const [generationError, setGenerationError] = useState<ApiClientError | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const opportunityId = params.get("opportunity_id");
    const fitScanId = params.get("fit_scan_id");
    const opportunityTitle = params.get("opportunity_title") ?? undefined;

    if (!isUuid(opportunityId) || !isUuid(fitScanId)) {
      setIsInvalidLink(true);
      setIsLoading(false);
      return;
    }

    const validatedOpportunityId = opportunityId as string;
    const validatedFitScanId = fitScanId as string;

    setQueryContext({
      opportunityId: validatedOpportunityId,
      fitScanId: validatedFitScanId,
      opportunityTitle: opportunityTitle?.trim() ? opportunityTitle.trim() : undefined,
    });
  }, []);

  useEffect(() => {
    if (!queryContext || isInvalidLink) {
      return;
    }

    const loadPreflight = async () => {
      setIsLoading(true);
      setPreflightError(null);

      try {
        const [entitlementsResponse, fitScanResponse] = await Promise.all([
          apiRequest<EntitlementsResponse>("/api/me/entitlements", { method: "GET" }),
          apiRequest<FitScanResponse>(`/api/fit-scans/${encodeURIComponent(queryContext.fitScanId)}`, {
            method: "GET",
          }),
        ]);

        if (!fitScanResponse?.fit_scan?.id) {
          throw new ApiClientError(500, "Fit Scan response is missing required fields.");
        }

        setFitScan(fitScanResponse.fit_scan);
        setPlan(resolvePlan(entitlementsResponse.plan));
        setProposalRemaining(resolveProposalRemaining(entitlementsResponse));
        setResetDate(resolveResetDate(entitlementsResponse));
      } catch (error) {
        if (error instanceof ApiClientError) {
          setPreflightError(error);
        } else {
          setPreflightError(new ApiClientError(500, "We couldn't load proposal preflight details right now."));
        }
      } finally {
        setIsLoading(false);
      }
    };

    void loadPreflight();
  }, [isInvalidLink, queryContext]);

  const canGenerate = useMemo(() => {
    if (plan === "FREE" && !freeConfirmed) {
      return false;
    }

    return true;
  }, [freeConfirmed, plan]);

  const titleLine = queryContext?.opportunityTitle ?? "Funding Opportunity";
  const opportunityIdSuffix = queryContext ? shortOpportunityId(queryContext.opportunityId) : "";
  const proposalAllowed = proposalRemaining === null ? true : proposalRemaining > 0;

  const runGeneration = async () => {
    if (!queryContext) {
      return;
    }

    setGenerationError(null);
    setIsGenerating(true);

    try {
      const payload = await apiRequest<ProposalCreateResponse>("/api/proposals", {
        method: "POST",
        body: JSON.stringify({
          funding_opportunity_id: queryContext.opportunityId,
          fit_scan_id: queryContext.fitScanId,
        }),
      });

      if (!payload?.id || typeof payload.id !== "string") {
        throw new ApiClientError(500, "Proposal create response does not include top-level id.");
      }

      router.replace(`/proposal/${encodeURIComponent(payload.id)}`);
      return;
    } catch (error) {
      if (error instanceof ApiClientError) {
        setGenerationError(error);
      } else {
        setGenerationError(
          new ApiClientError(500, "Something went wrong while generating this proposal. Please try again."),
        );
      }
    } finally {
      setIsGenerating(false);
    }
  };

  if (isInvalidLink) {
    return (
      <ErrorDisplay
        message="Invalid link."
        secondaryAction={{ label: "Back to Dashboard", onClick: () => router.push("/dashboard") }}
      />
    );
  }

  if (isLoading) {
    return <LoadingSkeleton variant="page" lines={6} />;
  }

  if (isGenerating) {
    return <GenerationProgress />;
  }

  if (generationError) {
    return (
      <ErrorDisplay
        title="Generation failed"
        error={generationError}
        fallbackMessage="Something went wrong while generating this proposal. Please try again."
        onRetry={() => void runGeneration()}
        primaryActionLabel="Retry generation"
        secondaryAction={{ label: "Back to Dashboard", onClick: () => router.push("/dashboard") }}
      />
    );
  }

  if (preflightError || !fitScan || !queryContext) {
    if (preflightError?.status === 403) {
      return (
        <ErrorDisplay
          message="You don’t have access to generate a proposal for this request."
          secondaryAction={{ label: "Back to Dashboard", onClick: () => router.push("/dashboard") }}
        />
      );
    }

    if (preflightError?.status === 404) {
      return (
        <ErrorDisplay
          message="Fit Scan not found."
          secondaryAction={{ label: "Back to Dashboard", onClick: () => router.push("/dashboard") }}
        />
      );
    }

    if (preflightError?.status === 422) {
      return (
        <ErrorDisplay
          message="Invalid link."
          secondaryAction={{ label: "Back to Dashboard", onClick: () => router.push("/dashboard") }}
        />
      );
    }

    return (
      <ErrorDisplay
        error={preflightError}
        secondaryAction={{ label: "Back to Dashboard", onClick: () => router.push("/dashboard") }}
      />
    );
  }

  return (
    <section className="space-y-6">
      <div className="card space-y-2">
        <h3>Generate Proposal</h3>
        <p className="text-secondary">Review this fit scan and confirm to start proposal generation.</p>
      </div>

      <div className="card space-y-4">
        <div>
          <h4>{titleLine}</h4>
          <p className="mt-1 text-secondary">Opportunity ID: ...{opportunityIdSuffix}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge
            label={fitScan.overall_recommendation}
            status={fitScan.overall_recommendation}
          />
          <span className="text-secondary">Risk flags: {fitScan.risk_flags?.length ?? 0}</span>
        </div>

        {fitScan.subscores ? (
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-[8px] border border-brand-border p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-text-secondary">
                Eligibility
              </p>
              <p className="mt-1 text-lg font-semibold">{fitScan.subscores.eligibility}</p>
            </div>
            <div className="rounded-[8px] border border-brand-border p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-text-secondary">
                Alignment
              </p>
              <p className="mt-1 text-lg font-semibold">{fitScan.subscores.alignment}</p>
            </div>
            <div className="rounded-[8px] border border-brand-border p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-text-secondary">
                Readiness
              </p>
              <p className="mt-1 text-lg font-semibold">{fitScan.subscores.readiness}</p>
            </div>
          </div>
        ) : null}
      </div>

      <div className="card space-y-4">
        {plan === "FREE" ? (
          <div className="rounded-[8px] border border-brand-warning/30 bg-brand-warning/5 p-4">
            <p className="font-medium text-brand-text-primary">
              This is your one-time evaluation proposal.
            </p>
            <label className="mt-3 flex cursor-pointer items-start gap-2 text-sm text-brand-text-primary">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-brand-border"
                checked={freeConfirmed}
                onChange={(event) => setFreeConfirmed(event.target.checked)}
              />
              <span>I understand.</span>
            </label>
          </div>
        ) : null}

        <QuotaGate
          action="PROPOSAL_CREATE"
          plan={plan}
          isAllowed={proposalAllowed}
          resetDate={resetDate}
          onUpgrade={() => router.push("/billing")}
        >
          <button
            type="button"
            className="btn-primary inline-flex items-center disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!canGenerate}
            onClick={() => void runGeneration()}
          >
            Generate Proposal
          </button>
        </QuotaGate>

        <button
          type="button"
          className="text-sm font-semibold text-brand-primary hover:underline"
          onClick={() => router.push("/dashboard")}
        >
          Back to Dashboard
        </button>
      </div>
    </section>
  );
}

"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/components/auth/AuthProvider";
import { QuotaGate } from "@/components/shared/QuotaGate";
import { ApiClientError, apiRequest } from "@/lib/api-client";
import { storeOpportunityIntent } from "@/lib/auth-intent";

type Plan = "FREE" | "GROWTH" | "IMPACT";

type FundingOpportunityResponse = {
  funding_opportunity: {
    id: string;
    title: string;
    donor_organization: string;
    is_active: boolean;
  };
};

type NgoProfileCompleteness = {
  status: "MISSING" | "DRAFT" | "COMPLETE";
};

type EntitlementsResponse = {
  plan: Plan;
  entitlements: {
    fit_scans: {
      remaining: number;
      reset_at: string | null;
    };
  };
};

type FitScanCreateResponse = {
  fit_scan: {
    id: string;
    funding_opportunity_id: string;
    opportunity_title?: string | null;
  };
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function toDisplayDate(value: string | null) {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date.toLocaleDateString();
}

export default function StartPage() {
  return (
    <Suspense fallback={<StartFallback />}>
      <StartPageClient />
    </Suspense>
  );
}

function StartPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAuth();

  const [loading, setLoading] = useState(true);
  const [creatingFitScan, setCreatingFitScan] = useState(false);
  const [error, setError] = useState<ApiClientError | null>(null);
  const [friendlyError, setFriendlyError] = useState<string | null>(null);
  const [opportunity, setOpportunity] = useState<FundingOpportunityResponse["funding_opportunity"] | null>(null);
  const [plan, setPlan] = useState<Plan>("FREE");
  const [fitScanAllowed, setFitScanAllowed] = useState(true);
  const [fitScanResetDate, setFitScanResetDate] = useState<string | undefined>(undefined);
  const [opportunityId, setOpportunityId] = useState<string | null>(null);

  useEffect(() => {
    const rawOpportunityId = searchParams.get("opportunity_id");
    if (!rawOpportunityId || !UUID_PATTERN.test(rawOpportunityId)) {
      setFriendlyError("This link is invalid. Please return to NGOInfo.org and choose a valid opportunity.");
      setLoading(false);
      return;
    }

    setOpportunityId(rawOpportunityId);
  }, [searchParams]);

  useEffect(() => {
    if (!opportunityId || !isAuthenticated) {
      return;
    }

    const runStartFlow = async () => {
      setLoading(true);
      setError(null);
      setFriendlyError(null);

      try {
        const [opportunityResponse, completeness, entitlements] = await Promise.all([
          apiRequest<FundingOpportunityResponse>(`/api/funding-opportunities/${encodeURIComponent(opportunityId)}`, {
            method: "GET",
          }),
          apiRequest<NgoProfileCompleteness>("/api/ngo-profile/completeness", { method: "GET" }),
          apiRequest<EntitlementsResponse>("/api/me/entitlements", { method: "GET" }),
        ]);

        const opportunityPayload = opportunityResponse.funding_opportunity;
        setOpportunity(opportunityPayload);

        if (!opportunityPayload.is_active) {
          setFriendlyError("This opportunity is no longer active. Explore other opportunities on NGOInfo.org.");
          return;
        }

        if (completeness.status !== "COMPLETE") {
          router.replace(`/profile?from=start&opportunity_id=${encodeURIComponent(opportunityId)}`);
          return;
        }

        setPlan(entitlements.plan);
        setFitScanAllowed(entitlements.entitlements.fit_scans.remaining > 0);
        setFitScanResetDate(toDisplayDate(entitlements.entitlements.fit_scans.reset_at));

        if (entitlements.entitlements.fit_scans.remaining <= 0) {
          return;
        }

        setCreatingFitScan(true);
        const fitScanResponse = await apiRequest<FitScanCreateResponse>("/api/fit-scans", {
          method: "POST",
          body: JSON.stringify({ funding_opportunity_id: opportunityId }),
        });

        router.replace(`/fit-scan/${encodeURIComponent(fitScanResponse.fit_scan.id)}`);
      } catch (caughtError) {
        if (caughtError instanceof ApiClientError) {
          if (caughtError.status === 404 && caughtError.errorCode === "OPPORTUNITY_NOT_FOUND") {
            setFriendlyError("We couldn't find that opportunity. Please return to NGOInfo.org and try another link.");
          } else {
            setError(caughtError);
          }
          return;
        }

        setError(new ApiClientError(500, "We couldn't start your fit check right now."));
      } finally {
        setCreatingFitScan(false);
        setLoading(false);
      }
    };

    void runStartFlow();
  }, [isAuthenticated, opportunityId, router]);

  useEffect(() => {
    if (!opportunityId || isAuthenticated) {
      return;
    }

    storeOpportunityIntent(opportunityId);
    const nextPath = `/start?opportunity_id=${encodeURIComponent(opportunityId)}`;
    router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
  }, [isAuthenticated, opportunityId, router]);

  const titleText = useMemo(() => {
    if (!opportunity) {
      return "Validating opportunity...";
    }
    return opportunity.title;
  }, [opportunity]);

  if (loading || creatingFitScan) {
    return (
      <section className="space-y-6">
        <div className="card space-y-2">
          <h3>Checking your fit...</h3>
          <p className="text-secondary">
            {creatingFitScan
              ? "Running your Fit Scan now. This can take up to 30 seconds."
              : "Validating opportunity context and profile readiness."}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="card space-y-2">
        <h3>Start Fit Check</h3>
        <p className="text-secondary">{titleText}</p>
        {opportunity?.donor_organization ? (
          <p className="text-sm text-brand-text-secondary">Donor: {opportunity.donor_organization}</p>
        ) : null}
      </div>

      {friendlyError ? (
        <div className="card border-brand-warning/30 bg-brand-warning/5">
          <p className="text-brand-text-primary">{friendlyError}</p>
          <a
            className="mt-3 inline-flex items-center text-sm font-semibold text-brand-primary hover:underline"
            href="https://ngoinfo.org"
            target="_blank"
            rel="noreferrer"
          >
            Browse opportunities on NGOInfo.org
          </a>
        </div>
      ) : null}

      {error ? (
        <div className="card border-brand-error/30 bg-brand-error/5">
          <p className="text-brand-text-primary">{error.message}</p>
        </div>
      ) : null}

      {!friendlyError && !error ? (
        <QuotaGate
          action="FIT_SCAN"
          plan={plan}
          isAllowed={fitScanAllowed}
          resetDate={fitScanResetDate}
          onUpgrade={() => router.push("/billing")}
        >
          <div className="card">
            <p className="text-secondary">Fit scan in progress...</p>
          </div>
        </QuotaGate>
      ) : null}

      <Link href="/dashboard" className="inline-flex items-center text-sm font-semibold text-brand-primary hover:underline">
        Back to Dashboard
      </Link>
    </section>
  );
}

function StartFallback() {
  return (
    <section className="space-y-6">
      <div className="card space-y-2">
        <h3>Start Fit Check</h3>
        <p className="text-secondary">Loading opportunity context...</p>
      </div>
    </section>
  );
}


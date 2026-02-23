"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/components/auth/AuthProvider";
import { ErrorDisplay } from "@/components/shared/ErrorDisplay";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { ApiClientError, apiRequest } from "@/lib/api-client";
import { storeOpportunityIntent } from "@/lib/auth-intent";

type Plan = "FREE" | "GROWTH" | "IMPACT";
type StartStep = "parse" | "auth" | "opportunity" | "completeness" | "quota" | "create_fit_scan";

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
  };
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isFundingOpportunityResponse(payload: unknown): payload is FundingOpportunityResponse {
  if (!payload || typeof payload !== "object") {
    return false;
  }
  const candidate = payload as Partial<FundingOpportunityResponse>;
  const node = candidate.funding_opportunity;
  if (!node || typeof node !== "object") {
    return false;
  }
  return (
    typeof node.id === "string" &&
    typeof node.title === "string" &&
    typeof node.donor_organization === "string" &&
    typeof node.is_active === "boolean"
  );
}

function loadingMessage(step: StartStep, title: string | null) {
  if (step === "opportunity") {
    return "Validating opportunity details...";
  }
  if (step === "completeness") {
    return "Checking your profile completeness...";
  }
  if (step === "quota") {
    return "Checking your Fit Scan quota...";
  }
  if (step === "create_fit_scan") {
    return title ? `Checking your fit for ${title}...` : "Checking your fit...";
  }
  if (step === "auth") {
    return "Redirecting you to login...";
  }
  return "Preparing your start flow...";
}

export default function StartPage() {
  return (
    <Suspense fallback={<StartLoading step="parse" title={null} />}>
      <StartPageClient />
    </Suspense>
  );
}

function StartPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAuth();

  const [step, setStep] = useState<StartStep>("parse");
  const [opportunityId, setOpportunityId] = useState<string | null>(null);
  const [opportunityTitle, setOpportunityTitle] = useState<string | null>(null);
  const [donorName, setDonorName] = useState<string | null>(null);
  const [quotaBlocked, setQuotaBlocked] = useState(false);
  const [plan, setPlan] = useState<Plan>("FREE");
  const [retryNonce, setRetryNonce] = useState(0);
  const [invalidLink, setInvalidLink] = useState(false);
  const [unavailableOpportunity, setUnavailableOpportunity] = useState(false);
  const [fatalError, setFatalError] = useState<string | null>(null);

  useEffect(() => {
    const raw = searchParams.get("opportunity_id");
    if (!raw || !UUID_PATTERN.test(raw)) {
      setInvalidLink(true);
      setOpportunityId(null);
      return;
    }
    setInvalidLink(false);
    setOpportunityId(raw);
  }, [searchParams]);

  const startFlow = useCallback(async () => {
    if (!opportunityId) {
      return;
    }

    setFatalError(null);
    setUnavailableOpportunity(false);
    setQuotaBlocked(false);
    setStep("opportunity");

    try {
      const opportunityPayload = await apiRequest<unknown>(
        `/api/funding-opportunities/${encodeURIComponent(opportunityId)}`,
        { method: "GET" },
      );

      if (!isFundingOpportunityResponse(opportunityPayload)) {
        throw new ApiClientError(
          500,
          "STOP: GET /api/funding-opportunities/{id} returned an unexpected response shape.",
        );
      }

      if (!opportunityPayload.funding_opportunity.is_active) {
        setUnavailableOpportunity(true);
        return;
      }

      setOpportunityTitle(opportunityPayload.funding_opportunity.title);
      setDonorName(opportunityPayload.funding_opportunity.donor_organization);

      setStep("completeness");
      const completeness = await apiRequest<NgoProfileCompleteness>("/api/ngo-profile/completeness", { method: "GET" });
      if (completeness.status === "MISSING" || completeness.status === "DRAFT") {
        router.replace(
          `/profile?from=start&opportunity_id=${encodeURIComponent(opportunityId)}&message=${encodeURIComponent(
            "Complete your profile to run your Fit Scan.",
          )}`,
        );
        return;
      }

      setStep("quota");
      const entitlements = await apiRequest<EntitlementsResponse>("/api/me/entitlements", { method: "GET" });
      setPlan(entitlements.plan);
      if (entitlements.entitlements.fit_scans.remaining <= 0) {
        setQuotaBlocked(true);
        return;
      }

      setStep("create_fit_scan");
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 30000);
      try {
        const fitScan = await apiRequest<FitScanCreateResponse>(
          "/api/fit-scans",
          {
            method: "POST",
            body: JSON.stringify({ funding_opportunity_id: opportunityId }),
            signal: controller.signal,
          },
          { auth: true, retryOn401: true },
        );
        router.replace(`/fit-scan/${encodeURIComponent(fitScan.fit_scan.id)}`);
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          setFatalError("Something went wrong. Please try again.");
          return;
        }
        throw error;
      } finally {
        window.clearTimeout(timeoutId);
      }
    } catch (error) {
      if (error instanceof ApiClientError) {
        if (error.status === 404 && error.errorCode === "OPPORTUNITY_NOT_FOUND") {
          setUnavailableOpportunity(true);
          return;
        }
        if (error.status === 409 && error.errorCode === "PROFILE_INCOMPLETE") {
          router.replace(`/profile?from=start&opportunity_id=${encodeURIComponent(opportunityId)}`);
          return;
        }
        if (error.status === 429 && error.errorCode === "QUOTA_EXCEEDED") {
          setQuotaBlocked(true);
          return;
        }
      }
      setFatalError("Something went wrong. Please try again.");
    }
  }, [opportunityId, router]);

  useEffect(() => {
    if (invalidLink || !opportunityId) {
      return;
    }
    if (!isAuthenticated) {
      setStep("auth");
      storeOpportunityIntent(opportunityId);
      router.replace(`/login?next=${encodeURIComponent(`/start?opportunity_id=${opportunityId}`)}`);
      return;
    }
    void startFlow();
  }, [invalidLink, isAuthenticated, opportunityId, retryNonce, router, startFlow]);

  const headerContext = useMemo(() => {
    if (!opportunityTitle || !donorName) {
      return null;
    }
    return `${opportunityTitle} — ${donorName}`;
  }, [donorName, opportunityTitle]);

  if (invalidLink) {
    return (
      <section className="space-y-6">
        <ErrorDisplay message="This opportunity link is invalid. Browse opportunities on NGOInfo.org." />
        <a href="https://ngoinfo.org" target="_blank" rel="noreferrer" className="btn-primary inline-flex items-center">
          Browse opportunities on NGOInfo.org
        </a>
      </section>
    );
  }

  if (unavailableOpportunity) {
    return (
      <section className="space-y-6">
        <HeaderCard context={headerContext} />
        <ErrorDisplay message="This opportunity is no longer available." />
        <a href="https://ngoinfo.org" target="_blank" rel="noreferrer" className="btn-primary inline-flex items-center">
          Browse opportunities on NGOInfo.org
        </a>
      </section>
    );
  }

  if (quotaBlocked) {
    return (
      <section className="space-y-6">
        <HeaderCard context={headerContext} />
        <div className="card border-brand-warning/30 bg-brand-warning/5">
          <h4>Fit Scan quota reached</h4>
          <p className="mt-2 text-secondary">
            You have no Fit Scans remaining on your {plan} plan right now. Upgrade to continue.
          </p>
          <Link href="/billing" className="btn-primary mt-4 inline-flex items-center">
            View plans and billing
          </Link>
        </div>
      </section>
    );
  }

  if (fatalError) {
    return (
      <section className="space-y-6">
        <HeaderCard context={headerContext} />
        <ErrorDisplay message={fatalError} />
        <button type="button" className="btn-primary inline-flex items-center" onClick={() => setRetryNonce((v) => v + 1)}>
          Retry
        </button>
      </section>
    );
  }

  return <StartLoading step={step} title={opportunityTitle} context={headerContext} />;
}

function HeaderCard({ context }: { context?: string | null }) {
  return (
    <div className="card">
      <h3>Start Fit Check</h3>
      {context ? <p className="mt-2 text-secondary">{context}</p> : null}
    </div>
  );
}

function StartLoading({ step, title, context }: { step: StartStep; title: string | null; context?: string | null }) {
  return (
    <section className="space-y-6">
      <HeaderCard context={context} />
      <LoadingSkeleton lines={3} />
      <div className="card">
        <p className="text-secondary">{loadingMessage(step, title)}</p>
      </div>
    </section>
  );
}


"use client";

import Link from "next/link";
import { useState } from "react";

import { ApiClientError, apiRequest } from "@/lib/api-client";
import { PLAN_DETAILS, type ExhaustedResource, type PaidPlan } from "@/lib/plans";

import { ErrorDisplay } from "./ErrorDisplay";

type CheckoutResponse = { checkout_url: string };

type UpgradeWallProps = {
  currentOpportunityTitle: string | null;
  previousOpportunityTitle: string | null;
  exhaustedResource: ExhaustedResource;
  checkoutIntentOpportunityId?: string | null;
};

export function UpgradeWall({
  currentOpportunityTitle,
  previousOpportunityTitle,
  exhaustedResource,
  checkoutIntentOpportunityId = null,
}: UpgradeWallProps) {
  const [activePlan, setActivePlan] = useState<PaidPlan | null>(null);
  const [actionError, setActionError] = useState<ApiClientError | null>(null);

  const runCheckout = async (plan: PaidPlan) => {
    setActionError(null);
    setActivePlan(plan);
    try {
      if (checkoutIntentOpportunityId && typeof window !== "undefined") {
        window.sessionStorage.setItem("gp_checkout_intent", checkoutIntentOpportunityId);
      }
      const payload = await apiRequest<CheckoutResponse>("/api/billing/checkout", {
        method: "POST",
        body: JSON.stringify({ plan }),
      });
      if (!payload.checkout_url) {
        throw new ApiClientError(500, "STOP: checkout response missing checkout_url.");
      }
      window.location.href = payload.checkout_url;
    } catch (error) {
      setActionError(
        error instanceof ApiClientError ? error : new ApiClientError(500, "Something went wrong. Please try again."),
      );
    } finally {
      setActivePlan(null);
    }
  };

  const exhaustedLabel = exhaustedResource === "fit_scans" ? "Fit Scan" : "proposal";

  return (
    <section className="mx-auto max-w-5xl space-y-6">
      <div className="card space-y-3 border-brand-warning/30 bg-brand-warning/5">
        <h2 className="text-2xl font-semibold text-brand-text-primary">You&apos;ve used your free evaluation</h2>
        {previousOpportunityTitle ? (
          <p className="text-secondary">
            You ran a Fit Scan for <span className="font-semibold text-brand-text-primary">{previousOpportunityTitle}</span>{" "}
            and generated a full proposal draft.
          </p>
        ) : null}
        <p className="text-secondary">
          {currentOpportunityTitle
            ? `To check your fit for ${currentOpportunityTitle}, choose a plan:`
            : "To continue using GrantPilot, choose a plan:"}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-[8px] border border-brand-border bg-white p-5">
          <h4>{PLAN_DETAILS.GROWTH.marketingName}</h4>
          <p className="mt-1 text-secondary">{PLAN_DETAILS.GROWTH.priceLabel}</p>
          <ul className="mt-4 space-y-2 text-sm text-secondary">
            <li>{PLAN_DETAILS.GROWTH.fitScansLimit} Fit Scans/month</li>
            <li>{PLAN_DETAILS.GROWTH.proposalsLimit} Proposals/month</li>
            <li>{PLAN_DETAILS.GROWTH.regenerationsPerProposal} Regenerations/proposal</li>
          </ul>
          <button
            type="button"
            className="btn-primary mt-5 w-full disabled:cursor-not-allowed disabled:opacity-60"
            disabled={activePlan !== null}
            onClick={() => void runCheckout("GROWTH")}
          >
            {activePlan === "GROWTH" ? "Redirecting..." : "Start Growth"}
          </button>
        </div>

        <div className="rounded-[8px] border border-brand-primary bg-brand-primary/5 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-primary">★ Recommended</p>
          <h4 className="mt-1">{PLAN_DETAILS.IMPACT.marketingName}</h4>
          <p className="mt-1 text-secondary">{PLAN_DETAILS.IMPACT.priceLabel}</p>
          <ul className="mt-4 space-y-2 text-sm text-secondary">
            <li>{PLAN_DETAILS.IMPACT.fitScansLimit} Fit Scans/month</li>
            <li>{PLAN_DETAILS.IMPACT.proposalsLimit} Proposals/month</li>
            <li>{PLAN_DETAILS.IMPACT.regenerationsPerProposal} Regenerations/proposal</li>
          </ul>
          <button
            type="button"
            className="btn-primary mt-5 w-full disabled:cursor-not-allowed disabled:opacity-60"
            disabled={activePlan !== null}
            onClick={() => void runCheckout("IMPACT")}
          >
            {activePlan === "IMPACT" ? "Redirecting..." : "Start Impact"}
          </button>
        </div>
      </div>

      {actionError ? <ErrorDisplay error={actionError} /> : null}

      <div className="text-sm text-secondary">
        <p className="mb-2">Need more {exhaustedLabel}s? Choose a plan to continue.</p>
        <Link href="/dashboard" className="font-semibold text-brand-text-secondary hover:text-brand-primary hover:underline">
          View your existing work →
        </Link>
      </div>
    </section>
  );
}


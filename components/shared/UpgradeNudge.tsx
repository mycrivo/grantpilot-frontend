"use client";

import { useState } from "react";

import { ApiClientError, apiRequest } from "@/lib/api-client";
import { PLAN_DETAILS, resourceLabel, type ExhaustedResource } from "@/lib/plans";

import { ErrorDisplay } from "./ErrorDisplay";

type CheckoutResponse = { checkout_url: string };

type UpgradeNudgeProps = {
  exhaustedResource: ExhaustedResource;
  resetAt: string;
  currentOpportunityTitle: string | null;
};

function formatDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleDateString();
}

export function UpgradeNudge({ exhaustedResource, resetAt, currentOpportunityTitle }: UpgradeNudgeProps) {
  const [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState<ApiClientError | null>(null);

  const resourceName = resourceLabel(exhaustedResource);
  const resourceLimit =
    exhaustedResource === "fit_scans" ? PLAN_DETAILS.GROWTH.fitScansLimit : PLAN_DETAILS.GROWTH.proposalsLimit;
  const formattedDate = formatDate(resetAt);

  const runUpgrade = async () => {
    setActionError(null);
    setLoading(true);
    try {
      const payload = await apiRequest<CheckoutResponse>("/api/billing/checkout", {
        method: "POST",
        body: JSON.stringify({ plan: "IMPACT" }),
      });
      if (!payload.checkout_url) {
        throw new ApiClientError(500, "STOP: checkout response missing checkout_url.");
      }
      window.location.href = payload.checkout_url;
    } catch (error) {
      setActionError(
        error instanceof ApiClientError ? error : new ApiClientError(500, "Something went wrong. Please try again."),
      );
      setLoading(false);
    }
  };

  return (
    <div className="card space-y-4 border-brand-warning/30 bg-brand-warning/5">
      <h4>
        You&apos;ve used all {resourceLimit} {resourceName} this month
      </h4>
      <p className="text-secondary">
        Your {resourceName} reset on {formattedDate}. Need more capacity now?
      </p>
      {currentOpportunityTitle ? (
        <p className="text-sm text-secondary">Current opportunity: {currentOpportunityTitle}</p>
      ) : null}

      <div className="rounded-[8px] border border-brand-border bg-white p-4">
        <p className="font-semibold">Upgrade to Impact — {PLAN_DETAILS.IMPACT.priceLabel}</p>
        <p className="mt-1 text-sm text-secondary">
          {PLAN_DETAILS.IMPACT.proposalsLimit} proposals/month + {PLAN_DETAILS.IMPACT.fitScansLimit} fit scans
        </p>
        <button
          type="button"
          className="btn-primary mt-4 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={loading}
          onClick={() => void runUpgrade()}
        >
          {loading ? "Redirecting..." : "Upgrade Now"}
        </button>
      </div>

      <p className="text-sm text-secondary">Or wait for your reset on {formattedDate}.</p>
      {actionError ? <ErrorDisplay error={actionError} /> : null}
    </div>
  );
}


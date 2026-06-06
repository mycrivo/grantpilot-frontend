"use client";

import { useEffect, useMemo, useState } from "react";

import { PlanCard } from "@/components/billing/PlanCard";
import { QuotaOverview } from "@/components/dashboard/QuotaOverview";
import { ErrorDisplay } from "@/components/shared/ErrorDisplay";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import type { EntitlementsResponse } from "@/lib/api/entitlements";
import { ApiClientError, apiRequest } from "@/lib/api-client";
import { PLAN_DETAILS } from "@/lib/plans";

type CheckoutResponse = { checkout_url: string };
type PortalResponse = { portal_url: string };

export default function BillingPage() {
  const [loading, setLoading] = useState(true);
  const [entitlements, setEntitlements] = useState<EntitlementsResponse | null>(null);
  const [loadError, setLoadError] = useState<ApiClientError | null>(null);
  const [actionError, setActionError] = useState<ApiClientError | null>(null);
  const [activeCheckoutPlan, setActiveCheckoutPlan] = useState<"GROWTH" | "IMPACT" | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const payload = await apiRequest<EntitlementsResponse>("/api/me/entitlements", { method: "GET" });
        setEntitlements(payload);
      } catch (error) {
        setLoadError(
          error instanceof ApiClientError ? error : new ApiClientError(500, "Failed to load billing details."),
        );
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const planLabel = useMemo(() => {
    if (!entitlements) {
      return "Plan";
    }
    return entitlements.plan === "FREE"
      ? PLAN_DETAILS.FREE.label
      : entitlements.plan === "GROWTH"
        ? PLAN_DETAILS.GROWTH.label
        : PLAN_DETAILS.IMPACT.label;
  }, [entitlements]);

  const runCheckout = async (plan: "GROWTH" | "IMPACT") => {
    setActionError(null);
    setActiveCheckoutPlan(plan);
    try {
      const payload = await apiRequest<CheckoutResponse>("/api/billing/checkout", {
        method: "POST",
        body: JSON.stringify({ plan }),
      });
      if (!payload.checkout_url) {
        throw new ApiClientError(500, "STOP: checkout response missing checkout_url.");
      }
      window.location.href = payload.checkout_url;
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 409) {
        setActionError(new ApiClientError(409, "You already have an active subscription."));
      } else {
        setActionError(
          error instanceof ApiClientError
            ? error
            : new ApiClientError(500, "Something went wrong. Please try again."),
        );
      }
    } finally {
      setActiveCheckoutPlan(null);
    }
  };

  const openPortal = async () => {
    setActionError(null);
    setPortalLoading(true);
    try {
      const payload = await apiRequest<PortalResponse>("/api/billing/portal", { method: "GET" });
      if (!payload.portal_url) {
        throw new ApiClientError(500, "STOP: billing portal response missing portal_url.");
      }
      window.open(payload.portal_url, "_blank", "noopener,noreferrer");
    } catch (error) {
      setActionError(
        error instanceof ApiClientError ? error : new ApiClientError(500, "Something went wrong. Please try again."),
      );
    } finally {
      setPortalLoading(false);
    }
  };

  if (loading) {
    return <LoadingSkeleton variant="page" lines={6} />;
  }

  if (loadError || !entitlements) {
    return <ErrorDisplay title="Billing unavailable" error={loadError} />;
  }

  const isFreePlan = entitlements.plan === "FREE";

  return (
    <section className="space-y-6">
      <div className="card space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3>Plans &amp; Billing</h3>
          <StatusBadge
            label={planLabel}
            tone={entitlements.plan === "FREE" ? "neutral" : entitlements.plan === "GROWTH" ? "warning" : "success"}
          />
        </div>
      </div>

      <QuotaOverview payload={entitlements} />

      {actionError ? <ErrorDisplay error={actionError} /> : null}

      {isFreePlan ? (
        <div className="card space-y-4">
          <h4>Choose your plan</h4>
          <div className="grid gap-4 md:grid-cols-2">
            <PlanCard
              title={PLAN_DETAILS.GROWTH.marketingName}
              price={PLAN_DETAILS.GROWTH.priceLabel}
              fitScans={`${PLAN_DETAILS.GROWTH.fitScansLimit}/month`}
              proposals={`${PLAN_DETAILS.GROWTH.proposalsLimit}/month`}
              regenerations={`${PLAN_DETAILS.GROWTH.regenerationsPerProposal} per proposal`}
              meReports={PLAN_DETAILS.GROWTH.meReportsLabel}
              buttonLabel="Upgrade to Growth"
              loading={activeCheckoutPlan === "GROWTH"}
              disabled={activeCheckoutPlan !== null}
              onClick={() => void runCheckout("GROWTH")}
            />
            <PlanCard
              title={PLAN_DETAILS.IMPACT.marketingName}
              price={PLAN_DETAILS.IMPACT.priceLabel}
              fitScans={`${PLAN_DETAILS.IMPACT.fitScansLimit}/month`}
              proposals={`${PLAN_DETAILS.IMPACT.proposalsLimit}/month`}
              regenerations={`${PLAN_DETAILS.IMPACT.regenerationsPerProposal} per proposal`}
              meReports={PLAN_DETAILS.IMPACT.donorReportsLabel}
              prioritySupport={PLAN_DETAILS.IMPACT.prioritySupportLabel}
              buttonLabel="Upgrade to Impact"
              loading={activeCheckoutPlan === "IMPACT"}
              disabled={activeCheckoutPlan !== null}
              onClick={() => void runCheckout("IMPACT")}
            />
          </div>
        </div>
      ) : (
        <div className="card space-y-3">
          <h4>Manage subscription</h4>
          <p className="text-secondary">
            Manage invoices, payment methods, and cancellation in Stripe&apos;s secure customer portal.
          </p>
          <button
            type="button"
            className="btn-primary inline-flex items-center disabled:cursor-not-allowed disabled:opacity-60"
            onClick={() => void openPortal()}
            disabled={portalLoading}
          >
            {portalLoading ? "Opening..." : "Manage Billing \u2192"}
          </button>
        </div>
      )}
    </section>
  );
}

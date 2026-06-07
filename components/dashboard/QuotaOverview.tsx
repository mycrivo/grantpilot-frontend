"use client";

import Link from "next/link";

import { StatusBadge } from "@/components/shared/StatusBadge";
import type { EntitlementQuotaBlock, EntitlementsResponse } from "@/lib/api/entitlements";
import { isMeModuleEnabled } from "@/lib/me-module";
import { PLAN_DETAILS, type Plan } from "@/lib/plans";

type QuotaOverviewProps = {
  payload: EntitlementsResponse;
};

function toPercent(used: number, limit: number) {
  if (!Number.isFinite(used) || !Number.isFinite(limit)) {
    return 0;
  }
  if (limit <= 0) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round((used / limit) * 100)));
}

function usageLabel(quota: EntitlementQuotaBlock) {
  if (!Number.isFinite(quota.used) || !Number.isFinite(quota.limit)) {
    return "—";
  }
  return `${quota.remaining} / ${quota.limit} remaining`;
}

function relativeResetLabel(resetAt: string | null) {
  if (!resetAt) {
    return "Reset date unavailable";
  }
  const target = new Date(resetAt);
  if (Number.isNaN(target.getTime())) {
    return "Reset date unavailable";
  }
  const now = Date.now();
  const diffDays = Math.ceil((target.getTime() - now) / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) {
    return "Resets today";
  }
  if (diffDays === 1) {
    return "Resets in 1 day";
  }
  return `Resets in ${diffDays} days`;
}

function PlanBadge({ plan }: { plan: Plan }) {
  const label = plan === "FREE" ? PLAN_DETAILS.FREE.label : plan === "GROWTH" ? PLAN_DETAILS.GROWTH.label : PLAN_DETAILS.IMPACT.label;
  const tone = plan === "FREE" ? "neutral" : plan === "GROWTH" ? "warning" : "success";
  return <StatusBadge label={label} tone={tone} />;
}

function QuotaBar({
  title,
  quota,
  plan,
}: {
  title: string;
  quota: EntitlementQuotaBlock;
  plan: Plan;
}) {
  const percent = toPercent(quota.used, quota.limit);
  const resetLabel = quota.period === "LIFETIME" ? "Lifetime" : relativeResetLabel(quota.reset_at);

  const isExhausted = quota.remaining <= 0;
  const showFreeCta = isExhausted && plan === "FREE";
  const showGrowthCta = isExhausted && plan === "GROWTH";
  const showImpactNotice = isExhausted && plan === "IMPACT";

  return (
    <div className="rounded-[8px] border border-brand-border p-4">
      <div className="flex items-center justify-between gap-2">
        <h4>{title}</h4>
        <span className="text-sm text-secondary">
          {usageLabel(quota)}
        </span>
      </div>
      <div className="mt-3 h-2 rounded-full bg-brand-divider">
        <div className="h-2 rounded-full bg-brand-primary" style={{ width: `${percent}%` }} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-secondary">
        <span>{resetLabel}</span>
      </div>
      {showFreeCta ? (
        <p className="mt-3 text-sm text-secondary">
          You&apos;ve used your free evaluation.{" "}
          <Link href="/billing" className="font-semibold text-brand-primary hover:underline">
            Upgrade to keep going →
          </Link>
        </p>
      ) : null}
      {showGrowthCta ? (
        <p className="mt-3 text-sm text-secondary">
          {resetLabel}. Need more?{" "}
          <Link href="/billing" className="font-semibold text-brand-primary hover:underline">
            Upgrade to Impact →
          </Link>
        </p>
      ) : null}
      {showImpactNotice ? <p className="mt-3 text-sm text-secondary">{resetLabel}.</p> : null}
    </div>
  );
}

export function QuotaOverview({ payload }: QuotaOverviewProps) {
  const showReportsBar = isMeModuleEnabled() && payload.entitlements.reports.limit > 0;

  return (
    <section className="card space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3>Quota Overview</h3>
        <PlanBadge plan={payload.plan} />
      </div>
      <div className={`grid gap-4 ${showReportsBar ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
        <QuotaBar title="Fit Scans" quota={payload.entitlements.fit_scans} plan={payload.plan} />
        <QuotaBar title="Proposals" quota={payload.entitlements.proposals} plan={payload.plan} />
        {showReportsBar ? (
          <QuotaBar title="M&E Reports" quota={payload.entitlements.reports} plan={payload.plan} />
        ) : null}
      </div>
    </section>
  );
}

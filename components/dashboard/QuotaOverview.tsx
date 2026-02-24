"use client";

import Link from "next/link";

import { StatusBadge } from "@/components/shared/StatusBadge";

type Plan = "FREE" | "GROWTH" | "IMPACT";

type QuotaBlock = {
  limit: number;
  used: number;
  remaining: number;
  period: "LIFETIME" | "BILLING_CYCLE";
  reset_at: string | null;
};

type Entitlements = {
  plan: Plan;
  entitlements: {
    fit_scans: QuotaBlock;
    proposals: QuotaBlock;
  };
};

type QuotaOverviewProps = {
  payload: Entitlements;
};

function toPercent(used: number, limit: number) {
  if (limit <= 0) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round((used / limit) * 100)));
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
  const label = plan === "FREE" ? "Free Plan" : plan === "GROWTH" ? "Growth Plan" : "Impact Plan";
  const tone = plan === "FREE" ? "neutral" : plan === "GROWTH" ? "warning" : "success";
  return <StatusBadge label={label} tone={tone} />;
}

function QuotaBar({
  title,
  quota,
  plan,
}: {
  title: string;
  quota: QuotaBlock;
  plan: Plan;
}) {
  const percent = toPercent(quota.used, quota.limit);
  const resetLabel = quota.period === "LIFETIME" ? "Lifetime" : relativeResetLabel(quota.reset_at);

  const showUpgrade = quota.remaining <= 0 && (plan === "FREE" || plan === "GROWTH");
  const upgradeText =
    plan === "FREE" ? "Upgrade to Growth \u2192" : "Upgrade to Impact for more \u2192";

  return (
    <div className="rounded-[8px] border border-brand-border p-4">
      <div className="flex items-center justify-between gap-2">
        <h4>{title}</h4>
        <span className="text-sm text-secondary">
          {quota.used} / {quota.limit} used
        </span>
      </div>
      <div className="mt-3 h-2 rounded-full bg-brand-divider">
        <div className="h-2 rounded-full bg-brand-primary" style={{ width: `${percent}%` }} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-secondary">
        <span>{resetLabel}</span>
        {showUpgrade ? (
          <Link href="/billing" className="font-semibold text-brand-primary hover:underline">
            {upgradeText}
          </Link>
        ) : null}
      </div>
    </div>
  );
}

export function QuotaOverview({ payload }: QuotaOverviewProps) {
  return (
    <section className="card space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3>Quota Overview</h3>
        <PlanBadge plan={payload.plan} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <QuotaBar title="Fit Scans" quota={payload.entitlements.fit_scans} plan={payload.plan} />
        <QuotaBar title="Proposals" quota={payload.entitlements.proposals} plan={payload.plan} />
      </div>
    </section>
  );
}

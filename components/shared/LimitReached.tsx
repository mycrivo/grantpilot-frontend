import Link from "next/link";

import { PLAN_DETAILS, resourceLabel, type ExhaustedResource } from "@/lib/plans";

type LimitReachedProps = {
  exhaustedResource: ExhaustedResource;
  resetAt: string;
};

function formatDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleDateString();
}

export function LimitReached({ exhaustedResource, resetAt }: LimitReachedProps) {
  const resourceName = resourceLabel(exhaustedResource);
  const resourceLimit =
    exhaustedResource === "fit_scans" ? PLAN_DETAILS.IMPACT.fitScansLimit : PLAN_DETAILS.IMPACT.proposalsLimit;
  const formattedDate = formatDate(resetAt);

  return (
    <div className="card space-y-3 border-brand-border">
      <h4>
        You&apos;ve used all {resourceLimit} {resourceName} this month
      </h4>
      <p className="text-secondary">Your quota resets on {formattedDate}.</p>
      <p className="text-secondary">
        Need higher limits? Contact us at{" "}
        <a className="font-semibold text-brand-primary hover:underline" href="mailto:hello@ngoinfo.org">
          hello@ngoinfo.org
        </a>
      </p>
      <Link href="/dashboard" className="btn-primary inline-flex w-fit items-center">
        Back to Dashboard
      </Link>
    </div>
  );
}


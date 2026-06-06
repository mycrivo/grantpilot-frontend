import Link from "next/link";

import { resourceLabel, type ExhaustedResource } from "@/lib/plans";

type LimitReachedProps = {
  exhaustedResource: ExhaustedResource;
  resetAt: string;
  /** Live limit from GET /api/me/entitlements for the exhausted resource. */
  resourceLimit?: number;
};

function formatDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleDateString();
}

export function LimitReached({ exhaustedResource, resetAt, resourceLimit }: LimitReachedProps) {
  const resourceName = resourceLabel(exhaustedResource);
  const formattedDate = formatDate(resetAt);
  const headline =
    resourceLimit !== undefined
      ? `You've used all ${resourceLimit} ${resourceName} this month`
      : `You've used all your ${resourceName} this month`;

  return (
    <div className="card space-y-3 border-brand-border">
      <h4>{headline}</h4>
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

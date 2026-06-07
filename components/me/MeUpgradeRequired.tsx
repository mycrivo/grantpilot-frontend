import Link from "next/link";

import { ME_UPGRADE_REQUIRED } from "@/lib/me-enums";
import { PLAN_DETAILS } from "@/lib/plans";

/** API_CONTRACT.md §10.3 — presentational Impact-only M&E upgrade gate (not mounted in B-02). */
export type MeUpgradeRequiredDetails = {
  required_plan: typeof ME_UPGRADE_REQUIRED.REQUIRED_PLAN;
  feature: typeof ME_UPGRADE_REQUIRED.FEATURE;
};

type MeUpgradeRequiredProps = {
  message?: string;
  details?: MeUpgradeRequiredDetails;
};

export function MeUpgradeRequired({
  message = "M&E reporting is available on the Impact plan.",
  details,
}: MeUpgradeRequiredProps) {
  const requiredPlan = details?.required_plan ?? ME_UPGRADE_REQUIRED.REQUIRED_PLAN;
  const feature = details?.feature ?? ME_UPGRADE_REQUIRED.FEATURE;

  return (
    <section
      className="card space-y-4 border-brand-primary/30 bg-brand-primary/5"
      data-error-code={ME_UPGRADE_REQUIRED.ERROR_CODE}
      data-required-plan={requiredPlan}
      data-feature={feature}
    >
      <h3 className="text-xl font-semibold text-brand-text-primary">M&E Reports require Impact</h3>
      <p className="text-secondary">{message}</p>
      <p className="text-sm text-secondary">
        Upgrade to {PLAN_DETAILS.IMPACT.label} ({PLAN_DETAILS.IMPACT.priceLabel}) for{" "}
        {PLAN_DETAILS.IMPACT.donorReportsLabel} and {PLAN_DETAILS.IMPACT.prioritySupportLabel.toLowerCase()}.
      </p>
      <Link href="/billing" className="btn-primary inline-flex w-fit items-center">
        View plan options →
      </Link>
    </section>
  );
}

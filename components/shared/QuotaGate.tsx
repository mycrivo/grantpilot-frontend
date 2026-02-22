import type { ReactNode } from "react";

type Plan = "FREE" | "GROWTH" | "IMPACT";
type QuotaAction = "FIT_SCAN" | "PROPOSAL_CREATE" | "PROPOSAL_REGEN";

type QuotaGateProps = {
  action: QuotaAction;
  plan: Plan;
  isAllowed: boolean;
  resetDate?: string;
  children: ReactNode;
  onUpgrade?: (plan: "GROWTH" | "IMPACT") => void;
};

type ExhaustedState = {
  message: string;
  ctaLabel?: string;
  targetPlan?: "GROWTH" | "IMPACT";
};

function buildExhaustedState(action: QuotaAction, plan: Plan, resetDate?: string): ExhaustedState {
  const resolvedDate = resetDate ?? "{date}";

  if (action === "FIT_SCAN") {
    if (plan === "FREE") {
      return {
        message: "You've used your free Fit Scan. Upgrade to Growth to check fit for more opportunities.",
        ctaLabel: "Upgrade to Growth — $39/mo →",
        targetPlan: "GROWTH",
      };
    }

    if (plan === "GROWTH") {
      return {
        message: "You've used all 10 Fit Scans this month. Upgrade to Impact for 20 scans per month.",
        ctaLabel: "Upgrade to Impact — $79/mo →",
        targetPlan: "IMPACT",
      };
    }

    return {
      message: `You've used all 20 Fit Scans this month. Your quota resets on ${resolvedDate}.`,
    };
  }

  if (action === "PROPOSAL_CREATE") {
    if (plan === "FREE") {
      return {
        message: "You've used your free proposal. Upgrade to Growth to generate more proposals.",
        ctaLabel: "Upgrade to Growth — $39/mo →",
        targetPlan: "GROWTH",
      };
    }

    if (plan === "GROWTH") {
      return {
        message: "You've reached 3 proposals this month. Upgrade to Impact for 5 per month.",
        ctaLabel: "Upgrade to Impact — $79/mo →",
        targetPlan: "IMPACT",
      };
    }

    return {
      message: `You've reached 5 proposals this month. Your quota resets on ${resolvedDate}.`,
    };
  }

  if (plan === "FREE") {
    return {
      message: "Regeneration isn't available on the Free plan. Upgrade to refine your proposals.",
      ctaLabel: "Upgrade to Growth — $39/mo →",
      targetPlan: "GROWTH",
    };
  }

  return {
    message: "You've used all 3 regenerations for this proposal.",
  };
}

export function QuotaGate({
  action,
  plan,
  isAllowed,
  resetDate,
  children,
  onUpgrade,
}: QuotaGateProps) {
  if (isAllowed) {
    return <>{children}</>;
  }

  const state = buildExhaustedState(action, plan, resetDate);

  return (
    <div className="card border-brand-border">
      <h4>Usage limit reached</h4>
      <p className="mt-2 text-secondary">{state.message}</p>
      {state.ctaLabel && state.targetPlan ? (
        <button
          type="button"
          className="btn-primary mt-4"
          onClick={() => {
            if (onUpgrade && state.targetPlan) {
              onUpgrade(state.targetPlan);
            }
          }}
        >
          {state.ctaLabel}
        </button>
      ) : null}
    </div>
  );
}

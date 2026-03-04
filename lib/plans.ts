export type Plan = "FREE" | "GROWTH" | "IMPACT";
export type PaidPlan = "GROWTH" | "IMPACT";
export type ExhaustedResource = "fit_scans" | "proposals";

export const PLAN_DETAILS = {
  FREE: {
    label: "Free Plan",
  },
  GROWTH: {
    label: "Growth Plan",
    marketingName: "Growth",
    priceLabel: "$39/mo",
    fitScansLimit: 10,
    proposalsLimit: 3,
    regenerationsPerProposal: 3,
  },
  IMPACT: {
    label: "Impact Plan",
    marketingName: "Impact",
    priceLabel: "$79/mo",
    fitScansLimit: 20,
    proposalsLimit: 5,
    regenerationsPerProposal: 3,
  },
} as const;

export function resourceLabel(resource: ExhaustedResource): string {
  return resource === "fit_scans" ? "Fit Scans" : "proposals";
}


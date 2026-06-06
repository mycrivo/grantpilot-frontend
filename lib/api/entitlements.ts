import type { Plan } from "@/lib/plans";

/** GET /api/me/entitlements — API_CONTRACT.md §4 */
export type EntitlementPeriod = "LIFETIME" | "BILLING_CYCLE";

export type EntitlementQuotaBlock = {
  limit: number;
  used: number;
  remaining: number;
  period: EntitlementPeriod;
  reset_at: string | null;
};

export type EntitlementsResponse = {
  plan: Plan;
  entitlements: {
    fit_scans: EntitlementQuotaBlock;
    proposals: EntitlementQuotaBlock;
    proposal_regenerations: {
      limit_per_proposal: number;
    };
    reports: EntitlementQuotaBlock;
    /** Type-only — never read for display (idempotent, not quota-capped). */
    report_exports: EntitlementQuotaBlock;
  };
};

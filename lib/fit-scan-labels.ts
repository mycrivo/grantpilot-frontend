export type FitScanRecommendation = "RECOMMENDED" | "APPLY_WITH_CAVEATS" | "NOT_RECOMMENDED";

export type RiskSeverity = "HIGH" | "MEDIUM" | "LOW";

/** FIT_SCAN_LANGUAGE_REFERENCE.md §A */
export const RECOMMENDATION_LABELS: Record<FitScanRecommendation, string> = {
  RECOMMENDED: "Strong fit — worth applying",
  APPLY_WITH_CAVEATS: "Worth applying — a few gaps to close first",
  NOT_RECOMMENDED: "Not a strong fit right now",
};

export const RECOMMENDATION_FALLBACK_LABEL = "Assessment complete";

/** FIT_SCAN_LANGUAGE_REFERENCE.md §C */
export const RISK_TYPE_LABELS: Record<string, string> = {
  ELIGIBILITY: "Eligibility concern",
  CAPACITY: "Grant size vs. your scale",
  EVIDENCE: "Track record evidence",
  PROCESS: "Application workload",
  TIMING: "Deadline pressure",
  MISSING_DATA: "Missing profile information",
};

export const RISK_TYPE_FALLBACK_LABEL = "Point to review";

/** FIT_SCAN_LANGUAGE_REFERENCE.md §B */
export const SCORE_DESCRIPTORS: Record<string, string> = {
  Eligibility: "Do you meet the funder's hard requirements?",
  Alignment: "How well your mission and focus match this opportunity",
  Readiness: "How prepared your application is right now",
};

/** FIT_SCAN_LANGUAGE_REFERENCE.md §F */
export const EMPTY_RISK_FLAGS_MESSAGE = "No major risks flagged.";

export const MISSING_OPPORTUNITY_TITLE = "this opportunity";

export function recommendationLabel(recommendation: FitScanRecommendation | string): string {
  const key = recommendation.trim().toUpperCase() as FitScanRecommendation;
  return RECOMMENDATION_LABELS[key] ?? RECOMMENDATION_FALLBACK_LABEL;
}

export function isKnownRecommendation(
  recommendation: string,
): recommendation is FitScanRecommendation {
  const key = recommendation.trim().toUpperCase();
  return key in RECOMMENDATION_LABELS;
}

export function riskTypeLabel(riskType: string): string {
  const key = riskType.trim().toUpperCase();
  return RISK_TYPE_LABELS[key] ?? RISK_TYPE_FALLBACK_LABEL;
}

/** FIT_SCAN_LANGUAGE_REFERENCE.md §D */
export function severityLabel(severity: RiskSeverity | string): string {
  const key = severity.trim().toUpperCase();
  switch (key) {
    case "HIGH":
      return "High";
    case "MEDIUM":
      return "Medium";
    case "LOW":
      return "Low";
    default:
      return severity;
  }
}

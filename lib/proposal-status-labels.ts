/**
 * Plain-language proposal status labels — mirrors report-status-labels.ts pattern.
 * Keys off lib/api/proposals.ts enum values only.
 */

import type { ProposalSectionGenerationStatus } from "@/lib/api/proposals";

export type ProposalStatus = "DRAFT" | "DEGRADED";

export const PROPOSAL_STATUS_LABEL: Record<ProposalStatus, string> = {
  DRAFT: "Draft",
  DEGRADED: "Completed with gaps",
};

export const PROPOSAL_SECTION_STATUS_LABEL: Record<ProposalSectionGenerationStatus, string> = {
  GENERATED: "Ready",
  FAILED: "Could not generate",
  MANUAL_REQUIRED: "Needs your input",
  NEEDS_USER_INPUT: "Needs your answer",
};

export const PROPOSAL_UNTITLED_OPPORTUNITY = "Funding opportunity";

export type ProposalStatusTone = "success" | "warning";

export type ProposalSectionStatusTone = "success" | "error" | "warning" | "neutral";

export function proposalStatusLabel(status: ProposalStatus): string {
  return PROPOSAL_STATUS_LABEL[status];
}

export function proposalSectionStatusLabel(status: ProposalSectionGenerationStatus): string {
  return PROPOSAL_SECTION_STATUS_LABEL[status];
}

export function proposalStatusTone(status: ProposalStatus): ProposalStatusTone {
  return status === "DRAFT" ? "success" : "warning";
}

export function proposalSectionStatusTone(
  status: ProposalSectionGenerationStatus,
): ProposalSectionStatusTone {
  if (status === "GENERATED") {
    return "success";
  }
  if (status === "FAILED") {
    return "error";
  }
  if (status === "NEEDS_USER_INPUT") {
    return "warning";
  }
  return "neutral";
}

import { apiRequest } from "@/lib/api-client";

export type PreFlightSectionStatus = "READY" | "NEEDS_INPUT" | "MANUAL_REQUIRED";

export type PreFlightSection = {
  submission_item_id: string;
  label: string;
  status: PreFlightSectionStatus;
  missing_fields: string[];
  prompt_for_user: string | null;
  generation_allowed: boolean;
};

export type PreFlightResponse = {
  opportunity_title: string;
  variant_id: string;
  ready_to_generate: boolean;
  readiness_percent: number;
  sections: PreFlightSection[];
  summary: {
    total_sections: number;
    ready: number;
    needs_input: number;
    manual_required: number;
  };
};

export type KnowledgeBankEntryInput = {
  key: string;
  text: string;
  opportunity_id?: string;
};

export type KnowledgeBankResponse = {
  knowledge_bank: Record<string, unknown>;
};

export type ProposalSectionGenerationStatus =
  | "GENERATED"
  | "FAILED"
  | "MANUAL_REQUIRED"
  | "NEEDS_USER_INPUT";

export type ProposalDetailResponse = {
  id: string;
  funding_opportunity_id: string;
  fit_scan_id: string | null;
  opportunity_title: string | null;
  status: "DRAFT" | "DEGRADED";
  version: number;
  regeneration_count: number;
  created_at: string;
  updated_at: string;
  content_json: {
    sections: Array<{
      submission_item_id: string;
      label: string;
      generation_status: ProposalSectionGenerationStatus;
      missing_inputs?: string[];
      archetype: string | null;
      content: {
        text: string;
        assumptions: string[];
        evidence_used: string[];
      };
      failure_reason: string | null;
      constraints_applied: {
        word_limit: number | null;
        word_limit_respected: boolean | null;
      } | null;
    }>;
    generation_summary: {
      total_items: number;
      generated: number;
      failed: number;
      manual_required: number;
      warnings: string[];
    };
  };
};

export async function preFlightCheck(
  fundingOpportunityId: string,
  selectedVariantId?: string,
): Promise<PreFlightResponse> {
  return apiRequest<PreFlightResponse>("/api/proposals/pre-flight", {
    method: "POST",
    body: JSON.stringify({
      funding_opportunity_id: fundingOpportunityId,
      selected_variant_id: selectedVariantId ?? null,
    }),
  });
}

export async function updateKnowledgeBank(
  entries: KnowledgeBankEntryInput[],
): Promise<KnowledgeBankResponse> {
  return apiRequest<KnowledgeBankResponse>("/api/ngo-profile/knowledge-bank", {
    method: "PUT",
    body: JSON.stringify({ entries }),
  });
}

export async function regenerateProposal(proposalId: string): Promise<unknown> {
  return apiRequest<unknown>(`/api/proposals/${encodeURIComponent(proposalId)}/regenerate`, {
    method: "POST",
    body: JSON.stringify({ mode: "FULL" }),
  });
}

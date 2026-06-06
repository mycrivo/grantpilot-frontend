/**
 * M&E Donor Report Writer API client — API_CONTRACT.md §12.
 * All paths use /api/reports/{id}/… (no donor-reports segment).
 */

import {
  apiDownloadBlob,
  apiRequest,
  apiUpload,
  triggerClientDownload,
  type BlobDownloadResult,
} from "@/lib/api-client";
import type {
  CriticSeverity,
  CurrentGate,
  DocumentClassification,
  DonorReportStatus,
  ExtractionStatus,
  ReportExportFormat,
  ReportJobStage,
  ReportJobStatus,
  ReportingFrequency,
  SectionGenerationStatus,
} from "@/lib/me-enums";
import { REPORT_EXPORT_FORMAT } from "@/lib/me-enums";

// ——— §12.1 report templates ———

export type ReportTemplateItem = {
  id: string;
  funder_name: string;
  template_name: string;
  region: string;
  reporting_frequency: ReportingFrequency;
  version: number;
};

export type ReportTemplateListResponse = {
  report_templates: ReportTemplateItem[];
};

// ——— §12.2 create / summary ———

export type CreateReportRequest = {
  funder_report_template_id: string;
  linked_proposal_id: string | null;
  reporting_period_start: string;
  reporting_period_end: string;
};

export type ReportSummaryResponse = {
  id: string;
  funder_report_template_id: string;
  funder_name: string;
  template_name: string;
  linked_proposal_id: string | null;
  reporting_period_start: string;
  reporting_period_end: string;
  status: DonorReportStatus;
  version: number;
  created_at: string;
  updated_at: string;
};

// ——— §12.3 document upload ———

export type UploadedDocumentResponse = {
  id: string;
  donor_report_id: string;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  classification: DocumentClassification | null;
  extraction_status: ExtractionStatus;
  created_at: string;
  job_id?: string;
};

// ——— §12.4 / §12.5 knowledge bank ———

export type KnowledgeBankResponse = {
  donor_report_id: string;
  facts: Record<string, unknown>;
  conflicts: unknown[];
  gate1_confirmed_at: string | null;
  ready_for_gate1: boolean;
  knowledge_bank_json?: Record<string, unknown>;
  unreadable_sources?: unknown[];
  reconciliation_outcome?: string | null;
};

export type KnowledgeBankFactPatch = {
  value: unknown;
  confirmed: boolean;
};

export type KnowledgeBankConflictResolution = {
  fact_key: string;
  resolved_value: unknown;
};

export type PatchKnowledgeBankRequest = {
  facts?: Record<string, KnowledgeBankFactPatch>;
  conflict_resolutions?: KnowledgeBankConflictResolution[];
  confirm_gate1?: boolean;
};

export type Gate1ConfirmRequest = {
  knowledge_bank_json: Record<string, unknown>;
};

export type Gate1ConfirmResponse = {
  donor_report_id: string;
  knowledge_bank_json: Record<string, unknown>;
  gate1_confirmed_at: string;
};

// ——— §12.6 / §12.7 gap check ———

export type GapCheckMissingItem = {
  item_key: string;
  label: string;
  prompt: string;
  severity: "required" | "recommended";
  section_key: string | null;
};

export type GapCheckResponse = {
  donor_report_id: string;
  readiness_score: number;
  ready_for_gate2: boolean;
  missing_items: GapCheckMissingItem[];
  gate2_confirmed_at: string | null;
};

export type GapAnswerInput = {
  answer_text: string;
};

export type PatchGapAnswersRequest = {
  gap_answers?: Record<string, GapAnswerInput>;
  confirm_gate2?: boolean;
};

export type Gate2GapResponseInput = {
  disposition: "answered" | "skipped";
  answer_text?: string | null;
  skip_reason?: "not_applicable" | "cannot_provide" | null;
};

export type Gate2GapResponsesRequest = {
  responses: Record<string, Gate2GapResponseInput>;
};

export type Gate2RemainingGap = {
  item_key: string;
  section_key: string;
  section_label: string;
  required_item_type: string;
  required_item_ref: string;
  question: string;
};

export type Gate2GapResponsesResponse = {
  donor_report_id: string;
  gate2_confirmed_at: string | null;
  gate2_unlocked?: boolean;
  gap_answers: Record<string, unknown>;
  remaining_gaps: Gate2RemainingGap[];
};

// ——— §12.8 / §12.12 job ———

export type EnqueueReportJobResponse = {
  job_id: string;
  donor_report_id: string;
  stage: ReportJobStage;
  status: ReportJobStatus;
};

export type ReportJobStatusResponse = {
  job_id: string;
  donor_report_id: string;
  stage: ReportJobStage;
  status: ReportJobStatus;
  agent_trace_json?: {
    runs?: unknown[];
    total_estimated_cost_usd?: number;
  };
  error: string | null;
  started_at: string | null;
  finished_at: string | null;
  current_gate: CurrentGate;
};

// ——— §12.8a gate 3 ———

export type Gate3ConfirmResponse = {
  donor_report_id: string;
  gate3_confirmed_at: string;
  knowledge_bank_json?: Record<string, unknown>;
};

// ——— §12.9 detail ———

export type ReportSectionContent = {
  text: string;
  assumptions: string[];
  evidence_used: string[];
};

export type ReportCriticFlag = {
  claim_text: string;
  severity: CriticSeverity;
  reason: string;
  accepted: boolean;
};

export type ReportSection = {
  section_key: string;
  label: string;
  generation_status: SectionGenerationStatus;
  content: ReportSectionContent;
  critic_flags: ReportCriticFlag[];
  failure_reason: string | null;
  constraints_applied: {
    word_limit: number;
    word_limit_respected: boolean;
  };
  human_edited: boolean;
  last_edited_at: string | null;
};

export type ReportGenerationSummary = {
  total_sections: number;
  generated: number;
  failed: number;
  awaiting_review: number;
  accepted: number;
  critic_blocks: number;
  warnings: string[];
};

export type ReportDetailResponse = {
  id: string;
  funder_report_template_id: string;
  funder_name: string;
  template_name: string;
  linked_proposal_id: string | null;
  reporting_period_start: string;
  reporting_period_end: string;
  status: DonorReportStatus;
  version: number;
  created_at: string;
  updated_at: string;
  content_json: {
    sections: ReportSection[];
    generation_summary: ReportGenerationSummary;
  };
  knowledge_bank_json: Record<string, unknown>;
  gap_analysis_json: Record<string, unknown>;
  indicator_actuals_json: Record<string, unknown>;
  current_gate: CurrentGate;
  gate3_confirmed_at: string | null;
};

// ——— §12.10 list ———

export type ReportListItem = {
  id: string;
  funder_name: string;
  template_name: string;
  status: DonorReportStatus;
  reporting_period_start: string;
  reporting_period_end: string;
  current_gate: CurrentGate;
  created_at: string;
  updated_at: string;
};

export type ReportListResponse = {
  reports: ReportListItem[];
};

// ——— §12.11 section patch ———

export type PatchReportSectionRequest = {
  content_text?: string | null;
  accept_critic_flags?: string[];
  accept_section?: boolean;
};

// ——— §12.13 export ———

export type ExportReportRequest = {
  export_format: ReportExportFormat;
};

function reportPath(reportId: string): string {
  return `/api/reports/${encodeURIComponent(reportId)}`;
}

function buildQuery(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      search.set(key, String(value));
    }
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

/** §12.10 GET /api/reports */
export function listReports(limit?: number) {
  return apiRequest<ReportListResponse>(`/api/reports${buildQuery({ limit })}`, { method: "GET" });
}

/** §12.9 GET /api/reports/{id} */
export function getReport(reportId: string) {
  return apiRequest<ReportDetailResponse>(reportPath(reportId), { method: "GET" });
}

/** §12.1 GET /api/report-templates */
export function listReportTemplates(region?: string) {
  return apiRequest<ReportTemplateListResponse>(`/api/report-templates${buildQuery({ region })}`, { method: "GET" });
}

/** §12.2 POST /api/reports */
export function createReport(body: CreateReportRequest) {
  return apiRequest<ReportSummaryResponse>("/api/reports", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/** §12.3 POST /api/reports/{id}/documents */
export function uploadReportDocument(reportId: string, file: File) {
  const formData = new FormData();
  formData.append("file", file);
  return apiUpload<UploadedDocumentResponse>(`${reportPath(reportId)}/documents`, formData);
}

/** §12.12 GET /api/reports/{id}/job */
export function getReportJob(reportId: string, jobId?: string) {
  return apiRequest<ReportJobStatusResponse>(`${reportPath(reportId)}/job${buildQuery({ job_id: jobId })}`, {
    method: "GET",
  });
}

/** §12.8 POST /api/reports/{id}/job */
export function enqueueReportJob(reportId: string) {
  return apiRequest<EnqueueReportJobResponse>(`${reportPath(reportId)}/job`, { method: "POST" });
}

/** §12.4 GET /api/reports/{id}/knowledge-bank */
export function getKnowledgeBank(reportId: string) {
  return apiRequest<KnowledgeBankResponse>(`${reportPath(reportId)}/knowledge-bank`, { method: "GET" });
}

/** §12.5 PATCH /api/reports/{id}/knowledge-bank */
export function patchKnowledgeBank(reportId: string, body: PatchKnowledgeBankRequest) {
  return apiRequest<KnowledgeBankResponse>(`${reportPath(reportId)}/knowledge-bank`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

/** §12.5a POST /api/reports/{id}/knowledge-bank/gate1/confirm */
export function confirmGate1(reportId: string, body: Gate1ConfirmRequest) {
  return apiRequest<Gate1ConfirmResponse>(`${reportPath(reportId)}/knowledge-bank/gate1/confirm`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/** §12.6 GET /api/reports/{id}/gap-check */
export function getGapCheck(reportId: string) {
  return apiRequest<GapCheckResponse>(`${reportPath(reportId)}/gap-check`, { method: "GET" });
}

/** §12.7 PATCH /api/reports/{id}/gap-answers */
export function patchGapAnswers(reportId: string, body: PatchGapAnswersRequest) {
  return apiRequest<GapCheckResponse>(`${reportPath(reportId)}/gap-answers`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

/** §12.7a POST /api/reports/{id}/knowledge-bank/gate2/gap-responses */
export function submitGate2GapResponses(reportId: string, body: Gate2GapResponsesRequest) {
  return apiRequest<Gate2GapResponsesResponse>(`${reportPath(reportId)}/knowledge-bank/gate2/gap-responses`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/** §12.8a POST /api/reports/{id}/knowledge-bank/gate3/confirm */
export function confirmGate3(reportId: string) {
  return apiRequest<Gate3ConfirmResponse>(`${reportPath(reportId)}/knowledge-bank/gate3/confirm`, {
    method: "POST",
  });
}

/** §12.11 PATCH /api/reports/{id}/sections/{key} */
export function patchReportSection(reportId: string, sectionKey: string, body: PatchReportSectionRequest) {
  return apiRequest<ReportDetailResponse>(
    `${reportPath(reportId)}/sections/${encodeURIComponent(sectionKey)}`,
    {
      method: "PATCH",
      body: JSON.stringify(body),
    },
  );
}

/** §12.13 POST /api/reports/{id}/export — returns blob metadata (no auto-download). */
export function downloadReportExport(reportId: string, exportFormat: ReportExportFormat = REPORT_EXPORT_FORMAT.DOCX) {
  return apiDownloadBlob(`${reportPath(reportId)}/export`, {
    method: "POST",
    body: JSON.stringify({ export_format: exportFormat } satisfies ExportReportRequest),
  });
}

/** §12.13 — fetch DOCX and trigger browser download. */
export async function exportReportDocx(reportId: string): Promise<BlobDownloadResult> {
  const result = await downloadReportExport(reportId);
  triggerClientDownload({ blob: result.blob, filename: result.filename });
  return result;
}

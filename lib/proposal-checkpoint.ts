import type { ReportJobStatusResponse } from "@/lib/api/reports";
import { REPORT_JOB_STAGE, REPORT_JOB_STATUS } from "@/lib/me-enums";

export type ProposalCheckpoint = {
  failedDocumentId: string;
  originalFilename: string;
  degradedCode: string | null;
  missingContentKeys: string[];
  attempts: number | null;
  acknowledged: boolean;
};

const MISSING_CONTENT_LABELS: Record<string, string> = {
  objectives: "programme objectives",
  activities: "activities",
  indicators: "logframe indicators (~16)",
  partners: "named partners",
  consultation: "community consultation",
};

export function missingContentLabels(keys: string[]): string[] {
  return keys.map((key) => MISSING_CONTENT_LABELS[key] ?? key.replace(/_/g, " "));
}

export function getProposalCheckpoint(job: ReportJobStatusResponse | null): ProposalCheckpoint | null {
  if (!job) {
    return null;
  }
  if (job.status !== REPORT_JOB_STATUS.AWAITING_HUMAN || job.stage !== REPORT_JOB_STAGE.EXTRACT) {
    return null;
  }

  const extractStage = job.agent_trace_json?.stages?.extract;
  if (!extractStage || typeof extractStage !== "object") {
    return null;
  }

  const raw = (extractStage as { proposal_checkpoint?: Record<string, unknown> }).proposal_checkpoint;
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const failedDocumentId = String(raw.failed_document_id ?? "");
  if (!failedDocumentId) {
    return null;
  }

  return {
    failedDocumentId,
    originalFilename: String(raw.original_filename ?? "proposal document"),
    degradedCode: raw.degraded_code != null ? String(raw.degraded_code) : null,
    missingContentKeys: Array.isArray(raw.missing_content_keys)
      ? raw.missing_content_keys.map(String)
      : [],
    attempts: typeof raw.attempts === "number" ? raw.attempts : null,
    acknowledged: raw.acknowledged === true,
  };
}

export function isProposalCheckpointActive(job: ReportJobStatusResponse | null): boolean {
  const checkpoint = getProposalCheckpoint(job);
  return checkpoint != null && !checkpoint.acknowledged;
}

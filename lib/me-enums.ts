/**
 * M&E typed constants — ENUM_REGISTRY.md §5 + API_CONTRACT.md §12 gate identifiers.
 * Single source for status/gate values; do not scatter string literals in M&E code.
 */

/** ENUM_REGISTRY.md §5.1 — donor_reports.status */
export const DONOR_REPORT_STATUS = {
  DRAFT: "DRAFT",
  EXTRACTING: "EXTRACTING",
  AWAITING_REVIEW: "AWAITING_REVIEW",
  GENERATING: "GENERATING",
  DEGRADED: "DEGRADED",
  COMPLETE: "COMPLETE",
} as const;

export type DonorReportStatus = (typeof DONOR_REPORT_STATUS)[keyof typeof DONOR_REPORT_STATUS];

/** API_CONTRACT.md §12.9/§12.10/§12.12 — donor_reports.current_gate */
export const CURRENT_GATE = {
  NONE: "none",
  GATE1: "gate1",
  GATE2: "gate2",
  GATE3: "gate3",
} as const;

export type CurrentGate = (typeof CURRENT_GATE)[keyof typeof CURRENT_GATE];

/** ENUM_REGISTRY.md §5.3 — uploaded_documents.classification */
export const DOCUMENT_CLASSIFICATION = {
  PROPOSAL: "proposal",
  GRANT_LETTER: "grant_letter",
  MOU: "mou",
  INDICATOR_DATA: "indicator_data",
  PHOTO: "photo",
  DECK: "deck",
  OTHER: "other",
} as const;

export type DocumentClassification =
  (typeof DOCUMENT_CLASSIFICATION)[keyof typeof DOCUMENT_CLASSIFICATION];

/** ENUM_REGISTRY.md §5.4 — uploaded_documents.extraction_status */
export const EXTRACTION_STATUS = {
  PENDING: "PENDING",
  PROCESSING: "PROCESSING",
  COMPLETE: "COMPLETE",
  FAILED: "FAILED",
} as const;

export type ExtractionStatus = (typeof EXTRACTION_STATUS)[keyof typeof EXTRACTION_STATUS];

/** ENUM_REGISTRY.md §5.5 — funder_report_templates.reporting_frequency */
export const REPORTING_FREQUENCY = {
  END_OF_GRANT: "end_of_grant",
  ANNUAL: "annual",
  QUARTERLY: "quarterly",
  INTERIM: "interim",
  FINAL: "final",
} as const;

export type ReportingFrequency = (typeof REPORTING_FREQUENCY)[keyof typeof REPORTING_FREQUENCY];

/** ENUM_REGISTRY.md §5.6 — report_jobs.stage */
export const REPORT_JOB_STAGE = {
  CLASSIFY: "classify",
  EXTRACT: "extract",
  RECONCILE: "reconcile",
  GAP: "gap",
  SYNTHESISE: "synthesise",
  CRITIQUE: "critique",
  EXPORT: "export",
} as const;

export type ReportJobStage = (typeof REPORT_JOB_STAGE)[keyof typeof REPORT_JOB_STAGE];

/** ENUM_REGISTRY.md §5.7 — report_jobs.status */
export const REPORT_JOB_STATUS = {
  QUEUED: "queued",
  RUNNING: "running",
  AWAITING_HUMAN: "awaiting_human",
  FAILED: "failed",
  DONE: "done",
} as const;

export type ReportJobStatus = (typeof REPORT_JOB_STATUS)[keyof typeof REPORT_JOB_STATUS];

/** ENUM_REGISTRY.md §5.8 — content_json section generation_status */
export const SECTION_GENERATION_STATUS = {
  GENERATED: "GENERATED",
  FAILED: "FAILED",
  AWAITING_REVIEW: "AWAITING_REVIEW",
  ACCEPTED: "ACCEPTED",
} as const;

export type SectionGenerationStatus =
  (typeof SECTION_GENERATION_STATUS)[keyof typeof SECTION_GENERATION_STATUS];

/** ENUM_REGISTRY.md §5.9 — critic_flags.severity */
export const CRITIC_SEVERITY = {
  BLOCK: "BLOCK",
  WARN: "WARN",
} as const;

export type CriticSeverity = (typeof CRITIC_SEVERITY)[keyof typeof CRITIC_SEVERITY];

/** API_CONTRACT.md §10.3 — M&E Free/Growth upgrade gate */
export const ME_UPGRADE_REQUIRED = {
  ERROR_CODE: "UPGRADE_REQUIRED",
  REQUIRED_PLAN: "IMPACT",
  FEATURE: "me_reports",
} as const;

/** API_CONTRACT.md §12.13 */
export const REPORT_EXPORT_FORMAT = {
  DOCX: "DOCX",
} as const;

export type ReportExportFormat = (typeof REPORT_EXPORT_FORMAT)[keyof typeof REPORT_EXPORT_FORMAT];

/**
 * Normalizes §12.9 report sections for Gate 3 UI.
 */

import type { ReportCriticFlag, ReportDetailResponse, ReportSection } from "@/lib/api/reports";
import {
  CRITIC_SEVERITY,
  CURRENT_GATE,
  DONOR_REPORT_STATUS,
  SECTION_GENERATION_STATUS,
  type CriticSeverity,
} from "@/lib/me-enums";
import {
  GATE3_CRITIC_SEVERITY_LABEL,
  GATE3_LABEL,
  GATE3_SECTION_STATUS_LABEL,
} from "@/components/reports/report-status-labels";
import { formatCriticReason } from "@/lib/critic-reason-labels";

export type Gate3SectionDisplayStatus = "checked" | "edited" | "needs_review" | "not_provided";

export type NormalizedCriticIssue = {
  reason: string;
  claimText: string | null;
  severity: CriticSeverity;
  severityLabel: string;
};

export type NormalizedReportSection = {
  sectionKey: string;
  label: string;
  displayStatus: Gate3SectionDisplayStatus;
  statusLabel: (typeof GATE3_SECTION_STATUS_LABEL)[keyof typeof GATE3_SECTION_STATUS_LABEL];
  previewText: string;
  fullText: string;
  isNotProvided: boolean;
  unacceptedFlags: ReportCriticFlag[];
  criticIssues: NormalizedCriticIssue[];
  primaryCriticIssue: string | null;
  primaryCriticSeverity: CriticSeverity | null;
  severityLabel: string | null;
};

export type SourceCheckAlert = {
  title: string;
  body: string;
  flaggedSectionKeys: string[];
};

export function shouldRenderGate3(report: ReportDetailResponse): boolean {
  if (report.gate3_confirmed_at) {
    return false;
  }

  if (report.status === DONOR_REPORT_STATUS.COMPLETE) {
    return false;
  }

  if (!report.knowledge_bank_json?.gate2_confirmed_at) {
    return false;
  }

  const sections = report.content_json?.sections ?? [];
  if (sections.length === 0) {
    return false;
  }

  if (report.current_gate === CURRENT_GATE.GATE3) {
    return true;
  }

  return report.status === DONOR_REPORT_STATUS.AWAITING_REVIEW;
}

function isSectionNotProvided(section: ReportSection): boolean {
  if (section.generation_status === SECTION_GENERATION_STATUS.FAILED) {
    return true;
  }

  const text = section.content?.text?.trim() ?? "";
  if (!text && section.failure_reason) {
    return true;
  }

  return false;
}

function resolveDisplayStatus(section: ReportSection): Gate3SectionDisplayStatus {
  if (isSectionNotProvided(section)) {
    return "not_provided";
  }

  const unaccepted = section.critic_flags.filter((flag) => !flag.accepted);
  if (unaccepted.length > 0) {
    return "needs_review";
  }

  if (section.human_edited) {
    return "edited";
  }

  return "checked";
}

function statusLabelFor(displayStatus: Gate3SectionDisplayStatus): NormalizedReportSection["statusLabel"] {
  if (displayStatus === "not_provided") {
    return GATE3_SECTION_STATUS_LABEL.NOT_PROVIDED;
  }
  if (displayStatus === "needs_review") {
    return GATE3_SECTION_STATUS_LABEL.NEEDS_REVIEW;
  }
  if (displayStatus === "edited") {
    return GATE3_SECTION_STATUS_LABEL.EDITED;
  }
  return GATE3_SECTION_STATUS_LABEL.CHECKED;
}

function severityLabel(severity: CriticSeverity | null): string | null {
  if (!severity) {
    return null;
  }
  if (severity === CRITIC_SEVERITY.BLOCK) {
    return GATE3_CRITIC_SEVERITY_LABEL.BLOCK;
  }
  return GATE3_CRITIC_SEVERITY_LABEL.WARN;
}

function truncatePreview(text: string, maxLength = 200): string {
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength).trimEnd()}\u2026`;
}

export function normalizeReportSection(section: ReportSection): NormalizedReportSection {
  const notProvided = isSectionNotProvided(section);
  const displayStatus = resolveDisplayStatus(section);
  const unacceptedFlags = section.critic_flags.filter((flag) => !flag.accepted);
  const primaryFlag = unacceptedFlags[0] ?? null;
  const fullText = notProvided ? "" : (section.content?.text ?? "");
  const previewText = notProvided ? GATE3_LABEL.NOT_PROVIDED_PREVIEW : truncatePreview(fullText);
  const criticIssues: NormalizedCriticIssue[] = unacceptedFlags.map((flag) => ({
    reason: formatCriticReason(flag.reason),
    claimText: flag.claim_text?.trim() ? flag.claim_text.trim() : null,
    severity: flag.severity,
    severityLabel: severityLabel(flag.severity) ?? GATE3_CRITIC_SEVERITY_LABEL.WARN,
  }));

  return {
    sectionKey: section.section_key,
    label: section.label,
    displayStatus,
    statusLabel: statusLabelFor(displayStatus),
    previewText,
    fullText,
    isNotProvided: notProvided,
    unacceptedFlags,
    criticIssues,
    primaryCriticIssue: primaryFlag ? formatCriticReason(primaryFlag.reason) : null,
    primaryCriticSeverity: primaryFlag?.severity ?? null,
    severityLabel: severityLabel(primaryFlag?.severity ?? null),
  };
}

export function buildReportSectionView(report: ReportDetailResponse): NormalizedReportSection[] {
  return (report.content_json?.sections ?? []).map(normalizeReportSection);
}

export function buildSourceCheckAlert(sections: NormalizedReportSection[]): SourceCheckAlert | null {
  const flagged = sections.filter((section) => section.unacceptedFlags.length > 0);
  if (flagged.length === 0) {
    return null;
  }

  const firstIssue = flagged[0].primaryCriticIssue;
  const body =
    flagged.length === 1 && firstIssue
      ? `${firstIssue} ${GATE3_LABEL.REVIEW_BEFORE_DOWNLOAD}`
      : GATE3_LABEL.SOURCE_CHECK_MULTIPLE;

  return {
    title: GATE3_LABEL.SOURCE_CHECK_TITLE,
    body,
    flaggedSectionKeys: flagged.map((section) => section.sectionKey),
  };
}

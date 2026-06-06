"use client";

import Link from "next/link";

import { Gate3SectionCard } from "@/components/reports/gate3/Gate3SectionCard";
import { GATE3_LABEL } from "@/components/reports/report-status-labels";
import type { NormalizedReportSection, SourceCheckAlert } from "@/lib/report-section-view";

type Gate3DraftReviewProps = {
  reportId: string;
  sections: NormalizedReportSection[];
  sourceCheckAlert: SourceCheckAlert | null;
  saving: boolean;
  approving: boolean;
  approveError: string | null;
  onSaveSection: (sectionKey: string, contentText: string) => Promise<void>;
  onApprove: () => Promise<void>;
  onReviewIssue: (sectionKey: string) => void;
};

export function Gate3DraftReview({
  reportId,
  sections,
  sourceCheckAlert,
  saving,
  approving,
  approveError,
  onSaveSection,
  onApprove,
  onReviewIssue,
}: Gate3DraftReviewProps) {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-[28px] font-bold leading-tight text-brand-text-primary">{GATE3_LABEL.TITLE}</h1>
        <p className="mt-2 text-[15px] text-secondary">{GATE3_LABEL.SUBTITLE}</p>
      </header>

      {sourceCheckAlert ? (
        <div className="flex flex-wrap items-start gap-3 rounded-[12px] border border-brand-warning/30 bg-brand-warning/5 p-4">
          <span className="font-bold text-brand-warning" aria-hidden="true">
            !
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold text-brand-text-primary">{sourceCheckAlert.title}</h2>
            <p className="mt-1 text-sm text-secondary">{sourceCheckAlert.body}</p>
          </div>
          {sourceCheckAlert.flaggedSectionKeys[0] ? (
            <button
              type="button"
              className="rounded-[8px] border border-brand-border bg-brand-card-bg px-3 py-1.5 text-sm font-semibold text-brand-text-primary hover:bg-brand-divider"
              onClick={() => onReviewIssue(sourceCheckAlert.flaggedSectionKeys[0])}
            >
              {GATE3_LABEL.REVIEW_ISSUE}
            </button>
          ) : null}
        </div>
      ) : null}

      <div>
        <p className="mb-3 text-xs font-bold uppercase tracking-wider text-brand-neutral">
          {GATE3_LABEL.SECTIONS_EYEBROW}
        </p>
        <ul className="space-y-4">
          {sections.map((section) => (
            <li key={section.sectionKey}>
              <Gate3SectionCard section={section} saving={saving} onSave={onSaveSection} />
            </li>
          ))}
        </ul>
      </div>

      <p className="flex items-start gap-2 rounded-[6px] border border-brand-border bg-brand-primary/5 px-4 py-3 text-sm text-secondary">
        <span aria-hidden="true" className="text-brand-primary">
          ⛨
        </span>
        <span>{GATE3_LABEL.TRUST_LINE}</span>
      </p>

      {approveError ? (
        <p className="rounded-[8px] border border-brand-error/30 bg-brand-error/5 px-4 py-3 text-sm text-brand-error">
          {approveError}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
          disabled={approving || saving}
          onClick={() => void onApprove()}
        >
          {approving ? GATE3_LABEL.APPROVING : GATE3_LABEL.DOWNLOAD_DOCX}
        </button>
        <Link
          href={`/reports/${encodeURIComponent(reportId)}/questions`}
          className="text-sm font-semibold text-brand-primary hover:underline"
        >
          {GATE3_LABEL.BACK_TO_QUESTIONS}
        </Link>
      </div>
    </div>
  );
}

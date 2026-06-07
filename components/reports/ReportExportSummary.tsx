"use client";

import Link from "next/link";
import { useState } from "react";

import { ErrorDisplay } from "@/components/shared/ErrorDisplay";
import type { ReportDetailResponse } from "@/lib/api/reports";
import { exportReportDocx } from "@/lib/api/reports";
import { ApiClientError } from "@/lib/api-client";
import {
  resolveReportDisplayNames,
  resolveReportExportFilenameStem,
} from "@/lib/report-display-names";
import { isReportDegraded } from "@/lib/report-detail-routing";

import { ReportDegradedNotice } from "./ReportDegradedNotice";

type ReportExportSummaryProps = {
  report: ReportDetailResponse;
  reportId: string;
};

function formatReportingPeriod(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return `${start} – ${end}`;
  }
  const formatter = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" });
  return `${formatter.format(startDate)} – ${formatter.format(endDate)}`;
}

function formatLastUpdated(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function countSourceDocuments(knowledgeBank: Record<string, unknown>): number {
  if (typeof knowledgeBank.source_document_count === "number") {
    return knowledgeBank.source_document_count;
  }
  if (Array.isArray(knowledgeBank.uploaded_documents)) {
    return knowledgeBank.uploaded_documents.length;
  }
  if (Array.isArray(knowledgeBank.documents)) {
    return knowledgeBank.documents.length;
  }
  return 0;
}

function countNotProvidedItems(knowledgeBank: Record<string, unknown>): number {
  const gapAnswers = knowledgeBank.gap_answers;
  if (!gapAnswers || typeof gapAnswers !== "object") {
    return 0;
  }

  return Object.values(gapAnswers as Record<string, { disposition?: string; skip_reason?: string }>).filter(
    (answer) =>
      answer.disposition === "skipped" ||
      answer.skip_reason === "cannot_provide" ||
      answer.skip_reason === "not_applicable",
  ).length;
}

function sanitizeDownloadFilename(filename: string): string {
  return filename.replace(/[<>:"/\\|?*]/g, "-").trim();
}

export function ReportExportSummary({ report, reportId }: ReportExportSummaryProps) {
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<ApiClientError | null>(null);

  const { title, funder } = resolveReportDisplayNames(report);
  const reportingPeriodLabel = formatReportingPeriod(
    report.reporting_period_start,
    report.reporting_period_end,
  );
  const reportTitle = resolveReportExportFilenameStem(report, reportingPeriodLabel);

  const generationSummary = report.content_json?.generation_summary;
  const sectionCount = generationSummary?.total_sections ?? 0;
  const failedSectionCount = generationSummary?.failed ?? 0;
  const sourceDocumentsUsed = countSourceDocuments(report.knowledge_bank_json);
  const notProvidedCount = countNotProvidedItems(report.knowledge_bank_json);
  const degraded = isReportDegraded(report);

  const handleDownload = async () => {
    setDownloading(true);
    setDownloadError(null);
    try {
      const filename = sanitizeDownloadFilename(`${reportTitle}.docx`);
      await exportReportDocx(reportId, filename);
    } catch (error) {
      setDownloadError(
        error instanceof ApiClientError
          ? error
          : new ApiClientError(500, "Download failed. Please try again."),
      );
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl space-y-6">
      {degraded ? <ReportDegradedNotice failedSectionCount={failedSectionCount} /> : null}

      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-[12px] border border-brand-success/30 bg-brand-success/10 text-2xl text-brand-success">
          ✓
        </span>
        <h1 className="text-[28px] font-bold leading-tight text-brand-text-primary">Your report is ready</h1>
      </div>

      <p className="text-[15px] text-secondary">
        Download the formatted Word document and make any final checks before submitting it to your funder.
      </p>

      <div className="flex items-center gap-4 rounded-[12px] border border-brand-border bg-brand-card-bg p-4">
        <span className="rounded-[6px] bg-brand-primary/10 px-2 py-1 text-xs font-bold text-brand-primary">DOCX</span>
        <div className="min-w-0">
          <p className="truncate font-semibold text-brand-text-primary">{reportTitle}</p>
          <p className="text-sm text-secondary">Ready to download</p>
        </div>
      </div>

      <div className="rounded-[12px] border border-brand-border bg-brand-card-bg p-4">
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-secondary">Report</dt>
            <dd className="text-right font-semibold text-brand-text-primary">{title}</dd>
          </div>
          {funder ? (
            <div className="flex justify-between gap-4">
              <dt className="text-secondary">Funder</dt>
              <dd className="text-right font-semibold text-brand-text-primary">{funder}</dd>
            </div>
          ) : null}
          <div className="flex justify-between gap-4">
            <dt className="text-secondary">Reporting period</dt>
            <dd className="text-right font-semibold text-brand-text-primary">
              {formatReportingPeriod(report.reporting_period_start, report.reporting_period_end)}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-secondary">Sections</dt>
            <dd className="text-right font-semibold text-brand-text-primary">{sectionCount}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-secondary">Source documents used</dt>
            <dd className="text-right font-semibold text-brand-text-primary">{sourceDocumentsUsed}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-secondary">Items marked &ldquo;not provided&rdquo;</dt>
            <dd className="text-right font-semibold text-brand-text-primary">{notProvidedCount}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-secondary">Last updated</dt>
            <dd className="text-right font-semibold text-brand-text-primary">{formatLastUpdated(report.updated_at)}</dd>
          </div>
        </dl>
      </div>

      {downloadError ? <ErrorDisplay error={downloadError} /> : null}

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
          disabled={downloading}
          onClick={() => void handleDownload()}
        >
          {downloading ? "Downloading…" : "Download DOCX"}
        </button>
        <Link href={`/reports/${encodeURIComponent(reportId)}/review`} className="text-sm font-semibold text-brand-primary hover:underline">
          Back to review
        </Link>
      </div>

      <p className="flex items-start gap-2 text-sm text-secondary">
        <span aria-hidden="true">↩</span>
        <span>You can return to this report from your M&E Reports page.</span>
      </p>
    </div>
  );
}

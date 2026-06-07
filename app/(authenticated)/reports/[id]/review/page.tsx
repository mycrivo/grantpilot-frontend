"use client";

import { useRouter } from "next/navigation";
import { use, useCallback, useEffect, useMemo, useState } from "react";

import { Gate3DraftReview } from "@/components/reports/gate3/Gate3DraftReview";
import { ReportNotFound } from "@/components/reports/ReportNotFound";
import { ReportsFunnelHeader } from "@/components/reports/ReportsFunnelHeader";
import { ReportsJourneySteps } from "@/components/reports/ReportsJourneySteps";
import { ErrorDisplay } from "@/components/shared/ErrorDisplay";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { confirmGate3, getReport, patchReportSection, type ReportDetailResponse } from "@/lib/api/reports";
import { ApiClientError } from "@/lib/api-client";
import { resolveFriendlyApiErrorMessage } from "@/lib/me-error-messages";
import {
  buildReportSectionView,
  buildSourceCheckAlert,
} from "@/lib/report-section-view";
import { useReportSubpathGuard } from "@/lib/report-subpath-guard";

type ReviewReportPageProps = {
  params: Promise<{ id: string }>;
};

export default function ReviewReportPage({ params }: ReviewReportPageProps) {
  const { id: reportId } = use(params);
  const router = useRouter();
  const guard = useReportSubpathGuard(reportId, "review");
  const [report, setReport] = useState<ReportDetailResponse | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<ApiClientError | null>(null);
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [approveError, setApproveError] = useState<string | null>(null);

  const loadReport = useCallback(async () => {
    const detail = await getReport(reportId);
    setReport(detail);
    setError(null);
    return detail;
  }, [reportId]);

  useEffect(() => {
    if (!guard.allowed) {
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        const detail = await loadReport();
        if (!cancelled && detail) {
          setReport(detail);
        }
      } catch (loadError) {
        if (cancelled) {
          return;
        }

        if (loadError instanceof ApiClientError && loadError.status === 404) {
          setNotFound(true);
          return;
        }

        setError(
          loadError instanceof ApiClientError
            ? loadError
            : new ApiClientError(500, "Failed to load draft report."),
        );
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [guard.allowed, loadReport]);

  const sections = useMemo(() => {
    if (!report) {
      return [];
    }
    return buildReportSectionView(report);
  }, [report]);

  const sourceCheckAlert = useMemo(() => buildSourceCheckAlert(sections), [sections]);

  const handleSaveSection = async (sectionKey: string, contentText: string) => {
    setSaving(true);
    setApproveError(null);
    try {
      const updated = await patchReportSection(reportId, sectionKey, { content_text: contentText });
      setReport(updated);
    } catch (patchError) {
      setError(
        patchError instanceof ApiClientError
          ? patchError
          : new ApiClientError(500, "Failed to save section."),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    setApproving(true);
    setApproveError(null);
    try {
      await confirmGate3(reportId);
      router.replace(`/reports/${encodeURIComponent(reportId)}`);
    } catch (confirmError) {
      setApproveError(
        confirmError instanceof ApiClientError
          ? resolveFriendlyApiErrorMessage(confirmError, "Failed to approve report. Please try again.")
          : "Failed to approve report. Please try again.",
      );
      setApproving(false);
    }
  };

  const handleReviewIssue = (sectionKey: string) => {
    const element = document.getElementById(`section-${sectionKey}`);
    element?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (guard.notFound) {
    return <ReportNotFound />;
  }

  if (guard.error) {
    return <ErrorDisplay title="Draft review unavailable" error={guard.error} />;
  }

  if (guard.loading || !guard.allowed) {
    return <LoadingSkeleton variant="page" lines={10} />;
  }

  if (notFound) {
    return <ReportNotFound />;
  }

  if (error) {
    return <ErrorDisplay title="Draft review unavailable" error={error} />;
  }

  if (!report) {
    return <LoadingSkeleton variant="page" lines={10} />;
  }

  return (
    <section className="space-y-6">
      <ReportsFunnelHeader />
      <ReportsJourneySteps current="review" />
      <Gate3DraftReview
        reportId={reportId}
        sections={sections}
        sourceCheckAlert={sourceCheckAlert}
        saving={saving}
        approving={approving}
        approveError={approveError}
        onSaveSection={handleSaveSection}
        onApprove={handleApprove}
        onReviewIssue={handleReviewIssue}
      />
    </section>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { FunderTemplatePicker } from "@/components/reports/FunderTemplatePicker";
import { ReportsFunnelHeader } from "@/components/reports/ReportsFunnelHeader";
import { ReportsQuotaExhausted } from "@/components/reports/ReportsQuotaExhausted";
import { ErrorDisplay } from "@/components/shared/ErrorDisplay";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import type { EntitlementsResponse } from "@/lib/api/entitlements";
import { listProposals } from "@/lib/api/proposals";
import type { ProposalListItem } from "@/lib/api/proposals";
import { createReport, listReportTemplates } from "@/lib/api/reports";
import type { ReportTemplateItem } from "@/lib/api/reports";
import { ApiClientError, apiRequest } from "@/lib/api-client";
import { fetchCompleteness } from "@/lib/profile-service";

type NewReportPageState =
  | { kind: "loading" }
  | { kind: "quota_exhausted"; resetAt: string | null }
  | { kind: "error"; error: ApiClientError }
  | {
      kind: "ready";
      templates: ReportTemplateItem[];
      proposals: ProposalListItem[];
      reportsRemaining: number;
    };

const PROFILE_RETURN_PATH = "/profile?from=reports_new";

export default function NewReportPage() {
  const router = useRouter();
  const [pageState, setPageState] = useState<NewReportPageState>({ kind: "loading" });
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [linkedProposalId, setLinkedProposalId] = useState<string>("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<ApiClientError | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setPageState({ kind: "loading" });

      try {
        const completeness = await fetchCompleteness();
        if (completeness.profile_status !== "COMPLETE") {
          router.replace(PROFILE_RETURN_PATH);
          return;
        }

        const entitlements = await apiRequest<EntitlementsResponse>("/api/me/entitlements", { method: "GET" });
        if (entitlements.entitlements.reports.remaining <= 0) {
          if (!cancelled) {
            setPageState({
              kind: "quota_exhausted",
              resetAt: entitlements.entitlements.reports.reset_at,
            });
          }
          return;
        }

        const [templatesPayload, proposalsPayload] = await Promise.all([
          listReportTemplates(),
          listProposals(20).catch(() => ({ proposals: [] as ProposalListItem[] })),
        ]);

        if (!cancelled) {
          setPageState({
            kind: "ready",
            templates: templatesPayload.report_templates,
            proposals: proposalsPayload.proposals,
            reportsRemaining: entitlements.entitlements.reports.remaining,
          });
        }
      } catch (error) {
        if (!cancelled) {
          setPageState({
            kind: "error",
            error:
              error instanceof ApiClientError
                ? error
                : new ApiClientError(500, "Failed to load report setup."),
          });
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const selectedTemplate =
    pageState.kind === "ready"
      ? pageState.templates.find((item) => item.id === selectedTemplateId) ?? null
      : null;

  const handleCreate = async () => {
    if (!selectedTemplate || !periodStart || !periodEnd) {
      setSubmitError(new ApiClientError(400, "Choose a funder template and reporting period to continue."));
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const report = await createReport({
        funder_report_template_id: selectedTemplate.id,
        linked_proposal_id: linkedProposalId ? linkedProposalId : null,
        reporting_period_start: periodStart,
        reporting_period_end: periodEnd,
      });
      router.push(`/reports/${encodeURIComponent(report.id)}/upload`);
    } catch (error) {
      if (error instanceof ApiClientError) {
        if (error.status === 409 && error.errorCode === "PROFILE_INCOMPLETE") {
          router.replace(PROFILE_RETURN_PATH);
          return;
        }
        if (error.status === 429 && error.errorCode === "QUOTA_EXCEEDED") {
          const resetAt =
            typeof error.details?.reset_at === "string" ? error.details.reset_at : null;
          setPageState({ kind: "quota_exhausted", resetAt });
          return;
        }
        setSubmitError(error);
      } else {
        setSubmitError(new ApiClientError(500, "Failed to create report. Please try again."));
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (pageState.kind === "loading") {
    return <LoadingSkeleton variant="page" lines={8} />;
  }

  if (pageState.kind === "error") {
    return <ErrorDisplay title="Report setup unavailable" error={pageState.error} />;
  }

  if (pageState.kind === "quota_exhausted") {
    return (
      <section className="mx-auto max-w-2xl space-y-6">
        <ReportsFunnelHeader />
        <ReportsQuotaExhausted resetAt={pageState.resetAt} />
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <ReportsFunnelHeader />

      <span className="inline-flex items-center gap-2 rounded-full border border-brand-primary/20 bg-brand-primary/5 px-3 py-1 text-xs font-semibold text-brand-primary">
        <span className="h-2 w-2 rounded-full bg-brand-primary" aria-hidden="true" />
        Step 3 of 3
      </span>

      <header>
        <h1 className="text-[28px] font-bold leading-tight text-brand-text-primary">Who are you reporting to?</h1>
        <p className="mt-2 text-[15px] text-secondary">
          Choose the funder, grant, and reporting period so GrantPilot can structure the report correctly.
        </p>
        <p className="mt-3 text-sm font-medium text-brand-text-primary">
          {pageState.reportsRemaining === 1
            ? "1 report remaining this billing cycle."
            : `${pageState.reportsRemaining} reports remaining this billing cycle.`}
        </p>
      </header>

      <FunderTemplatePicker
        templates={pageState.templates}
        selectedId={selectedTemplateId}
        onSelect={(template) => setSelectedTemplateId(template.id)}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="linked-proposal" className="mb-2 block text-sm font-semibold text-brand-text-primary">
            Link a proposal (optional)
          </label>
          <select
            id="linked-proposal"
            value={linkedProposalId}
            onChange={(event) => setLinkedProposalId(event.target.value)}
            className="w-full rounded-[8px] border border-brand-border bg-brand-card-bg px-3 py-3 text-sm outline-none focus:border-brand-primary"
          >
            <option value="">No linked proposal</option>
            {pageState.proposals.map((proposal) => (
              <option key={proposal.id} value={proposal.id}>
                {proposal.opportunity_title?.trim() || `Proposal ${proposal.id.slice(0, 8)}`}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 md:col-span-1 md:grid-cols-2">
          <div>
            <label htmlFor="period-start" className="mb-2 block text-sm font-semibold text-brand-text-primary">
              Period start
            </label>
            <input
              id="period-start"
              type="date"
              value={periodStart}
              onChange={(event) => setPeriodStart(event.target.value)}
              className="w-full rounded-[8px] border border-brand-border bg-brand-card-bg px-3 py-3 text-sm outline-none focus:border-brand-primary"
            />
          </div>
          <div>
            <label htmlFor="period-end" className="mb-2 block text-sm font-semibold text-brand-text-primary">
              Period end
            </label>
            <input
              id="period-end"
              type="date"
              value={periodEnd}
              onChange={(event) => setPeriodEnd(event.target.value)}
              className="w-full rounded-[8px] border border-brand-border bg-brand-card-bg px-3 py-3 text-sm outline-none focus:border-brand-primary"
            />
          </div>
        </div>
      </div>

      {submitError ? <ErrorDisplay error={submitError} /> : null}

      <div className="pt-2">
        <button
          type="button"
          className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
          disabled={submitting || !selectedTemplate || !periodStart || !periodEnd}
          onClick={() => void handleCreate()}
        >
          {submitting ? "Creating report…" : "Start report"}
        </button>
      </div>
    </section>
  );
}

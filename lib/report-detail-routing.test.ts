import { describe, expect, it } from "vitest";

import type { ReportDetailResponse, ReportJobStatusResponse } from "@/lib/api/reports";
import { resolveReportDetailSubpath } from "@/lib/report-detail-routing";
import { CURRENT_GATE, DONOR_REPORT_STATUS, REPORT_JOB_STAGE, REPORT_JOB_STATUS } from "@/lib/me-enums";

function baseReport(overrides: Partial<ReportDetailResponse> = {}): ReportDetailResponse {
  return {
    id: "report-1",
    funder_report_template_id: "tpl-1",
    funder_name: "NLCF",
    template_name: "Annual",
    linked_proposal_id: null,
    reporting_period_start: "2025-01-01",
    reporting_period_end: "2025-12-31",
    status: DONOR_REPORT_STATUS.AWAITING_REVIEW,
    version: 1,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
    content_json: { sections: [], generation_summary: { total_sections: 0, generated: 0, failed: 0, awaiting_review: 0, accepted: 0, critic_blocks: 0, warnings: [] } },
    knowledge_bank_json: {},
    gap_analysis_json: {},
    indicator_actuals_json: {},
    current_gate: CURRENT_GATE.GATE1,
    gate3_confirmed_at: null,
    ...overrides,
  };
}

describe("resolveReportDetailSubpath without job", () => {
  it("routes DRAFT with no job to upload", () => {
    expect(
      resolveReportDetailSubpath(
        baseReport({ status: DONOR_REPORT_STATUS.DRAFT, current_gate: CURRENT_GATE.NONE }),
        null,
      ),
    ).toBe("upload");
  });

  it("routes DEGRADED with no job to done", () => {
    expect(
      resolveReportDetailSubpath(
        baseReport({ status: DONOR_REPORT_STATUS.DEGRADED, current_gate: CURRENT_GATE.NONE }),
        null,
      ),
    ).toBe("done");
  });

  it("routes to gate subpath from report.current_gate when no job", () => {
    expect(resolveReportDetailSubpath(baseReport({ current_gate: CURRENT_GATE.GATE1 }), null)).toBe("facts");
    expect(
      resolveReportDetailSubpath(baseReport({ current_gate: CURRENT_GATE.GATE2 }), null),
    ).toBe("questions");
    expect(
      resolveReportDetailSubpath(baseReport({ current_gate: CURRENT_GATE.GATE3 }), null),
    ).toBe("review");
  });

  it("falls back to reading when no job and gate is none", () => {
    expect(
      resolveReportDetailSubpath(
        baseReport({ status: DONOR_REPORT_STATUS.EXTRACTING, current_gate: CURRENT_GATE.NONE }),
        null,
      ),
    ).toBe("reading");
  });
});

describe("resolveReportDetailSubpath with failed job", () => {
  it("routes failed jobs to reading for stage-specific failure UI", () => {
    const job = {
      job_id: "job-1",
      donor_report_id: "report-1",
      stage: "synthesise",
      status: REPORT_JOB_STATUS.FAILED,
      error: "internal",
      started_at: null,
      finished_at: null,
      current_gate: CURRENT_GATE.NONE,
    } as ReportJobStatusResponse;

    expect(resolveReportDetailSubpath(baseReport(), job)).toBe("reading");
  });
});

describe("resolveReportDetailSubpath awaiting_human", () => {
  it("routes gap+awaiting_human to facts (Gate 1 halt) without job.current_gate", () => {
    const job = {
      job_id: "job-1",
      donor_report_id: "report-1",
      stage: REPORT_JOB_STAGE.GAP,
      status: REPORT_JOB_STATUS.AWAITING_HUMAN,
      error: null,
      started_at: null,
      finished_at: null,
    } as ReportJobStatusResponse;

    expect(
      resolveReportDetailSubpath(
        baseReport({ status: DONOR_REPORT_STATUS.DRAFT, current_gate: CURRENT_GATE.GATE1 }),
        job,
      ),
    ).toBe("facts");
  });

  it("routes synthesise+awaiting_human to questions (Gate 2 halt)", () => {
    const job = {
      job_id: "job-1",
      donor_report_id: "report-1",
      stage: REPORT_JOB_STAGE.SYNTHESISE,
      status: REPORT_JOB_STATUS.AWAITING_HUMAN,
      error: null,
      started_at: null,
      finished_at: null,
    } as ReportJobStatusResponse;

    expect(resolveReportDetailSubpath(baseReport(), job)).toBe("questions");
  });

  it("routes export+awaiting_human to review (Gate 3 halt)", () => {
    const job = {
      job_id: "job-1",
      donor_report_id: "report-1",
      stage: REPORT_JOB_STAGE.EXPORT,
      status: REPORT_JOB_STATUS.AWAITING_HUMAN,
      error: null,
      started_at: null,
      finished_at: null,
    } as ReportJobStatusResponse;

    expect(resolveReportDetailSubpath(baseReport(), job)).toBe("review");
  });

  it("routes extract+awaiting_human to reading (proposal checkpoint)", () => {
    const job = {
      job_id: "job-1",
      donor_report_id: "report-1",
      stage: REPORT_JOB_STAGE.EXTRACT,
      status: REPORT_JOB_STATUS.AWAITING_HUMAN,
      error: null,
      started_at: null,
      finished_at: null,
    } as ReportJobStatusResponse;

    expect(resolveReportDetailSubpath(baseReport(), job)).toBe("reading");
  });
});

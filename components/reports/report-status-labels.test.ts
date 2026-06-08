import { describe, expect, it } from "vitest";

import {
  resolveJobFailureCopy,
  resolveReportListStatusChip,
} from "@/components/reports/report-status-labels";
import {
  CURRENT_GATE,
  DONOR_REPORT_STATUS,
  REPORT_JOB_STAGE,
  REPORT_JOB_STATUS,
} from "@/lib/me-enums";

describe("resolveJobFailureCopy", () => {
  it("uses reading copy for early pipeline stages", () => {
    const copy = resolveJobFailureCopy(REPORT_JOB_STAGE.EXTRACT);
    expect(copy.headline).toContain("reading your documents");
  });

  it("uses drafting copy for synthesise and critique", () => {
    expect(resolveJobFailureCopy(REPORT_JOB_STAGE.SYNTHESISE).headline).toContain("drafting");
    expect(resolveJobFailureCopy(REPORT_JOB_STAGE.CRITIQUE).headline).toContain("drafting");
  });

  it("uses export copy for export stage", () => {
    expect(resolveJobFailureCopy(REPORT_JOB_STAGE.EXPORT).headline).toContain("download");
  });

  it("uses gap copy for gap stage", () => {
    const copy = resolveJobFailureCopy(REPORT_JOB_STAGE.GAP);
    expect(copy.headline).toContain("funder template");
    expect(copy.body).toContain("confirmed facts");
  });
});

describe("resolveReportListStatusChip", () => {
  it("maps terminal DEGRADED to completed with limitations", () => {
    const chip = resolveReportListStatusChip(DONOR_REPORT_STATUS.DEGRADED, CURRENT_GATE.NONE, {
      latestJobStatus: REPORT_JOB_STATUS.DONE,
    });
    expect(chip.label).toBe("Completed with limitations");
    expect(chip.tone).toBe("warning");
    expect(chip.cta).toBe("View report");
  });

  it("maps mid-pipeline AWAITING_REVIEW to needs your review", () => {
    const chip = resolveReportListStatusChip(DONOR_REPORT_STATUS.AWAITING_REVIEW, CURRENT_GATE.GATE1, {
      latestJobStatus: REPORT_JOB_STATUS.AWAITING_HUMAN,
    });
    expect(chip.label).toBe("Needs your review");
  });

  it("keeps generation failed for failed jobs", () => {
    const chip = resolveReportListStatusChip(DONOR_REPORT_STATUS.EXTRACTING, CURRENT_GATE.NONE, {
      latestJobStatus: REPORT_JOB_STATUS.FAILED,
      latestJobStage: REPORT_JOB_STAGE.EXPORT,
    });
    expect(chip.label).toBe("Generation failed");
    expect(chip.cta).toBe("View details");
  });
});

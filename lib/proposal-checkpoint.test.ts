import { describe, expect, it } from "vitest";

import type { ReportJobStatusResponse } from "@/lib/api/reports";
import { getProposalCheckpoint, isProposalCheckpointActive } from "@/lib/proposal-checkpoint";
import { resolveReportDetailSubpath } from "@/lib/report-detail-routing";
import { resolveUnreadableSourceDisplayLabel } from "@/lib/unreadable-source-display";
import { DONOR_REPORT_STATUS, REPORT_JOB_STAGE, REPORT_JOB_STATUS } from "@/lib/me-enums";

describe("proposal checkpoint routing", () => {
  it("routes extract+awaiting_human with checkpoint to reading", () => {
    const job = {
      job_id: "job-1",
      donor_report_id: "report-1",
      stage: REPORT_JOB_STAGE.EXTRACT,
      status: REPORT_JOB_STATUS.AWAITING_HUMAN,
      error: null,
      started_at: null,
      finished_at: null,
      agent_trace_json: {
        stages: {
          extract: {
            proposal_checkpoint: {
              failed_document_id: "doc-proposal",
              original_filename: "wrong-name.pdf",
              degraded_code: "DEGRADED_EXTRACTION_TIMEOUT",
              missing_content_keys: ["objectives"],
              acknowledged: false,
            },
          },
        },
      },
    } as ReportJobStatusResponse;

    expect(
      resolveReportDetailSubpath(
        {
          id: "report-1",
          status: DONOR_REPORT_STATUS.DRAFT,
        } as Parameters<typeof resolveReportDetailSubpath>[0],
        job,
      ),
    ).toBe("reading");
    expect(isProposalCheckpointActive(job)).toBe(true);
    expect(getProposalCheckpoint(job)?.originalFilename).toBe("wrong-name.pdf");
  });
});

describe("resolveUnreadableSourceDisplayLabel", () => {
  it("prefers uploaded document filename over source_label", () => {
    expect(
      resolveUnreadableSourceDisplayLabel(
        {
          sourceDocumentId: "doc-1",
          sourceLabel: "award_letter.pdf",
          code: "DEGRADED_EXTRACTION_TIMEOUT",
          explanation: "timeout",
        },
        { "doc-1": "proposal.docx" },
      ),
    ).toBe("proposal.docx");
  });
});

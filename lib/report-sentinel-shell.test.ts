import { describe, expect, it } from "vitest";

import {
  SENTINEL_FUNDER_NAME,
  SENTINEL_TEMPLATE_NAME,
  filterVisibleReportListItems,
  isSentinelTemplate,
  shouldHideEmptySentinelShell,
} from "@/lib/report-sentinel-shell";

const emptySentinelShell = {
  funder_name: SENTINEL_FUNDER_NAME,
  template_name: SENTINEL_TEMPLATE_NAME,
  latest_job_status: null,
  document_count: 0,
};

describe("isSentinelTemplate", () => {
  it("matches backend sentinel constants only", () => {
    expect(isSentinelTemplate(SENTINEL_FUNDER_NAME, SENTINEL_TEMPLATE_NAME)).toBe(true);
    expect(isSentinelTemplate("__other__", "__wrapped__")).toBe(false);
  });
});

describe("shouldHideEmptySentinelShell", () => {
  it("hides empty sentinel shell with no job and no uploads", () => {
    expect(shouldHideEmptySentinelShell(emptySentinelShell)).toBe(true);
  });

  it("does not hide sentinel when a job exists", () => {
    expect(
      shouldHideEmptySentinelShell({
        ...emptySentinelShell,
        latest_job_status: "failed",
      }),
    ).toBe(false);
  });

  it("does not hide sentinel when uploads exist without a job", () => {
    expect(
      shouldHideEmptySentinelShell({
        ...emptySentinelShell,
        document_count: 1,
      }),
    ).toBe(false);
  });

  it("does not hide normal reports", () => {
    expect(
      shouldHideEmptySentinelShell({
        funder_name: "NLCF",
        template_name: "Annual Report",
        latest_job_status: null,
        document_count: 0,
      }),
    ).toBe(false);
  });

  it("does not read donor_reports.status — sentinel with drifted status still hides when empty", () => {
    expect(shouldHideEmptySentinelShell(emptySentinelShell)).toBe(true);
  });
});

describe("filterVisibleReportListItems", () => {
  it("removes only empty sentinel shells from a mixed list", () => {
    const items = [
      emptySentinelShell,
      {
        funder_name: "FCDO",
        template_name: "Annual",
        latest_job_status: "done" as const,
        document_count: 2,
      },
      {
        ...emptySentinelShell,
        document_count: 1,
      },
    ];
    expect(filterVisibleReportListItems(items)).toHaveLength(2);
  });
});

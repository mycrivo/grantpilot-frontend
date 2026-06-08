/**
 * Empty phantom-template shell detection for list display filtering (P4).
 * Hide predicate uses job state + upload count only — never donor_reports.status (D5).
 */

import type { ReportListItem } from "@/lib/api/reports";

/** Backend constants — donor_report_lifecycle_service.py */
export const SENTINEL_FUNDER_NAME = "__default__";
export const SENTINEL_TEMPLATE_NAME = "__lifecycle_default__";

export type SentinelShellInput = Pick<
  ReportListItem,
  "funder_name" | "template_name" | "latest_job_status" | "document_count"
>;

export function isSentinelTemplate(funderName: string, templateName: string): boolean {
  return funderName === SENTINEL_FUNDER_NAME && templateName === SENTINEL_TEMPLATE_NAME;
}

/** List-only filter: hide empty phantom-template shells; DB rows unchanged. */
export function shouldHideEmptySentinelShell(item: SentinelShellInput): boolean {
  return (
    isSentinelTemplate(item.funder_name, item.template_name) &&
    item.latest_job_status === null &&
    item.document_count === 0
  );
}

export function filterVisibleReportListItems<T extends SentinelShellInput>(items: T[]): T[] {
  return items.filter((item) => !shouldHideEmptySentinelShell(item));
}

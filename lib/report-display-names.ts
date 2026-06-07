/**
 * Single resolution layer for report template_name / funder_name display (API_CONTRACT §12).
 * Raw API values must not be rendered directly — use these helpers on every user-facing surface.
 */

const WRAPPED_SENTINEL_PATTERN = /^__.+__$/;

export const REPORT_DISPLAY_FALLBACK_TITLE = "Untitled report" as const;

export function isMissingReportDisplayName(value: string | null | undefined): boolean {
  if (value == null) {
    return true;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return true;
  }
  return WRAPPED_SENTINEL_PATTERN.test(trimmed);
}

export function resolveReportDisplayTitle(templateName: string | null | undefined): string {
  if (isMissingReportDisplayName(templateName)) {
    return REPORT_DISPLAY_FALLBACK_TITLE;
  }
  return templateName!.trim();
}

/** Returns null when the funder line should be omitted entirely (not a placeholder string). */
export function resolveReportDisplayFunder(funderName: string | null | undefined): string | null {
  if (isMissingReportDisplayName(funderName)) {
    return null;
  }
  return funderName!.trim();
}

export type ReportNameFields = {
  template_name: string;
  funder_name: string;
};

export function resolveReportDisplayNames(fields: ReportNameFields): {
  title: string;
  funder: string | null;
} {
  return {
    title: resolveReportDisplayTitle(fields.template_name),
    funder: resolveReportDisplayFunder(fields.funder_name),
  };
}

/** Filename stem for client-side DOCX download (extension added by caller if needed). */
export function resolveReportExportFilenameStem(
  fields: ReportNameFields,
  periodLabel?: string,
): string {
  const title = resolveReportDisplayTitle(fields.template_name);
  if (periodLabel) {
    return `${title} — ${periodLabel}`;
  }
  return title;
}

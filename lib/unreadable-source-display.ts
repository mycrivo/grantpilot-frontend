import type { NormalizedUnreadableSource } from "@/lib/knowledge-bank-view";

/** Prefer uploaded document filename over API source_label when available. */
export function resolveUnreadableSourceDisplayLabel(
  source: NormalizedUnreadableSource,
  documentFilenameById?: Readonly<Record<string, string>>,
): string {
  const fromDocument = documentFilenameById?.[source.sourceDocumentId];
  if (fromDocument?.trim()) {
    return fromDocument;
  }
  return source.sourceLabel;
}

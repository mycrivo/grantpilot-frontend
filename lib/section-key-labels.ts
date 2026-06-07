/**
 * Humanises template section keys when a display label is unavailable (Gate 2 tags).
 */

export function humanizeSectionKey(sectionKey: string | null | undefined): string {
  const trimmed = sectionKey?.trim();
  if (!trimmed) {
    return "General";
  }

  return trimmed
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

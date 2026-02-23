"use client";

type ExportSummary = {
  generated: number;
  failed: number;
  manualRequired: number;
};

type ExportModalProps = {
  isOpen: boolean;
  isExporting: boolean;
  summary: ExportSummary;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ExportModal({ isOpen, isExporting, summary, onCancel, onConfirm }: ExportModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="card w-full max-w-xl space-y-4">
        <h4>Export readiness check</h4>
        <ul className="space-y-2 text-sm text-secondary">
          <li>{summary.generated} sections generated and ready.</li>
          <li>
            {summary.failed} sections failed. These sections will appear as placeholders in the document.
          </li>
          <li>
            {summary.manualRequired} sections require manual input. Complete them manually after export.
          </li>
        </ul>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="h-11 rounded-[8px] border border-brand-border bg-brand-card-bg px-4 text-sm font-semibold text-brand-text-primary"
            onClick={onCancel}
            disabled={isExporting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={onConfirm}
            disabled={isExporting}
          >
            {isExporting ? "Exporting..." : "Confirm export"}
          </button>
        </div>
      </div>
    </div>
  );
}

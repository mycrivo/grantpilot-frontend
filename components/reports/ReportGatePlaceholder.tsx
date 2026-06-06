import { REPORT_GATE_PLACEHOLDER_LABEL } from "./report-status-labels";

type ReportGatePlaceholderProps = {
  stepName: string;
};

export function ReportGatePlaceholder({ stepName }: ReportGatePlaceholderProps) {
  return (
    <div className="mx-auto max-w-2xl rounded-[12px] border border-brand-border bg-brand-card-bg p-6">
      <p className="text-xs font-bold uppercase tracking-wider text-brand-neutral">Development placeholder</p>
      <h1 className="mt-2 text-xl font-bold text-brand-text-primary">{REPORT_GATE_PLACEHOLDER_LABEL.TITLE}</h1>
      <p className="mt-2 text-sm text-secondary">{REPORT_GATE_PLACEHOLDER_LABEL.BODY}</p>
      <p className="mt-4 text-sm text-secondary">
        Step: <span className="font-semibold text-brand-text-primary">{stepName}</span>
      </p>
    </div>
  );
}

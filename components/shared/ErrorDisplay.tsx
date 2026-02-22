type ApiErrorLike = {
  error_code?: string;
  message?: string;
  details?: unknown;
  request_id?: string;
  status?: number;
  errorCode?: string;
  requestId?: string;
};

type SecondaryAction = {
  label: string;
  onClick: () => void;
};

type ErrorDisplayProps = {
  error?: ApiErrorLike | null;
  message?: string;
  title?: string;
  fallbackMessage?: string;
  onRetry?: () => void;
  primaryActionLabel?: string;
  secondaryAction?: SecondaryAction;
};

function resolveMessage(error?: ApiErrorLike | null, fallbackMessage?: string, message?: string) {
  if (error?.status === 429) {
    return "You've hit a rate limit. Please wait a moment and try again.";
  }

  if (typeof error?.status === "number" && error.status >= 500) {
    return "We're experiencing a temporary issue. Please try again shortly.";
  }

  if (error?.message) {
    return error.message;
  }

  return message ?? fallbackMessage ?? "Something went wrong. Please try again.";
}

export function ErrorDisplay({
  error,
  message,
  title = "Something went wrong",
  fallbackMessage,
  onRetry,
  primaryActionLabel = "Try again",
  secondaryAction,
}: ErrorDisplayProps) {
  const resolvedMessage = resolveMessage(error, fallbackMessage, message);
  const referenceId = error?.request_id ?? error?.requestId;

  return (
    <div className="card border-brand-error/20">
      <h4>{title}</h4>
      <p className="mt-2 text-secondary">{resolvedMessage}</p>
      {referenceId ? (
        <p className="mt-2 text-xs text-brand-text-secondary/80">Reference: {referenceId}</p>
      ) : null}
      {onRetry || secondaryAction ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {onRetry ? (
            <button type="button" className="btn-primary" onClick={onRetry}>
              {primaryActionLabel}
            </button>
          ) : null}
          {secondaryAction ? (
            <button
              type="button"
              className="h-11 rounded-[8px] border border-brand-border bg-brand-card-bg px-4 text-sm font-semibold text-brand-text-primary"
              onClick={secondaryAction.onClick}
            >
              {secondaryAction.label}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}


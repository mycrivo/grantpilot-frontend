type LoadingSkeletonVariant = "page" | "card" | "list";

type LoadingSkeletonProps = {
  variant?: LoadingSkeletonVariant;
  lines?: number;
  className?: string;
};

function containerClasses(variant: LoadingSkeletonVariant) {
  if (variant === "page") {
    return "space-y-4";
  }

  if (variant === "list") {
    return "space-y-3";
  }

  return "card";
}

export function LoadingSkeleton({
  variant = "card",
  lines = 3,
  className = "",
}: LoadingSkeletonProps) {
  const baseClass = containerClasses(variant);

  if (variant === "page") {
    return (
      <div className={`animate-pulse ${baseClass} ${className}`.trim()} role="status" aria-label="Loading content">
        <div className="card space-y-3">
          <div className="h-7 w-1/3 rounded bg-brand-divider" />
          <div className="h-4 w-2/3 rounded bg-brand-divider" />
        </div>
        <div className="card space-y-2">
          {Array.from({ length: lines }).map((_, index) => (
            <div key={index} className="h-4 w-full rounded bg-brand-divider" />
          ))}
        </div>
      </div>
    );
  }

  if (variant === "list") {
    return (
      <div className={`animate-pulse ${baseClass} ${className}`.trim()} role="status" aria-label="Loading content">
        {Array.from({ length: lines }).map((_, index) => (
          <div key={index} className="card space-y-2">
            <div className="h-5 w-1/3 rounded bg-brand-divider" />
            <div className="h-4 w-full rounded bg-brand-divider" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`card animate-pulse space-y-2 ${className}`.trim()} role="status" aria-label="Loading content">
      <div className="h-6 w-1/3 rounded bg-brand-divider" />
      {Array.from({ length: lines }).map((_, index) => (
        <div key={index} className="h-4 w-full rounded bg-brand-divider" />
      ))}
    </div>
  );
}


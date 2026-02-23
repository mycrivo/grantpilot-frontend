"use client";

import { useEffect, useState } from "react";

type GenerationProgressProps = {
  title?: string;
  steps?: string[];
  intervalMs?: number;
};

const DEFAULT_STEPS = [
  "Analysing funder requirements...",
  "Writing executive summary...",
  "Drafting approach section...",
  "Structuring monitoring and evaluation...",
  "This usually takes 30-60 seconds.",
];

export function GenerationProgress({
  title = "Generating your proposal...",
  steps = DEFAULT_STEPS,
  intervalMs = 2800,
}: GenerationProgressProps) {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setStepIndex((current) => (current + 1) % steps.length);
    }, intervalMs);

    return () => {
      window.clearInterval(timer);
    };
  }, [intervalMs, steps.length]);

  return (
    <section className="mx-auto max-w-3xl">
      <div className="card">
        <h3>{title}</h3>
        <div className="mt-6 h-2 w-full overflow-hidden rounded-full bg-brand-divider">
          <div className="h-full w-1/3 animate-pulse rounded-full bg-brand-primary" />
        </div>
        <p className="mt-4 text-secondary">{steps[stepIndex]}</p>
      </div>
    </section>
  );
}

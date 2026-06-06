import Link from "next/link";

type ReportsQuotaExhaustedProps = {
  resetAt: string | null;
};

function formatResetLabel(resetAt: string | null): string {
  if (!resetAt) {
    return "Your allowance refreshes on your next billing date.";
  }
  const date = new Date(resetAt);
  if (Number.isNaN(date.getTime())) {
    return "Your allowance refreshes on your next billing date.";
  }
  return `Your allowance refreshes on ${date.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })}.`;
}

export function ReportsQuotaExhausted({ resetAt }: ReportsQuotaExhaustedProps) {
  return (
    <section className="card space-y-4 border-brand-warning/30 bg-brand-warning/5">
      <h3 className="text-lg font-semibold text-brand-text-primary">You&apos;ve used all of this month&apos;s reports</h3>
      <p className="text-secondary">
        Your plan includes a set number of reports each billing period. {formatResetLabel(resetAt)}
      </p>
      <Link
        href="/billing"
        className="inline-flex min-h-10 items-center rounded-[8px] bg-gradient-to-br from-[#5B2EFF] to-[#8B5CFF] px-4 py-2 text-sm font-semibold text-white"
      >
        View plan options
      </Link>
    </section>
  );
}

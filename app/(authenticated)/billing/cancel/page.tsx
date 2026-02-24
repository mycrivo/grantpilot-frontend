import Link from "next/link";

export default function BillingCancelPage() {
  return (
    <section className="mx-auto max-w-2xl">
      <div className="card">
        <h3>No worries — you can upgrade anytime.</h3>
        <p className="mt-2 text-secondary">
          No changes were made during checkout.
        </p>
        <p className="mt-2 text-secondary">
          Your Free plan includes 1 Fit Scan and 1 Proposal to try GrantPilot.
        </p>
        <Link href="/dashboard" className="btn-primary mt-6 inline-flex items-center">
          Back to Dashboard \u2192
        </Link>
      </div>
    </section>
  );
}


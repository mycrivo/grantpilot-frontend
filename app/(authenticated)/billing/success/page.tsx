import Link from "next/link";

export default function BillingSuccessPage() {
  return (
    <section className="mx-auto max-w-2xl">
      <div className="card">
        <h3>You&apos;re all set!</h3>
        <p className="mt-2 text-secondary">
          Your plan has been upgraded.
        </p>
        <Link href="/dashboard" className="btn-primary mt-6 inline-flex items-center">
          Go to Dashboard \u2192
        </Link>
      </div>
    </section>
  );
}


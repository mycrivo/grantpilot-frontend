"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function BillingSuccessPage() {
  const [checkoutIntentId, setCheckoutIntentId] = useState<string | null>(null);

  useEffect(() => {
    const value = window.sessionStorage.getItem("gp_checkout_intent");
    if (value) {
      setCheckoutIntentId(value);
      window.sessionStorage.removeItem("gp_checkout_intent");
    }
  }, []);

  return (
    <section className="mx-auto max-w-2xl">
      <div className="card">
        <h3>You&apos;re all set!</h3>
        <p className="mt-2 text-secondary">Your plan has been upgraded.</p>
        {checkoutIntentId ? (
          <Link
            href={`/start?opportunity_id=${encodeURIComponent(checkoutIntentId)}`}
            className="btn-primary mt-6 inline-flex items-center"
          >
            Go to your Fit Scan →
          </Link>
        ) : (
          <Link href="/dashboard" className="btn-primary mt-6 inline-flex items-center">
            Go to Dashboard →
          </Link>
        )}
      </div>
    </section>
  );
}


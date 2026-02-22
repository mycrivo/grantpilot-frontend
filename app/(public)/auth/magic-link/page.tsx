"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { useAuth } from "@/components/auth/AuthProvider";
import { ApiClientError, apiRequest } from "@/lib/api-client";
import { resolveRedirectAfterAuth } from "@/lib/auth-intent";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";

const magicLinkErrorMessages: Record<string, string> = {
  MAGIC_TOKEN_INVALID: "This magic link is invalid. Please request a new login link.",
  MAGIC_TOKEN_EXPIRED: "This magic link has expired. Please request a new login link.",
  MAGIC_TOKEN_ALREADY_USED: "This magic link has already been used. Request a new login link.",
  RATE_LIMITED: "Too many attempts. Please wait a moment and try again.",
};

export default function MagicLinkPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loginWithTokens } = useAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const consumeMagicLink = async () => {
      const token = searchParams.get("token");
      const state = searchParams.get("state");
      const queryNext = searchParams.get("next");

      if (!token) {
        setErrorMessage("The login link is incomplete. Please request a new magic link.");
        return;
      }

      try {
        const payload = await apiRequest<{
          access_token: string;
          refresh_token: string;
          token_type: string;
          expires_in: number;
          user: {
            id: string;
            email: string;
            full_name?: string;
            plan: "FREE" | "GROWTH" | "IMPACT";
          };
        }>(
          "/api/auth/magic-link/consume",
          {
            method: "POST",
            body: JSON.stringify({ token }),
          },
          { auth: false, retryOn401: false },
        );

        loginWithTokens(payload);
        const targetPath = resolveRedirectAfterAuth({ queryNext, state });
        router.replace(targetPath);
      } catch (error) {
        if (error instanceof ApiClientError) {
          setErrorMessage(magicLinkErrorMessages[error.errorCode ?? ""] ?? error.message);
          return;
        }

        setErrorMessage("We couldn't validate that link right now. Please request a new one.");
      }
    };

    void consumeMagicLink();
  }, [loginWithTokens, router, searchParams]);

  if (errorMessage) {
    return (
      <section className="mx-auto max-w-2xl space-y-4">
        <div className="card border-brand-error/30 bg-brand-error/5">
          <h4>Magic link sign-in issue</h4>
          <p className="mt-2 text-secondary">{errorMessage}</p>
          <Link href="/login" className="btn-primary mt-6 inline-flex items-center">
            Back to Login
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-2xl">
      <LoadingSkeleton lines={2} />
      <p className="mt-4 text-secondary">Validating your magic link...</p>
    </section>
  );
}


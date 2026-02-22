"use client";

import { FormEvent, Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { ApiClientError, apiRequest } from "@/lib/api-client";
import { storeNextIntent } from "@/lib/auth-intent";

const errorMessages: Record<string, string> = {
  auth_code_missing: "Your sign-in session was incomplete. Please try signing in again.",
  auth_exchange_failed: "We could not complete sign-in. Please try again.",
  magic_token_invalid: "That magic link is invalid. Request a new link to continue.",
  magic_token_expired: "That magic link has expired. Request a new link to continue.",
  magic_token_already_used: "That magic link was already used. Request a new link to continue.",
  rate_limited: "Too many attempts. Please wait a moment and try again.",
};

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginClient />
    </Suspense>
  );
}

function LoginClient() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingMagic, setLoadingMagic] = useState(false);
  const [magicSentTo, setMagicSentTo] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const queryError = searchParams.get("error");
  const errorFromQuery = useMemo(() => {
    if (!queryError) {
      return null;
    }
    return errorMessages[queryError] ?? "We couldn't sign you in. Please try again.";
  }, [queryError]);

  const handleGoogleLogin = async () => {
    setFormError(null);
    setLoadingGoogle(true);

    try {
      const nextFromQuery = searchParams.get("next");
      storeNextIntent(nextFromQuery);

      const payload = await apiRequest<{ authorization_url: string; state: string }>(
        "/api/auth/google/start",
        { method: "GET" },
        { auth: false, retryOn401: false },
      );

      window.location.assign(payload.authorization_url);
    } catch (error) {
      if (error instanceof ApiClientError) {
        setFormError(error.message);
      } else {
        setFormError("We couldn't start Google sign-in. Please try again.");
      }
      setLoadingGoogle(false);
    }
  };

  const handleMagicLinkRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setMagicSentTo(null);
    setLoadingMagic(true);

    try {
      await apiRequest<{ status: "sent" }>(
        "/api/auth/magic-link/request",
        {
          method: "POST",
          body: JSON.stringify({ email }),
        },
        { auth: false, retryOn401: false },
      );

      setMagicSentTo(email);
    } catch (error) {
      if (error instanceof ApiClientError) {
        setFormError(error.message);
      } else {
        setFormError("We couldn't send a magic link right now. Please try again.");
      }
    } finally {
      setLoadingMagic(false);
    }
  };

  return (
    <section className="mx-auto max-w-xl">
      <div className="card">
        <h3>Sign in to GrantPilot</h3>
        <p className="mt-2 text-secondary">
          Continue with Google or request a magic link to access your workspace.
        </p>
        {errorFromQuery ? (
          <p className="mt-4 rounded-[8px] border border-brand-error/30 bg-brand-error/5 p-3 text-sm text-brand-error">
            {errorFromQuery}
          </p>
        ) : null}
        {formError ? (
          <p className="mt-4 rounded-[8px] border border-brand-error/30 bg-brand-error/5 p-3 text-sm text-brand-error">
            {formError}
          </p>
        ) : null}
        {magicSentTo ? (
          <p className="mt-4 rounded-[8px] border border-brand-success/30 bg-brand-success/10 p-3 text-sm text-brand-success">
            Check your email. We sent a login link to {magicSentTo}.
          </p>
        ) : null}
        <div className="mt-6 space-y-4">
          <button
            type="button"
            className="btn-primary w-full"
            disabled={loadingGoogle}
            onClick={() => void handleGoogleLogin()}
          >
            {loadingGoogle ? "Redirecting to Google..." : "Continue with Google"}
          </button>
          <div className="text-center text-secondary">or</div>
          <form className="space-y-2" onSubmit={handleMagicLinkRequest}>
            <label htmlFor="email" className="block text-sm font-medium text-brand-text-primary">
              Work email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.org"
              required
              className="h-11 w-full rounded-[8px] border border-brand-border bg-brand-card-bg px-4 text-[14px] outline-none focus:border-brand-primary"
            />
            <button
              type="submit"
              disabled={loadingMagic}
              className="h-11 w-full rounded-[8px] border border-brand-primary bg-transparent px-4 text-base font-semibold text-brand-primary"
            >
              {loadingMagic ? "Sending..." : "Send Magic Link"}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}

function LoginFallback() {
  return (
    <section className="mx-auto max-w-xl">
      <div className="card">
        <h3>Sign in to GrantPilot</h3>
        <p className="mt-2 text-secondary">Preparing sign-in...</p>
      </div>
    </section>
  );
}


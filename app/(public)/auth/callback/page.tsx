"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { useAuth } from "@/components/auth/AuthProvider";
import { apiRequest } from "@/lib/api-client";
import { resolveRedirectAfterAuth } from "@/lib/auth-intent";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";

const AUTH_ERROR_REDIRECT = "/login?error=auth_exchange_failed";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loginWithTokens } = useAuth();
  const [message, setMessage] = useState("Signing you in...");

  useEffect(() => {
    const runExchange = async () => {
      const code = searchParams.get("code");
      const state = searchParams.get("state");
      const queryNext = searchParams.get("next");

      if (!code) {
        router.replace("/login?error=auth_code_missing");
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
          "/api/auth/exchange",
          {
            method: "POST",
            body: JSON.stringify({ code }),
          },
          { auth: false, retryOn401: false },
        );

        loginWithTokens(payload);
        const targetPath = resolveRedirectAfterAuth({ queryNext, state });
        router.replace(targetPath);
      } catch {
        setMessage("We couldn't complete sign-in. Redirecting you back to login...");
        router.replace(AUTH_ERROR_REDIRECT);
      }
    };

    void runExchange();
  }, [loginWithTokens, router, searchParams]);

  return (
    <section className="mx-auto max-w-2xl">
      <LoadingSkeleton lines={2} />
      <p className="mt-4 text-secondary">{message}</p>
    </section>
  );
}


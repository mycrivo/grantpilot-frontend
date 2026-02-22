"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { apiRequest, configureApiClientAuthHandlers } from "@/lib/api-client";

type AuthUser = {
  id: string;
  email: string;
  full_name?: string;
  plan: "FREE" | "GROWTH" | "IMPACT";
};

type AuthTokenPayload = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user?: AuthUser;
};

type AuthContextValue = {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  loginWithTokens: (payload: AuthTokenPayload) => void;
  logout: () => Promise<void>;
  getAccessToken: () => string | null;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);

  const clearAuthState = useCallback(() => {
    setAccessToken(null);
    setRefreshToken(null);
    setUser(null);
  }, []);

  const loginWithTokens = (payload: AuthTokenPayload) => {
    setAccessToken(payload.access_token);
    setRefreshToken(payload.refresh_token);
    if (payload.user) {
      setUser(payload.user);
    }
  };

  useEffect(() => {
    configureApiClientAuthHandlers({
      getAccessToken: () => accessToken,
      getRefreshToken: () => refreshToken,
      setTokens: (tokens) => {
        setAccessToken(tokens.access_token);
        setRefreshToken(tokens.refresh_token);
      },
      clearAuthState,
    });

    return () => configureApiClientAuthHandlers(null);
  }, [accessToken, refreshToken, clearAuthState]);

  const logout = useCallback(async () => {
    const currentRefreshToken = refreshToken;
    if (currentRefreshToken) {
      try {
        await apiRequest<{ status: string }>(
          "/api/auth/logout",
          {
            method: "POST",
            body: JSON.stringify({ refresh_token: currentRefreshToken }),
          },
          { auth: false, retryOn401: false },
        );
      } catch {
        // Logout API is best-effort; local sign-out still completes.
      }
    }

    clearAuthState();
    router.push("/login");
  }, [clearAuthState, refreshToken, router]);

  const value = useMemo<AuthContextValue>(
    () => ({
      accessToken,
      refreshToken,
      user,
      isAuthenticated: Boolean(accessToken && refreshToken),
      loginWithTokens,
      logout,
      getAccessToken: () => accessToken,
    }),
    [accessToken, refreshToken, user, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }

  return context;
}

export type { AuthTokenPayload, AuthUser };


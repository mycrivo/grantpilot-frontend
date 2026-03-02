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
  isLoading: boolean;
  isAuthenticated: boolean;
  loginWithTokens: (payload: AuthTokenPayload) => void;
  logout: () => Promise<void>;
  getAccessToken: () => string | null;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const REFRESH_TOKEN_STORAGE_KEY = "gp_refresh_token";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    if (typeof window === "undefined") {
      return true;
    }
    return Boolean(window.localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY));
  });

  const clearAuthState = useCallback(() => {
    setAccessToken(null);
    setRefreshToken(null);
    setUser(null);
  }, []);

  const persistRefreshToken = useCallback((token: string) => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, token);
  }, []);

  const clearPersistedRefreshToken = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
  }, []);

  const loginWithTokens = useCallback((payload: AuthTokenPayload) => {
    setAccessToken(payload.access_token);
    setRefreshToken(payload.refresh_token);
    persistRefreshToken(payload.refresh_token);
    if (payload.user) {
      setUser(payload.user);
    }
  }, [persistRefreshToken]);

  useEffect(() => {
    let isMounted = true;
    const storedRefreshToken =
      typeof window === "undefined" ? null : window.localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);

    if (!storedRefreshToken) {
      setIsLoading(false);
      return () => {
        isMounted = false;
      };
    }

    setIsLoading(true);
    void (async () => {
      try {
        const refreshPayload = await apiRequest<AuthTokenPayload>(
          "/api/auth/refresh",
          {
            method: "POST",
            body: JSON.stringify({ refresh_token: storedRefreshToken }),
          },
          { auth: false, retryOn401: false },
        );

        if (!refreshPayload.refresh_token) {
          throw new Error("Refresh token rotation missing.");
        }

        if (!isMounted) {
          return;
        }

        setAccessToken(refreshPayload.access_token);
        setRefreshToken(refreshPayload.refresh_token);
        persistRefreshToken(refreshPayload.refresh_token);
        if (refreshPayload.user) {
          setUser(refreshPayload.user);
        }
      } catch {
        clearPersistedRefreshToken();
        if (!isMounted) {
          return;
        }
        clearAuthState();
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [clearAuthState, clearPersistedRefreshToken, persistRefreshToken]);

  useEffect(() => {
    configureApiClientAuthHandlers({
      getAccessToken: () => accessToken,
      getRefreshToken: () => refreshToken,
      setTokens: (tokens) => {
        setAccessToken(tokens.access_token);
        setRefreshToken(tokens.refresh_token);
        persistRefreshToken(tokens.refresh_token);
      },
      clearAuthState,
    });

    return () => configureApiClientAuthHandlers(null);
  }, [accessToken, refreshToken, clearAuthState, persistRefreshToken]);

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
    clearPersistedRefreshToken();
    router.push("/login");
  }, [clearAuthState, clearPersistedRefreshToken, refreshToken, router]);

  const value = useMemo<AuthContextValue>(
    () => ({
      accessToken,
      refreshToken,
      user,
      isLoading,
      isAuthenticated: Boolean(accessToken && refreshToken),
      loginWithTokens,
      logout,
      getAccessToken: () => accessToken,
    }),
    [accessToken, refreshToken, user, isLoading, loginWithTokens, logout],
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


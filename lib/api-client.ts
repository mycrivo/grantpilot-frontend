"use client";

export type ApiErrorEnvelope = {
  error_code: string;
  message: string;
  details?: Record<string, unknown>;
  request_id?: string;
};

type AuthSessionHandlers = {
  getAccessToken: () => string | null;
  getRefreshToken: () => string | null;
  setTokens: (tokens: { access_token: string; refresh_token: string; expires_in?: number }) => void;
  clearAuthState: () => void;
};

export type ApiRequestOptions = {
  auth?: boolean;
  retryOn401?: boolean;
};

export class ApiClientError extends Error {
  status: number;
  errorCode?: string;
  details?: Record<string, unknown>;
  requestId?: string;

  constructor(status: number, message: string, envelope?: Partial<ApiErrorEnvelope>) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.errorCode = envelope?.error_code;
    this.details = envelope?.details;
    this.requestId = envelope?.request_id;
  }
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

let authHandlers: AuthSessionHandlers | null = null;

export function configureApiClientAuthHandlers(handlers: AuthSessionHandlers | null) {
  authHandlers = handlers;
}

function getLoginRedirectUrl() {
  if (typeof window === "undefined") {
    return "/login";
  }

  const currentPath = `${window.location.pathname}${window.location.search}`;
  return `/login?next=${encodeURIComponent(currentPath)}`;
}

function parseSafeJson<T>(text: string): T | null {
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

function buildUserMessage(status: number, envelope: ApiErrorEnvelope | null) {
  if (status === 429) {
    return "You've hit a rate limit. Please wait a moment and try again.";
  }

  if (status >= 500) {
    return "We're experiencing a temporary issue. Please try again shortly.";
  }

  if (envelope?.message) {
    return envelope.message;
  }

  return "Request failed. Please try again.";
}

function forceLoginRedirect() {
  if (!authHandlers) {
    return;
  }

  authHandlers.clearAuthState();
  if (typeof window !== "undefined") {
    window.location.assign(getLoginRedirectUrl());
  }
}

async function requestRefreshToken() {
  if (!authHandlers) {
    return false;
  }

  const refreshToken = authHandlers.getRefreshToken();
  if (!refreshToken) {
    return false;
  }

  const refreshResponse = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!refreshResponse.ok) {
    forceLoginRedirect();
    return false;
  }

  const refreshPayload = (await refreshResponse.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  authHandlers.setTokens({
    access_token: refreshPayload.access_token,
    refresh_token: refreshPayload.refresh_token,
    expires_in: refreshPayload.expires_in,
  });

  return true;
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
  options: ApiRequestOptions = {},
): Promise<T> {
  if (!API_BASE_URL) {
    throw new ApiClientError(500, "NEXT_PUBLIC_API_BASE_URL is not configured.");
  }

  const auth = options.auth ?? true;
  const retryOn401 = options.retryOn401 ?? true;
  const headers = new Headers(init.headers);

  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }

  if (auth && authHandlers?.getAccessToken()) {
    headers.set("Authorization", `Bearer ${authHandlers.getAccessToken()}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  });

  if (response.status === 401 && auth && retryOn401) {
    const refreshSucceeded = await requestRefreshToken();
    if (refreshSucceeded) {
      return apiRequest<T>(path, init, { ...options, retryOn401: false });
    }
  }

  if (response.status === 401 && auth) {
    forceLoginRedirect();
  }

  if (!response.ok) {
    const text = await response.text();
    const envelope = parseSafeJson<ApiErrorEnvelope>(text);
    throw new ApiClientError(response.status, buildUserMessage(response.status, envelope), envelope ?? undefined);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}


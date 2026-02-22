"use client";

const NEXT_INTENT_KEY = "grantpilot.auth.next";
const OPPORTUNITY_INTENT_KEY = "grantpilot.start.opportunity_id";

function canUseStorage() {
  return typeof window !== "undefined";
}

function isSafeInternalPath(value: string) {
  return value.startsWith("/") && !value.startsWith("//");
}

export function storeNextIntent(nextValue: string | null) {
  if (!canUseStorage() || !nextValue) {
    return;
  }

  if (isSafeInternalPath(nextValue)) {
    window.sessionStorage.setItem(NEXT_INTENT_KEY, nextValue);
  }
}

export function getAndClearNextIntent() {
  if (!canUseStorage()) {
    return null;
  }

  const value = window.sessionStorage.getItem(NEXT_INTENT_KEY);
  window.sessionStorage.removeItem(NEXT_INTENT_KEY);
  if (!value || !isSafeInternalPath(value)) {
    return null;
  }

  return value;
}

export function getAndClearOpportunityIntent() {
  if (!canUseStorage()) {
    return null;
  }

  const value = window.sessionStorage.getItem(OPPORTUNITY_INTENT_KEY);
  window.sessionStorage.removeItem(OPPORTUNITY_INTENT_KEY);
  return value;
}

export function getSafeNextFromQuery(nextValue: string | null) {
  if (!nextValue) {
    return null;
  }

  return isSafeInternalPath(nextValue) ? nextValue : null;
}

function parseOpportunityIdFromObject(value: unknown) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const objectValue = value as { redirect_intent?: { opportunity_id?: string }; opportunity_id?: string };
  if (objectValue.redirect_intent?.opportunity_id) {
    return objectValue.redirect_intent.opportunity_id;
  }

  if (objectValue.opportunity_id) {
    return objectValue.opportunity_id;
  }

  return null;
}

function parseStatePayload(state: string) {
  const directParsed = parseOpportunityIdFromObject(JSON.parse(state));
  if (directParsed) {
    return directParsed;
  }

  return null;
}

function tryParseJsonState(state: string) {
  try {
    return parseStatePayload(state);
  } catch {
    return null;
  }
}

function tryParseJwtState(state: string) {
  try {
    const parts = state.split(".");
    if (parts.length !== 3) {
      return null;
    }

    const normalized = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const decoded = atob(normalized);
    const parsed = JSON.parse(decoded) as unknown;
    return parseOpportunityIdFromObject(parsed);
  } catch {
    return null;
  }
}

export function getOpportunityIdFromState(state: string | null) {
  if (!state) {
    return null;
  }

  return (
    tryParseJsonState(state) ??
    tryParseJsonState(decodeURIComponent(state)) ??
    tryParseJwtState(state)
  );
}

export function resolveRedirectAfterAuth(params: {
  queryNext: string | null;
  state: string | null;
}) {
  const opportunityIdFromStorage = getAndClearOpportunityIntent();
  if (opportunityIdFromStorage) {
    return `/start?opportunity_id=${encodeURIComponent(opportunityIdFromStorage)}`;
  }

  const nextFromQuery = getSafeNextFromQuery(params.queryNext);
  if (nextFromQuery) {
    return nextFromQuery;
  }

  const nextFromStorage = getAndClearNextIntent();
  if (nextFromStorage) {
    return nextFromStorage;
  }

  const stateOpportunityId = getOpportunityIdFromState(params.state);
  if (stateOpportunityId) {
    return `/start?opportunity_id=${encodeURIComponent(stateOpportunityId)}`;
  }

  return "/dashboard";
}


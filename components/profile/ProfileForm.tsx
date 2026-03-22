"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { ApiClientError } from "@/lib/api-client";
import type {
  FocusSector,
  NgoProfile,
  PastProject as NgoPastProject,
  ProfileCompleteness as NgoProfileCompleteness,
  ProfileSavePayload,
} from "@/lib/profile-types";
import {
  ProfileNotFoundError,
  createProfile,
  fetchCompleteness,
  fetchProfile,
  updateProfile,
} from "@/lib/profile-service";
import { ErrorDisplay } from "@/components/shared/ErrorDisplay";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { CompletenessBar } from "@/components/profile/CompletenessBar";
import { PastProjectCard } from "@/components/profile/PastProjectCard";
import { TagInput } from "@/components/profile/TagInput";

type ProfileFormProps = {
  fromStart: boolean;
  opportunityId?: string;
};

type ProfilePageState =
  | { mode: "LOADING" }
  | { mode: "NO_PROFILE" }
  | { mode: "DRAFT"; profile: NgoProfile; completeness: NgoProfileCompleteness | null }
  | { mode: "COMPLETE"; profile: NgoProfile; completeness: NgoProfileCompleteness | null }
  | { mode: "EDITING"; profile: NgoProfile; completeness: NgoProfileCompleteness | null }
  | { mode: "RECOVERABLE_ERROR"; error: string }
  | { mode: "SAVE_ERROR"; error: string; fieldErrors?: Record<string, string> };

type SaveErrorState = Extract<ProfilePageState, { mode: "SAVE_ERROR" }>;
type FieldErrors = Record<string, string>;

const emptyProject = (): NgoPastProject => ({
  title: "",
  donor: null,
  duration: null,
  location: null,
  summary: null,
});

const defaultProfile = (): NgoProfile => ({
  organization_name: "",
  country_of_registration: "",
  year_of_establishment: null,
  website: null,
  contact_person_name: null,
  contact_email: null,
  mission_statement: "",
  focus_sectors: [],
  geographic_areas_of_work: [],
  target_groups: [],
  past_projects: [emptyProject()],
  full_time_staff: null,
  annual_budget_amount: null,
  annual_budget_currency: null,
  monitoring_and_evaluation_practices: null,
  funders_worked_with_before: [],
  profile_status: "DRAFT",
  completeness_score: 0,
  missing_fields: [],
});

const NO_PROFILE_COMPLETENESS: NgoProfileCompleteness = {
  profile_status: "DRAFT",
  completeness_score: 0,
  missing_fields: [
    "organization_name",
    "country_of_registration",
    "mission_statement",
    "focus_sectors",
    "geographic_areas_of_work",
    "target_groups",
    "past_projects",
  ],
};

const focusSectors: FocusSector[] = [
  "EDUCATION",
  "HEALTH",
  "AGRICULTURE",
  "WASH",
  "GOVERNANCE",
  "CLIMATE",
  "GENDER",
  "LIVELIHOODS",
  "PROTECTION",
  "OTHER",
];

const countries = [
  "Kenya",
  "Uganda",
  "Tanzania",
  "Rwanda",
  "Nigeria",
  "Ghana",
  "India",
  "Pakistan",
  "Bangladesh",
  "United Kingdom",
  "United States",
];

const currencies = ["USD", "GBP", "EUR", "INR", "KES", "NGN", "UGX", "TZS"];
const MISSING_FIELD_LABELS: Record<string, string> = {
  organization_name: "Organisation Name",
  country_of_registration: "Country of Registration",
  mission_statement: "Mission Statement",
  focus_sectors: "Focus Sectors",
  geographic_areas_of_work: "Geographic Areas of Work",
  target_groups: "Target Groups",
  past_projects: "Past Projects",
};

function normalizeNullable(text: string) {
  const trimmed = text.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidWebsite(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function validateProfile(profile: NgoProfile): FieldErrors {
  const errors: FieldErrors = {};
  const email = profile.contact_email?.trim();
  const website = profile.website?.trim();

  if (email && !isValidEmail(email)) {
    errors.contact_email = "Enter a valid email address.";
  }

  if (website && !isValidWebsite(website)) {
    errors.website = "Enter a valid website URL (include http:// or https://).";
  }

  if (profile.year_of_establishment !== null) {
    const currentYear = new Date().getFullYear();
    if (
      !Number.isInteger(profile.year_of_establishment) ||
      profile.year_of_establishment < 1800 ||
      profile.year_of_establishment > currentYear
    ) {
      errors.year_of_establishment = `Enter a valid year between 1800 and ${currentYear}.`;
    }
  }

  return errors;
}

function snapshot(profile: NgoProfile) {
  return JSON.stringify(profile);
}

function toFieldKey(loc: unknown): string | null {
  if (!Array.isArray(loc)) {
    return null;
  }
  const segments = [...loc];
  if (segments[0] === "body") {
    segments.shift();
  }
  if (segments.length === 0) {
    return null;
  }
  return segments.map((segment) => String(segment)).join(".");
}

function extractFieldErrors(details: unknown): FieldErrors {
  if (!details || typeof details !== "object") {
    return {};
  }
  const maybeErrors = (details as { errors?: unknown }).errors;
  if (!Array.isArray(maybeErrors)) {
    return {};
  }

  const mapped: FieldErrors = {};
  for (const item of maybeErrors) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const record = item as { loc?: unknown; msg?: unknown };
    const key = toFieldKey(record.loc);
    if (!key || typeof record.msg !== "string" || mapped[key]) {
      continue;
    }
    mapped[key] = record.msg;
  }

  return mapped;
}

function presentText(value: string | null | undefined) {
  if (!value) {
    return "Not provided";
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : "Not provided";
}

function presentNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? String(value) : "Not provided";
}

function presentList(values: string[] | null | undefined) {
  if (!values || values.length === 0) {
    return [];
  }
  return values.filter((item) => item.trim().length > 0);
}

function relativeLastSaved(updatedAt: string, nowMs: number) {
  const timestamp = new Date(updatedAt).getTime();
  if (Number.isNaN(timestamp)) {
    return null;
  }
  const diff = Math.max(0, nowMs - timestamp);
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) {
    return "just now";
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export function ProfileForm({ fromStart, opportunityId }: ProfileFormProps) {
  const router = useRouter();
  const [pageState, setPageState] = useState<ProfilePageState>({ mode: "LOADING" });
  const [formProfile, setFormProfile] = useState<NgoProfile>(defaultProfile());
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [saveError, setSaveError] = useState<SaveErrorState | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [toast, setToast] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const [redirecting, setRedirecting] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const syncedSnapshot = useRef(snapshot(defaultProfile()));
  const completeModeSnapshotRef = useRef<{ profile: NgoProfile; completeness: NgoProfileCompleteness | null } | null>(
    null,
  );

  const isDirty = useMemo(() => snapshot(formProfile) !== syncedSnapshot.current, [formProfile]);
  const isCreateMode = pageState.mode === "NO_PROFILE";

  useEffect(() => {
    if (!toast) {
      return;
    }
    const timer = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const loadProfile = useCallback(async () => {
    setPageState({ mode: "LOADING" });
    setFieldErrors({});
    setSaveError(null);
    setSavedMessage(null);

    try {
      const profile = await fetchProfile();
      const normalizedProfile: NgoProfile = {
        ...profile,
        past_projects: profile.past_projects.length > 0 ? profile.past_projects : [emptyProject()],
      };
      setFormProfile(normalizedProfile);
      syncedSnapshot.current = snapshot(normalizedProfile);

      let completeness: NgoProfileCompleteness | null = null;
      try {
        completeness = await fetchCompleteness();
      } catch {
        completeness = null;
      }

      setPageState(
        profile.profile_status === "COMPLETE"
          ? (() => {
              completeModeSnapshotRef.current = { profile: normalizedProfile, completeness };
              return { mode: "COMPLETE", profile: normalizedProfile, completeness } as const;
            })()
          : (() => {
              completeModeSnapshotRef.current = null;
              return { mode: "DRAFT", profile: normalizedProfile, completeness } as const;
            })(),
      );
    } catch (loadError) {
      if (loadError instanceof ProfileNotFoundError) {
        const empty = defaultProfile();
        setFormProfile(empty);
        syncedSnapshot.current = snapshot(empty);
        completeModeSnapshotRef.current = null;
        setPageState({ mode: "NO_PROFILE" });
        return;
      }

      if (loadError instanceof ApiClientError || loadError instanceof TypeError) {
        setPageState({
          mode: "RECOVERABLE_ERROR",
          error: "We're experiencing a temporary issue. Please try again shortly.",
        });
        return;
      }

      setPageState({
        mode: "RECOVERABLE_ERROR",
        error: "An unexpected error occurred. Please refresh the page.",
      });
    }
  }, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (!isDirty) {
        return;
      }
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  const applyProfileChange = useCallback((mutator: (prev: NgoProfile) => NgoProfile) => {
    setFormProfile((prev) => {
      const next = mutator(prev);
      setPageState((current) => {
        if (current.mode === "COMPLETE") {
          return { mode: "EDITING", profile: next, completeness: current.completeness };
        }
        if (current.mode === "DRAFT" || current.mode === "EDITING") {
          return { ...current, profile: next };
        }
        return current;
      });
      return next;
    });
    setSaveError(null);
    setSavedMessage(null);
  }, []);

  const updateProject = (index: number, nextProject: NgoPastProject) => {
    applyProfileChange((prev) => {
      const nextProjects = [...prev.past_projects];
      nextProjects[index] = nextProject;
      return { ...prev, past_projects: nextProjects };
    });
  };

  const saveProfile = async () => {
    if (pageState.mode === "LOADING" || pageState.mode === "RECOVERABLE_ERROR") {
      return;
    }

    setSavedMessage(null);
    const validationErrors = validateProfile(formProfile);
    setFieldErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      setSaveError({ mode: "SAVE_ERROR", error: "Some fields need attention.", fieldErrors: validationErrors });
      return;
    }

    setSaving(true);
    setSaveError(null);
    try {
      const payload: ProfileSavePayload = {
        ...formProfile,
        organization_name: formProfile.organization_name.trim(),
        country_of_registration: formProfile.country_of_registration.trim(),
        mission_statement: formProfile.mission_statement.trim(),
        contact_person_name: normalizeNullable(formProfile.contact_person_name ?? ""),
        contact_email: normalizeNullable(formProfile.contact_email ?? ""),
        website: normalizeNullable(formProfile.website ?? ""),
        monitoring_and_evaluation_practices: normalizeNullable(formProfile.monitoring_and_evaluation_practices ?? ""),
        annual_budget_currency: normalizeNullable(formProfile.annual_budget_currency ?? ""),
        past_projects: formProfile.past_projects.map((project) => ({
          title: project.title.trim(),
          donor: normalizeNullable(project.donor ?? ""),
          duration: normalizeNullable(project.duration ?? ""),
          location: normalizeNullable(project.location ?? ""),
          summary: normalizeNullable(project.summary ?? ""),
        })),
      };

      let response: NgoProfile;
      if (pageState.mode === "NO_PROFILE") {
        try {
          response = await createProfile(payload);
        } catch (createError) {
          if (createError instanceof ApiClientError && createError.status === 409) {
            response = await updateProfile(payload);
          } else {
            throw createError;
          }
        }
      } else {
        response = await updateProfile(payload);
      }

      const nextProfile: NgoProfile = {
        ...response,
        past_projects: response.past_projects.length > 0 ? response.past_projects : [emptyProject()],
      };
      setFormProfile(nextProfile);
      syncedSnapshot.current = snapshot(nextProfile);

      let nextCompleteness: NgoProfileCompleteness | null = null;
      try {
        nextCompleteness = await fetchCompleteness();
      } catch {
        nextCompleteness = null;
      }

      const nextMode: "DRAFT" | "COMPLETE" = response.profile_status === "COMPLETE" ? "COMPLETE" : "DRAFT";
      if (nextMode === "COMPLETE") {
        completeModeSnapshotRef.current = { profile: nextProfile, completeness: nextCompleteness };
      } else {
        completeModeSnapshotRef.current = null;
      }
      setPageState({ mode: nextMode, profile: nextProfile, completeness: nextCompleteness });
      setFieldErrors({});
      setSaveError(null);

      const successMessage =
        response.profile_status === "COMPLETE"
          ? "Profile complete — you can now run Fit Scans"
          : "Profile saved — complete the remaining fields to unlock Fit Scans";
      setSavedMessage(successMessage);
      setToast({ tone: "success", message: "Profile saved successfully" });

      if (fromStart && opportunityId && response.profile_status === "COMPLETE") {
        setRedirecting(true);
        setSavedMessage("Profile complete — checking your fit now…");
        window.setTimeout(() => {
          router.push(`/start?opportunity_id=${encodeURIComponent(opportunityId)}&source=profile`);
        }, 900);
      }
    } catch (saveFailure) {
      if (saveFailure instanceof ApiClientError) {
        if (saveFailure.status === 422) {
          const mapped = extractFieldErrors(saveFailure.details);
          const message = Object.keys(mapped).length > 0 ? "Some fields need attention." : saveFailure.message;
          setFieldErrors(mapped);
          setSaveError({ mode: "SAVE_ERROR", error: message, fieldErrors: mapped });
          setToast({ tone: "error", message });
        } else if (saveFailure.status === 401) {
          const message = "Your session expired. Please sign in again.";
          setSaveError({ mode: "SAVE_ERROR", error: message });
          setToast({ tone: "error", message });
        } else if (saveFailure.status >= 500) {
          const message = "Save failed due to a temporary issue. Your changes are preserved — please try again.";
          setSaveError({ mode: "SAVE_ERROR", error: message });
          setToast({ tone: "error", message });
        } else {
          const message = saveFailure.status === 409 ? "Save failed. Please try again." : saveFailure.message;
          setSaveError({ mode: "SAVE_ERROR", error: message });
          setToast({ tone: "error", message });
        }
      } else if (saveFailure instanceof TypeError) {
        const message = "Unable to reach the server. Please check your connection and try again.";
        setSaveError({ mode: "SAVE_ERROR", error: message });
        setToast({ tone: "error", message });
      } else {
        const message = "An unexpected error occurred. Please refresh the page.";
        setSaveError({ mode: "SAVE_ERROR", error: message });
        setToast({ tone: "error", message });
      }
    } finally {
      setSaving(false);
    }
  };

  const startEditing = () => {
    if (pageState.mode !== "COMPLETE") {
      return;
    }
    setPageState({ mode: "EDITING", profile: formProfile, completeness: pageState.completeness });
    setSaveError(null);
    setFieldErrors({});
    setSavedMessage(null);
  };

  const cancelEditing = () => {
    if (pageState.mode !== "EDITING") {
      return;
    }
    if (isDirty) {
      const confirmed = window.confirm("Discard your unsaved changes?");
      if (!confirmed) {
        return;
      }
    }

    const snapshotData = completeModeSnapshotRef.current;
    if (!snapshotData) {
      return;
    }

    setFormProfile(snapshotData.profile);
    syncedSnapshot.current = snapshot(snapshotData.profile);
    setFieldErrors({});
    setSaveError(null);
    setSavedMessage(null);
    setPageState({
      mode: "COMPLETE",
      profile: snapshotData.profile,
      completeness: snapshotData.completeness,
    });
  };

  if (pageState.mode === "LOADING") {
    return <LoadingSkeleton variant="page" lines={6} />;
  }

  if (pageState.mode === "RECOVERABLE_ERROR") {
    return (
      <section className="space-y-6">
        <ErrorDisplay message={pageState.error} onRetry={() => void loadProfile()} />
      </section>
    );
  }

  const profile = formProfile;
  const budgetDisplay =
    typeof profile.annual_budget_amount === "number"
      ? `${profile.annual_budget_currency ?? ""} ${profile.annual_budget_amount}`.trim()
      : "Not provided";
  const focusSectorItems = presentList(profile.focus_sectors as string[]);
  const areaItems = presentList(profile.geographic_areas_of_work);
  const targetItems = presentList(profile.target_groups);
  const funderItems = presentList(profile.funders_worked_with_before);
  const completeness =
    pageState.mode === "NO_PROFILE"
      ? NO_PROFILE_COMPLETENESS
      : pageState.mode === "DRAFT" || pageState.mode === "COMPLETE" || pageState.mode === "EDITING"
        ? pageState.completeness
        : null;
  const draftMissingLabels =
    pageState.mode === "DRAFT" && completeness
      ? completeness.missing_fields.map((field) => MISSING_FIELD_LABELS[field] ?? field)
      : [];
  const draftMissingCount = pageState.mode === "DRAFT" && completeness ? completeness.missing_fields.length : 0;
  const lastSavedRelative = profile.updated_at ? relativeLastSaved(profile.updated_at, nowMs) : null;

  const statusBadge =
    pageState.mode === "NO_PROFILE"
      ? {
          text: "New profile",
          className: "border-brand-border bg-brand-card-bg text-brand-text-secondary",
        }
      : pageState.mode === "DRAFT"
        ? {
            text: `Draft — ${draftMissingCount} fields missing`,
            className: "border-brand-warning/30 bg-brand-warning/10 text-brand-warning",
          }
        : {
            text: "Complete \u2713",
            className: "border-brand-success/30 bg-brand-success/10 text-brand-success",
          };

  if (pageState.mode === "COMPLETE") {
    return (
      <section className="space-y-6">
        {toast ? (
          <div
            className={`fixed right-4 top-4 z-50 rounded-[10px] border px-4 py-3 text-sm font-medium shadow-lg ${
              toast.tone === "success"
                ? "border-brand-success/30 bg-brand-success/10 text-brand-success"
                : "border-brand-error/30 bg-brand-error/10 text-brand-error"
            }`}
            role="status"
            aria-live="polite"
          >
            {toast.message}
          </div>
        ) : null}

        <CompletenessBar completeness={completeness} />

        {savedMessage ? (
          <div className="card border-brand-success/30 bg-brand-success/5">
            <p className="text-sm font-medium text-brand-success">{savedMessage}</p>
          </div>
        ) : null}

        <div className="card space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <h3>Your Organisation Profile</h3>
              <p className="text-secondary">Keep your profile current for the best fit scan results.</p>
            </div>
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusBadge.className}`}>
              {statusBadge.text}
            </span>
            <button type="button" className="btn-primary" onClick={startEditing}>
              Edit Profile
            </button>
          </div>

          <div className="space-y-3">
            <h4>Section 1: Organisation Identity</h4>
            <div className="grid gap-4 md:grid-cols-2">
              <div><p className="text-xs text-secondary">Organisation Name</p><p>{presentText(profile.organization_name)}</p></div>
              <div><p className="text-xs text-secondary">Country of Registration</p><p>{presentText(profile.country_of_registration)}</p></div>
              <div><p className="text-xs text-secondary">Year of Establishment</p><p>{presentNumber(profile.year_of_establishment)}</p></div>
              <div><p className="text-xs text-secondary">Website</p><p>{presentText(profile.website)}</p></div>
              <div><p className="text-xs text-secondary">Contact Person</p><p>{presentText(profile.contact_person_name)}</p></div>
              <div><p className="text-xs text-secondary">Contact Email</p><p>{presentText(profile.contact_email)}</p></div>
            </div>
          </div>

          <div className="space-y-3">
            <h4>Section 2: Mission &amp; Focus</h4>
            <div>
              <p className="text-xs text-secondary">Mission Statement</p>
              <p className="mt-1 whitespace-pre-wrap">{presentText(profile.mission_statement)}</p>
            </div>
            <div>
              <p className="text-xs text-secondary">Focus Sectors</p>
              {focusSectorItems.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {focusSectorItems.map((item) => (
                    <span key={item} className="rounded-full border border-brand-border px-3 py-1 text-sm">
                      {item}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-1">Not provided</p>
              )}
            </div>
            <div>
              <p className="text-xs text-secondary">Geographic Areas of Work</p>
              {areaItems.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {areaItems.map((item) => (
                    <span key={item} className="rounded-full border border-brand-border px-3 py-1 text-sm">
                      {item}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-1">Not provided</p>
              )}
            </div>
            <div>
              <p className="text-xs text-secondary">Target Groups</p>
              {targetItems.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {targetItems.map((item) => (
                    <span key={item} className="rounded-full border border-brand-border px-3 py-1 text-sm">
                      {item}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-1">Not provided</p>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <h4>Section 3: Track Record</h4>
            {profile.past_projects.length > 0 ? (
              <div className="space-y-3">
                {profile.past_projects.map((project, index) => (
                  <div key={`${project.id ?? "project"}-${index}`} className="rounded-[10px] border border-brand-border p-4">
                    <p className="font-semibold">{presentText(project.title)}</p>
                    <p className="text-sm text-secondary">Donor: {presentText(project.donor)}</p>
                    <p className="text-sm text-secondary">Duration: {presentText(project.duration)}</p>
                    <p className="text-sm text-secondary">Location: {presentText(project.location)}</p>
                    <p className="mt-2 text-sm">{presentText(project.summary)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p>Not provided</p>
            )}
          </div>

          <div className="space-y-3">
            <h4>Section 4: Capacity</h4>
            <div className="grid gap-4 md:grid-cols-2">
              <div><p className="text-xs text-secondary">Full-Time Staff</p><p>{presentNumber(profile.full_time_staff)}</p></div>
              <div><p className="text-xs text-secondary">Annual Budget</p><p>{budgetDisplay}</p></div>
            </div>
            <div>
              <p className="text-xs text-secondary">M&amp;E Practices</p>
              <p className="mt-1 whitespace-pre-wrap">{presentText(profile.monitoring_and_evaluation_practices)}</p>
            </div>
            <div>
              <p className="text-xs text-secondary">Previous Funders</p>
              {funderItems.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {funderItems.map((item) => (
                    <span key={item} className="rounded-full border border-brand-border px-3 py-1 text-sm">
                      {item}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-1">Not provided</p>
              )}
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      {toast ? (
        <div
          className={`fixed right-4 top-4 z-50 rounded-[10px] border px-4 py-3 text-sm font-medium shadow-lg ${
            toast.tone === "success"
              ? "border-brand-success/30 bg-brand-success/10 text-brand-success"
              : "border-brand-error/30 bg-brand-error/10 text-brand-error"
          }`}
          role="status"
          aria-live="polite"
        >
          {toast.message}
        </div>
      ) : null}

      <CompletenessBar completeness={completeness} />

      {fromStart ? (
        <div className="card border-brand-warning/20 bg-brand-warning/5">
          <h4>Complete your profile to run your Fit Scan</h4>
          <p className="mt-2 text-secondary">We need your core organisation details before we can check opportunity fit.</p>
        </div>
      ) : null}

      {pageState.mode === "DRAFT" && draftMissingLabels.length > 0 ? (
        <div className="card border-brand-warning/20 bg-brand-warning/5">
          <p className="text-sm text-secondary">Missing: {draftMissingLabels.join(", ")}</p>
        </div>
      ) : null}

      {savedMessage ? (
        <div className="card border-brand-success/30 bg-brand-success/5">
          <p className="text-sm font-medium text-brand-success">{savedMessage}</p>
        </div>
      ) : null}

      <div className="card space-y-6">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h3>{isCreateMode ? "Create Your Organisation Profile" : "Your Organisation Profile"}</h3>
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusBadge.className}`}>
              {statusBadge.text}
            </span>
          </div>
          <p className="text-secondary">
            {isCreateMode
              ? "Tell us about your organisation so we can match you with the right funding opportunities."
              : "Keep your profile current for the best fit scan results."}
          </p>
          {lastSavedRelative ? <p className="text-xs text-secondary">Last saved: {lastSavedRelative}</p> : null}
        </div>

        <div className="space-y-4">
          <h4>Section 1: Organisation Identity (Required)</h4>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-brand-text-primary">Organisation Name *</label>
              <input
                value={profile.organization_name}
                onChange={(event) => applyProfileChange((prev) => ({ ...prev, organization_name: event.target.value }))}
                className="mt-1 h-11 w-full rounded-[8px] border border-brand-border bg-brand-card-bg px-3 text-[14px] outline-none focus:border-brand-primary"
              />
              {fieldErrors.organization_name ? <p className="mt-1 text-sm text-brand-error">{fieldErrors.organization_name}</p> : null}
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-text-primary">Country of Registration *</label>
              <input
                list="country-options"
                value={profile.country_of_registration}
                onChange={(event) =>
                  applyProfileChange((prev) => ({ ...prev, country_of_registration: event.target.value }))
                }
                className="mt-1 h-11 w-full rounded-[8px] border border-brand-border bg-brand-card-bg px-3 text-[14px] outline-none focus:border-brand-primary"
              />
              {fieldErrors.country_of_registration ? (
                <p className="mt-1 text-sm text-brand-error">{fieldErrors.country_of_registration}</p>
              ) : null}
              <datalist id="country-options">
                {countries.map((country) => (
                  <option key={country} value={country} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-text-primary">Year of Establishment</label>
              <input
                type="number"
                value={profile.year_of_establishment ?? ""}
                onChange={(event) =>
                  applyProfileChange((prev) => ({
                    ...prev,
                    year_of_establishment: event.target.value ? Number(event.target.value) : null,
                  }))
                }
                className="mt-1 h-11 w-full rounded-[8px] border border-brand-border bg-brand-card-bg px-3 text-[14px] outline-none focus:border-brand-primary"
              />
              {fieldErrors.year_of_establishment ? (
                <p className="mt-1 text-sm text-brand-error">{fieldErrors.year_of_establishment}</p>
              ) : null}
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-text-primary">Website</label>
              <input
                value={profile.website ?? ""}
                onChange={(event) => applyProfileChange((prev) => ({ ...prev, website: event.target.value }))}
                placeholder="https://example.org"
                className="mt-1 h-11 w-full rounded-[8px] border border-brand-border bg-brand-card-bg px-3 text-[14px] outline-none focus:border-brand-primary"
              />
              {fieldErrors.website ? <p className="mt-1 text-sm text-brand-error">{fieldErrors.website}</p> : null}
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-text-primary">Contact Person Name</label>
              <input
                value={profile.contact_person_name ?? ""}
                onChange={(event) =>
                  applyProfileChange((prev) => ({ ...prev, contact_person_name: event.target.value }))
                }
                className="mt-1 h-11 w-full rounded-[8px] border border-brand-border bg-brand-card-bg px-3 text-[14px] outline-none focus:border-brand-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-text-primary">Contact Email</label>
              <input
                value={profile.contact_email ?? ""}
                onChange={(event) => applyProfileChange((prev) => ({ ...prev, contact_email: event.target.value }))}
                className="mt-1 h-11 w-full rounded-[8px] border border-brand-border bg-brand-card-bg px-3 text-[14px] outline-none focus:border-brand-primary"
              />
              {fieldErrors.contact_email ? <p className="mt-1 text-sm text-brand-error">{fieldErrors.contact_email}</p> : null}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h4>Section 2: Mission &amp; Focus (Required)</h4>
          <div>
            <label className="block text-sm font-medium text-brand-text-primary">Mission Statement *</label>
            <p className="text-secondary">200-500 chars recommended.</p>
            <textarea
              value={profile.mission_statement}
              onChange={(event) => applyProfileChange((prev) => ({ ...prev, mission_statement: event.target.value }))}
              rows={4}
              className="mt-1 w-full rounded-[8px] border border-brand-border bg-brand-card-bg px-3 py-2 text-[14px] outline-none focus:border-brand-primary"
            />
            {fieldErrors.mission_statement ? <p className="mt-1 text-sm text-brand-error">{fieldErrors.mission_statement}</p> : null}
          </div>

          <div>
            <label className="block text-sm font-medium text-brand-text-primary">Focus Sectors *</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {focusSectors.map((sector) => {
                const active = profile.focus_sectors.includes(sector);
                return (
                  <button
                    key={sector}
                    type="button"
                    className={`rounded-full border px-3 py-1 text-sm font-medium ${
                      active
                        ? "border-brand-primary bg-brand-primary text-white"
                        : "border-brand-border bg-brand-card-bg text-brand-text-primary"
                    }`}
                    onClick={() =>
                      applyProfileChange((prev) => ({
                        ...prev,
                        focus_sectors: active
                          ? prev.focus_sectors.filter((item) => item !== sector)
                          : [...prev.focus_sectors, sector],
                      }))
                    }
                  >
                    {sector}
                  </button>
                );
              })}
            </div>
            {fieldErrors.focus_sectors ? <p className="mt-1 text-sm text-brand-error">{fieldErrors.focus_sectors}</p> : null}
          </div>

          <TagInput
            label="Geographic Areas of Work *"
            value={profile.geographic_areas_of_work}
            onChange={(next) => applyProfileChange((prev) => ({ ...prev, geographic_areas_of_work: next }))}
          />
          {fieldErrors.geographic_areas_of_work ? (
            <p className="mt-1 text-sm text-brand-error">{fieldErrors.geographic_areas_of_work}</p>
          ) : null}
          <TagInput
            label="Target Groups *"
            value={profile.target_groups}
            onChange={(next) => applyProfileChange((prev) => ({ ...prev, target_groups: next }))}
          />
          {fieldErrors.target_groups ? <p className="mt-1 text-sm text-brand-error">{fieldErrors.target_groups}</p> : null}
        </div>

        <div className="space-y-4">
          <h4>Section 3: Track Record (Required)</h4>
          <p className="text-secondary">At least one project with a title is required for full completeness.</p>
          <div className="space-y-3">
            {profile.past_projects.map((project, index) => (
              <PastProjectCard
                key={`${project.id ?? "new"}-${index}`}
                index={index}
                project={project}
                errors={{
                  title: fieldErrors[`past_projects.${index}.title`],
                  donor: fieldErrors[`past_projects.${index}.donor`],
                  duration: fieldErrors[`past_projects.${index}.duration`],
                  location: fieldErrors[`past_projects.${index}.location`],
                  summary: fieldErrors[`past_projects.${index}.summary`],
                }}
                onChange={(nextProject) => updateProject(index, nextProject)}
                onRemove={() =>
                  applyProfileChange((prev) => ({
                    ...prev,
                    past_projects: prev.past_projects.filter((_, itemIndex) => itemIndex !== index),
                  }))
                }
              />
            ))}
          </div>
          {fieldErrors.past_projects ? <p className="mt-1 text-sm text-brand-error">{fieldErrors.past_projects}</p> : null}
          <button
            type="button"
            className="h-11 rounded-[8px] border border-brand-border px-4 text-sm font-semibold text-brand-text-primary"
            onClick={() => applyProfileChange((prev) => ({ ...prev, past_projects: [...prev.past_projects, emptyProject()] }))}
          >
            + Add another project
          </button>
        </div>

        <div className="space-y-4">
          <h4>Section 4: Capacity (Optional)</h4>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-brand-text-primary">Full-Time Staff</label>
              <input
                type="number"
                value={profile.full_time_staff ?? ""}
                onChange={(event) =>
                  applyProfileChange((prev) => ({
                    ...prev,
                    full_time_staff: event.target.value ? Number(event.target.value) : null,
                  }))
                }
                className="mt-1 h-11 w-full rounded-[8px] border border-brand-border bg-brand-card-bg px-3 text-[14px] outline-none focus:border-brand-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-text-primary">Annual Budget Amount</label>
              <input
                type="number"
                value={profile.annual_budget_amount ?? ""}
                onChange={(event) =>
                  applyProfileChange((prev) => ({
                    ...prev,
                    annual_budget_amount: event.target.value ? Number(event.target.value) : null,
                  }))
                }
                className="mt-1 h-11 w-full rounded-[8px] border border-brand-border bg-brand-card-bg px-3 text-[14px] outline-none focus:border-brand-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-text-primary">Annual Budget Currency</label>
              <select
                value={profile.annual_budget_currency ?? ""}
                onChange={(event) =>
                  applyProfileChange((prev) => ({
                    ...prev,
                    annual_budget_currency: event.target.value || null,
                  }))
                }
                className="mt-1 h-11 w-full rounded-[8px] border border-brand-border bg-brand-card-bg px-3 text-[14px] outline-none focus:border-brand-primary"
              >
                <option value="">Select currency</option>
                {currencies.map((currency) => (
                  <option key={currency} value={currency}>
                    {currency}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-brand-text-primary">M&amp;E Practices</label>
              <textarea
                value={profile.monitoring_and_evaluation_practices ?? ""}
                onChange={(event) =>
                  applyProfileChange((prev) => ({ ...prev, monitoring_and_evaluation_practices: event.target.value }))
                }
                rows={3}
                className="mt-1 w-full rounded-[8px] border border-brand-border bg-brand-card-bg px-3 py-2 text-[14px] outline-none focus:border-brand-primary"
              />
              {fieldErrors.monitoring_and_evaluation_practices ? (
                <p className="mt-1 text-sm text-brand-error">{fieldErrors.monitoring_and_evaluation_practices}</p>
              ) : null}
            </div>
          </div>

          <TagInput
            label="Previous Funders"
            value={profile.funders_worked_with_before}
            onChange={(next) => applyProfileChange((prev) => ({ ...prev, funders_worked_with_before: next }))}
          />
          {fieldErrors.funders_worked_with_before ? (
            <p className="mt-1 text-sm text-brand-error">{fieldErrors.funders_worked_with_before}</p>
          ) : null}
        </div>

        {saveError ? (
          <div className="rounded-[8px] border border-brand-error/30 bg-brand-error/5 p-3">
            <p className="text-sm font-medium text-brand-error">{saveError.error}</p>
          </div>
        ) : null}

        <div className="flex items-center gap-3">
          <button type="button" className="btn-primary" onClick={() => void saveProfile()} disabled={saving || redirecting}>
            {saving || redirecting ? "Saving..." : isCreateMode ? "Save Profile" : "Update Profile"}
          </button>
          {pageState.mode === "EDITING" ? (
            <button
              type="button"
              className="h-11 rounded-[8px] border border-brand-border bg-brand-card-bg px-4 text-sm font-semibold text-brand-text-primary"
              onClick={cancelEditing}
              disabled={saving || redirecting}
            >
              Cancel
            </button>
          ) : null}
          {isDirty ? <p className="text-secondary">You have unsaved changes.</p> : null}
        </div>
      </div>
    </section>
  );
}

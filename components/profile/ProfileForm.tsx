"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { ApiClientError } from "@/lib/api-client";
import {
  createNgoProfile,
  getNgoProfile,
  getNgoProfileCompleteness,
  type FocusSector,
  type NgoPastProject,
  type NgoProfile,
  type NgoProfileCompleteness,
  updateNgoProfile,
} from "@/lib/api/ngoProfile";
import { ErrorDisplay } from "@/components/shared/ErrorDisplay";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { CompletenessBar } from "@/components/profile/CompletenessBar";
import { PastProjectCard } from "@/components/profile/PastProjectCard";
import { TagInput } from "@/components/profile/TagInput";

type ProfileFormProps = {
  fromStart: boolean;
  opportunityId?: string;
};

type FieldErrors = Partial<Record<"contact_email" | "website" | "year_of_establishment", string>>;

const emptyProject = (): NgoPastProject => ({
  project_title: "",
  donor_funder: null,
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
  me_practices: null,
  previous_funders: [],
});

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
    if (!Number.isInteger(profile.year_of_establishment) || profile.year_of_establishment < 1800 || profile.year_of_establishment > currentYear) {
      errors.year_of_establishment = `Enter a valid year between 1800 and ${currentYear}.`;
    }
  }

  return errors;
}

function snapshot(profile: NgoProfile) {
  return JSON.stringify(profile);
}

export function ProfileForm({ fromStart, opportunityId }: ProfileFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileExists, setProfileExists] = useState(false);
  const [profile, setProfile] = useState<NgoProfile>(defaultProfile());
  const [completeness, setCompleteness] = useState<NgoProfileCompleteness | null>(null);
  const [error, setError] = useState<ApiClientError | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);
  const syncedSnapshot = useRef(snapshot(defaultProfile()));

  const isDirty = useMemo(() => snapshot(profile) !== syncedSnapshot.current, [profile]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        let loadedProfile = defaultProfile();
        let exists = false;

        try {
          const response = await getNgoProfile();
          loadedProfile = {
            ...response.ngo_profile,
            past_projects:
              response.ngo_profile.past_projects.length > 0
                ? response.ngo_profile.past_projects
                : [emptyProject()],
          };
          exists = true;
        } catch (loadError) {
          if (!(loadError instanceof ApiClientError) || loadError.status !== 404) {
            throw loadError;
          }
        }

        const completenessResponse = await getNgoProfileCompleteness();
        setProfile(loadedProfile);
        setProfileExists(exists);
        setCompleteness(completenessResponse);
        syncedSnapshot.current = snapshot(loadedProfile);
      } catch (loadError) {
        if (loadError instanceof ApiClientError) {
          setError(loadError);
        } else {
          setError(new ApiClientError(500, "We couldn't load your profile right now."));
        }
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

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

  const updateProject = (index: number, nextProject: NgoPastProject) => {
    setProfile((prev) => {
      const nextProjects = [...prev.past_projects];
      nextProjects[index] = nextProject;
      return { ...prev, past_projects: nextProjects };
    });
  };

  const saveProfile = async () => {
    setSavedMessage(null);
    const validationErrors = validateProfile(profile);
    setFieldErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const payload: NgoProfile = {
        ...profile,
        organization_name: profile.organization_name.trim(),
        country_of_registration: profile.country_of_registration.trim(),
        mission_statement: profile.mission_statement.trim(),
        contact_person_name: normalizeNullable(profile.contact_person_name ?? ""),
        contact_email: normalizeNullable(profile.contact_email ?? ""),
        website: normalizeNullable(profile.website ?? ""),
        me_practices: normalizeNullable(profile.me_practices ?? ""),
        annual_budget_currency: normalizeNullable(profile.annual_budget_currency ?? ""),
        past_projects: profile.past_projects.map((project) => ({
          project_title: project.project_title.trim(),
          donor_funder: normalizeNullable(project.donor_funder ?? ""),
          duration: normalizeNullable(project.duration ?? ""),
          location: normalizeNullable(project.location ?? ""),
          summary: normalizeNullable(project.summary ?? ""),
        })),
      };

      const response = profileExists
        ? await updateNgoProfile(payload)
        : await createNgoProfile(payload);

      const nextCompleteness = await getNgoProfileCompleteness();
      const nextProfile: NgoProfile = {
        ...response.ngo_profile,
        past_projects:
          response.ngo_profile.past_projects.length > 0
            ? response.ngo_profile.past_projects
            : [emptyProject()],
      };

      setProfile(nextProfile);
      setProfileExists(true);
      setCompleteness(nextCompleteness);
      syncedSnapshot.current = snapshot(nextProfile);
      setSavedMessage("Profile saved.");

      if (fromStart && opportunityId && nextCompleteness.status === "COMPLETE") {
        setRedirecting(true);
        setSavedMessage("Profile complete — checking your fit now…");
        window.setTimeout(() => {
          router.push(`/start?opportunity_id=${encodeURIComponent(opportunityId)}&source=profile`);
        }, 900);
      }
    } catch (saveError) {
      if (saveError instanceof ApiClientError) {
        setError(saveError);
      } else {
        setError(new ApiClientError(500, "We couldn't save your profile right now."));
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingSkeleton variant="page" lines={6} />;
  }

  return (
    <section className="space-y-6">
      <CompletenessBar completeness={completeness} />

      {fromStart ? (
        <div className="card border-brand-warning/20 bg-brand-warning/5">
          <h4>Complete your profile to run your Fit Scan</h4>
          <p className="mt-2 text-secondary">We need your core organisation details before we can check opportunity fit.</p>
        </div>
      ) : null}

      {savedMessage ? (
        <div className="card border-brand-success/30 bg-brand-success/5">
          <p className="text-sm font-medium text-brand-success">{savedMessage}</p>
        </div>
      ) : null}

      {error ? <ErrorDisplay error={error} onRetry={() => window.location.reload()} /> : null}

      <div className="card space-y-6">
        <h3>NGO Profile</h3>

        <div className="space-y-4">
          <h4>Section 1: Organisation Identity (Required)</h4>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-brand-text-primary">Organisation Name *</label>
              <input
                value={profile.organization_name}
                onChange={(event) => setProfile((prev) => ({ ...prev, organization_name: event.target.value }))}
                className="mt-1 h-11 w-full rounded-[8px] border border-brand-border bg-brand-card-bg px-3 text-[14px] outline-none focus:border-brand-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-text-primary">Country of Registration *</label>
              <input
                list="country-options"
                value={profile.country_of_registration}
                onChange={(event) => setProfile((prev) => ({ ...prev, country_of_registration: event.target.value }))}
                className="mt-1 h-11 w-full rounded-[8px] border border-brand-border bg-brand-card-bg px-3 text-[14px] outline-none focus:border-brand-primary"
              />
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
                  setProfile((prev) => ({
                    ...prev,
                    year_of_establishment: event.target.value ? Number(event.target.value) : null,
                  }))
                }
                className="mt-1 h-11 w-full rounded-[8px] border border-brand-border bg-brand-card-bg px-3 text-[14px] outline-none focus:border-brand-primary"
              />
              {fieldErrors.year_of_establishment ? <p className="mt-1 text-sm text-brand-error">{fieldErrors.year_of_establishment}</p> : null}
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-text-primary">Website</label>
              <input
                value={profile.website ?? ""}
                onChange={(event) => setProfile((prev) => ({ ...prev, website: event.target.value }))}
                placeholder="https://example.org"
                className="mt-1 h-11 w-full rounded-[8px] border border-brand-border bg-brand-card-bg px-3 text-[14px] outline-none focus:border-brand-primary"
              />
              {fieldErrors.website ? <p className="mt-1 text-sm text-brand-error">{fieldErrors.website}</p> : null}
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-text-primary">Contact Person Name</label>
              <input
                value={profile.contact_person_name ?? ""}
                onChange={(event) => setProfile((prev) => ({ ...prev, contact_person_name: event.target.value }))}
                className="mt-1 h-11 w-full rounded-[8px] border border-brand-border bg-brand-card-bg px-3 text-[14px] outline-none focus:border-brand-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-text-primary">Contact Email</label>
              <input
                value={profile.contact_email ?? ""}
                onChange={(event) => setProfile((prev) => ({ ...prev, contact_email: event.target.value }))}
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
              onChange={(event) => setProfile((prev) => ({ ...prev, mission_statement: event.target.value }))}
              rows={4}
              className="mt-1 w-full rounded-[8px] border border-brand-border bg-brand-card-bg px-3 py-2 text-[14px] outline-none focus:border-brand-primary"
            />
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
                      setProfile((prev) => ({
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
          </div>

          <TagInput
            label="Geographic Areas of Work *"
            value={profile.geographic_areas_of_work}
            onChange={(next) => setProfile((prev) => ({ ...prev, geographic_areas_of_work: next }))}
          />
          <TagInput
            label="Target Groups *"
            value={profile.target_groups}
            onChange={(next) => setProfile((prev) => ({ ...prev, target_groups: next }))}
          />
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
                onChange={(nextProject) => updateProject(index, nextProject)}
                onRemove={() =>
                  setProfile((prev) => ({
                    ...prev,
                    past_projects: prev.past_projects.filter((_, itemIndex) => itemIndex !== index),
                  }))
                }
              />
            ))}
          </div>
          <button
            type="button"
            className="h-11 rounded-[8px] border border-brand-border px-4 text-sm font-semibold text-brand-text-primary"
            onClick={() =>
              setProfile((prev) => ({ ...prev, past_projects: [...prev.past_projects, emptyProject()] }))
            }
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
                  setProfile((prev) => ({
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
                  setProfile((prev) => ({
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
                  setProfile((prev) => ({
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
                value={profile.me_practices ?? ""}
                onChange={(event) => setProfile((prev) => ({ ...prev, me_practices: event.target.value }))}
                rows={3}
                className="mt-1 w-full rounded-[8px] border border-brand-border bg-brand-card-bg px-3 py-2 text-[14px] outline-none focus:border-brand-primary"
              />
            </div>
          </div>

          <TagInput
            label="Previous Funders"
            value={profile.previous_funders}
            onChange={(next) => setProfile((prev) => ({ ...prev, previous_funders: next }))}
          />
        </div>

        <div className="flex items-center gap-3">
          <button type="button" className="btn-primary" onClick={() => void saveProfile()} disabled={saving || redirecting}>
            {saving || redirecting ? "Saving..." : "Save Profile"}
          </button>
          {isDirty ? <p className="text-secondary">You have unsaved changes.</p> : null}
        </div>
      </div>
    </section>
  );
}

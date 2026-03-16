import type { NgoProfile, PastProject, ProfileCompleteness, ProfileSavePayload } from "@/lib/profile-types";
import type { FocusSector } from "@/lib/profile-types";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function asStringOrNull(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asNumberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

const FOCUS_SECTOR_VALUES: FocusSector[] = [
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

function asFocusSectorArray(value: unknown): FocusSector[] {
  const sectors = asStringArray(value);
  return sectors.filter((item): item is FocusSector =>
    FOCUS_SECTOR_VALUES.includes(item as FocusSector),
  );
}

function mapLegacyField<T>(oldKey: string, newKey: string, source: Record<string, unknown>) {
  if (!(oldKey in source) || newKey in source) {
    return;
  }
  source[newKey] = source[oldKey] as T;
  console.warn(`[profile-adapter] Legacy field name mapped: ${oldKey} -> ${newKey}`);
}

function normalizePastProject(raw: unknown): PastProject {
  const project = asRecord(raw);

  mapLegacyField<string>("project_title", "title", project);
  mapLegacyField<string | null>("donor_funder", "donor", project);

  return {
    id: asStringOrNull(project.id) ?? undefined,
    title: asStringOrNull(project.title) ?? "",
    donor: asStringOrNull(project.donor),
    duration: asStringOrNull(project.duration),
    location: asStringOrNull(project.location),
    summary: asStringOrNull(project.summary),
  };
}

export function normalizeProfileResponse(raw: unknown): NgoProfile {
  const container = asRecord(raw);

  let source: Record<string, unknown> = container;
  if ("ngo_profile" in container && container.ngo_profile && typeof container.ngo_profile === "object") {
    console.warn(
      "[profile-adapter] Legacy envelope shape detected — backend returned ngo_profile wrapper. Expected top-level object.",
    );
    source = container.ngo_profile as Record<string, unknown>;
  }

  mapLegacyField<string>("me_practices", "monitoring_and_evaluation_practices", source);
  mapLegacyField<string[]>("previous_funders", "funders_worked_with_before", source);

  const pastProjectsRaw = Array.isArray(source.past_projects) ? source.past_projects : [];

  const profileStatusRaw = asStringOrNull(source.profile_status);
  const profileStatus: "DRAFT" | "COMPLETE" = profileStatusRaw === "COMPLETE" ? "COMPLETE" : "DRAFT";

  return {
    id: asStringOrNull(source.id) ?? undefined,
    organization_name: asStringOrNull(source.organization_name) ?? "",
    country_of_registration: asStringOrNull(source.country_of_registration) ?? "",
    year_of_establishment: asNumberOrNull(source.year_of_establishment),
    website: asStringOrNull(source.website),
    contact_person_name: asStringOrNull(source.contact_person_name),
    contact_email: asStringOrNull(source.contact_email),
    mission_statement: asStringOrNull(source.mission_statement) ?? "",
    focus_sectors: asFocusSectorArray(source.focus_sectors),
    geographic_areas_of_work: asStringArray(source.geographic_areas_of_work),
    target_groups: asStringArray(source.target_groups),
    past_projects: pastProjectsRaw.map(normalizePastProject),
    full_time_staff: asNumberOrNull(source.full_time_staff),
    annual_budget_amount: asNumberOrNull(source.annual_budget_amount),
    annual_budget_currency: asStringOrNull(source.annual_budget_currency),
    monitoring_and_evaluation_practices: asStringOrNull(source.monitoring_and_evaluation_practices),
    funders_worked_with_before: asStringArray(source.funders_worked_with_before),
    profile_status: profileStatus,
    completeness_score: typeof source.completeness_score === "number" ? source.completeness_score : 0,
    missing_fields: asStringArray(source.missing_fields),
    created_at: asStringOrNull(source.created_at) ?? undefined,
    updated_at: asStringOrNull(source.updated_at) ?? undefined,
  };
}

export function normalizeCompletenessResponse(raw: unknown): ProfileCompleteness {
  const source = asRecord(raw);

  if (!("profile_status" in source) && "status" in source) {
    source.profile_status = source.status;
    console.warn("[profile-adapter] Legacy field name mapped: status -> profile_status");
  }

  if (!("completeness_score" in source) && "percent_complete" in source) {
    source.completeness_score = source.percent_complete;
    console.warn("[profile-adapter] Legacy field name mapped: percent_complete -> completeness_score");
  }

  return {
    profile_status: source.profile_status === "COMPLETE" ? "COMPLETE" : "DRAFT",
    completeness_score: typeof source.completeness_score === "number" ? source.completeness_score : 0,
    missing_fields: asStringArray(source.missing_fields),
  };
}

export function buildSavePayload(formData: ProfileSavePayload): ProfileSavePayload {
  const source = asRecord(formData);

  mapLegacyField<string>("me_practices", "monitoring_and_evaluation_practices", source);
  mapLegacyField<string[]>("previous_funders", "funders_worked_with_before", source);

  delete source.id;
  delete source.profile_status;
  delete source.completeness_score;
  delete source.missing_fields;
  delete source.created_at;
  delete source.updated_at;

  const projects = Array.isArray(source.past_projects) ? source.past_projects : [];
  const normalizedProjects = projects.map((projectRaw) => {
    const project = asRecord(projectRaw);
    mapLegacyField<string>("project_title", "title", project);
    mapLegacyField<string | null>("donor_funder", "donor", project);
    delete project.id;

    return {
      title: asStringOrNull(project.title) ?? "",
      donor: asStringOrNull(project.donor),
      duration: asStringOrNull(project.duration),
      location: asStringOrNull(project.location),
      summary: asStringOrNull(project.summary),
    };
  });

  return {
    organization_name: asStringOrNull(source.organization_name) ?? "",
    country_of_registration: asStringOrNull(source.country_of_registration) ?? "",
    year_of_establishment: asNumberOrNull(source.year_of_establishment),
    website: asStringOrNull(source.website),
    contact_person_name: asStringOrNull(source.contact_person_name),
    contact_email: asStringOrNull(source.contact_email),
    mission_statement: asStringOrNull(source.mission_statement) ?? "",
    focus_sectors: asFocusSectorArray(source.focus_sectors),
    geographic_areas_of_work: asStringArray(source.geographic_areas_of_work),
    target_groups: asStringArray(source.target_groups),
    past_projects: normalizedProjects,
    full_time_staff: asNumberOrNull(source.full_time_staff),
    annual_budget_amount: asNumberOrNull(source.annual_budget_amount),
    annual_budget_currency: asStringOrNull(source.annual_budget_currency),
    monitoring_and_evaluation_practices: asStringOrNull(source.monitoring_and_evaluation_practices),
    funders_worked_with_before: asStringArray(source.funders_worked_with_before),
  };
}

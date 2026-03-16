import { ApiClientError, apiRequest } from "@/lib/api-client";
import { buildSavePayload, normalizeCompletenessResponse, normalizeProfileResponse } from "@/lib/profile-adapter";
import type { NgoProfile, ProfileCompleteness, ProfileSavePayload } from "@/lib/profile-types";

const NO_PROFILE_MISSING_FIELDS = [
  "organization_name",
  "country_of_registration",
  "mission_statement",
  "focus_sectors",
  "geographic_areas_of_work",
  "target_groups",
  "past_projects",
];

export class ProfileNotFoundError extends Error {
  status: number;
  errorCode?: string;

  constructor(message = "Profile not found", errorCode = "PROFILE_NOT_FOUND") {
    super(message);
    this.name = "ProfileNotFoundError";
    this.status = 404;
    this.errorCode = errorCode;
  }
}

export async function fetchProfile(): Promise<NgoProfile> {
  try {
    const raw = await apiRequest<unknown>("/api/ngo-profile", { method: "GET" });
    return normalizeProfileResponse(raw);
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 404) {
      throw new ProfileNotFoundError(error.message, error.errorCode);
    }
    throw error;
  }
}

export async function createProfile(payload: ProfileSavePayload): Promise<NgoProfile> {
  const body = buildSavePayload(payload);
  const raw = await apiRequest<unknown>("/api/ngo-profile", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return normalizeProfileResponse(raw);
}

export async function updateProfile(payload: ProfileSavePayload): Promise<NgoProfile> {
  const body = buildSavePayload(payload);
  const raw = await apiRequest<unknown>("/api/ngo-profile", {
    method: "PUT",
    body: JSON.stringify(body),
  });
  return normalizeProfileResponse(raw);
}

export async function fetchCompleteness(): Promise<ProfileCompleteness> {
  try {
    const raw = await apiRequest<unknown>("/api/ngo-profile/completeness", { method: "GET" });
    return normalizeCompletenessResponse(raw);
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 404) {
      return {
        profile_status: "DRAFT",
        completeness_score: 0,
        missing_fields: NO_PROFILE_MISSING_FIELDS,
      };
    }
    throw error;
  }
}

import { apiRequest } from "@/lib/api-client";

export type FocusSector =
  | "EDUCATION"
  | "HEALTH"
  | "AGRICULTURE"
  | "WASH"
  | "GOVERNANCE"
  | "CLIMATE"
  | "GENDER"
  | "LIVELIHOODS"
  | "PROTECTION"
  | "OTHER";

export type NgoPastProject = {
  id?: string;
  title: string;
  donor: string | null;
  duration: string | null;
  location: string | null;
  summary: string | null;
};

export type NgoProfile = {
  id?: string;
  organization_name: string;
  country_of_registration: string;
  year_of_establishment: number | null;
  website: string | null;
  contact_person_name: string | null;
  contact_email: string | null;
  mission_statement: string;
  focus_sectors: FocusSector[];
  geographic_areas_of_work: string[];
  target_groups: string[];
  past_projects: NgoPastProject[];
  full_time_staff: number | null;
  annual_budget_amount: number | null;
  annual_budget_currency: string | null;
  monitoring_and_evaluation_practices: string | null;
  funders_worked_with_before: string[];
  created_at?: string;
  updated_at?: string;
};

export type NgoProfileResponse = {
  ngo_profile: NgoProfile;
};

export type NgoProfileCompleteness = {
  profile_status: "MISSING" | "DRAFT" | "COMPLETE";
  completeness_score: number;
  missing_fields: string[];
};

export async function getNgoProfile() {
  return apiRequest<NgoProfileResponse>("/api/ngo-profile", { method: "GET" });
}

export async function createNgoProfile(payload: NgoProfile) {
  return apiRequest<NgoProfileResponse>("/api/ngo-profile", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateNgoProfile(payload: NgoProfile) {
  return apiRequest<NgoProfileResponse>("/api/ngo-profile", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function getNgoProfileCompleteness() {
  return apiRequest<NgoProfileCompleteness>("/api/ngo-profile/completeness", { method: "GET" });
}

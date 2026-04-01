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

export type PastProject = {
  id?: string;
  title: string;
  donor: string | null;
  duration: string | null;
  location: string | null;
  summary: string | null;
  beneficiaries_reached?: string;
  budget?: string;
  outcomes?: string;
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
  past_projects: PastProject[];
  full_time_staff: number | null;
  annual_budget_amount: number | null;
  annual_budget_currency: string | null;
  monitoring_and_evaluation_practices: string | null;
  funders_worked_with_before: string[];
  profile_status: "DRAFT" | "COMPLETE";
  completeness_score: number;
  missing_fields: string[];
  created_at?: string;
  updated_at?: string;
};

export type ProfileCompleteness = {
  profile_status: "DRAFT" | "COMPLETE";
  completeness_score: number;
  missing_fields: string[];
};

export type ProfileSavePayload = Omit<
  NgoProfile,
  "id" | "profile_status" | "completeness_score" | "missing_fields" | "created_at" | "updated_at"
> & {
  past_projects: Array<Omit<PastProject, "id">>;
};

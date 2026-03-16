export type {
  FocusSector,
  NgoProfile,
  ProfileCompleteness as NgoProfileCompleteness,
  ProfileSavePayload,
  PastProject as NgoPastProject,
} from "@/lib/profile-types";

export {
  ProfileNotFoundError,
  createProfile as createNgoProfile,
  fetchCompleteness as getNgoProfileCompleteness,
  fetchProfile as getNgoProfile,
  updateProfile as updateNgoProfile,
} from "@/lib/profile-service";

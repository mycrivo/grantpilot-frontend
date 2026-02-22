import { ProfileForm } from "@/components/profile/ProfileForm";

type ProfilePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ProfilePage({ searchParams }: ProfilePageProps) {
  const resolvedParams = (await searchParams) ?? {};
  const from = Array.isArray(resolvedParams.from) ? resolvedParams.from[0] : resolvedParams.from;
  const opportunity = Array.isArray(resolvedParams.opportunity_id)
    ? resolvedParams.opportunity_id[0]
    : resolvedParams.opportunity_id;

  return (
    <ProfileForm
      fromStart={from === "start"}
      opportunityId={opportunity}
    />
  );
}


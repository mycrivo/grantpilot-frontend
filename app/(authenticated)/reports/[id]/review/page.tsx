"use client";

import { use } from "react";

import { ReportGatePlaceholder } from "@/components/reports/ReportGatePlaceholder";
import { ReportsFunnelHeader } from "@/components/reports/ReportsFunnelHeader";
import { ReportsJourneySteps } from "@/components/reports/ReportsJourneySteps";

type ReviewReportPageProps = {
  params: Promise<{ id: string }>;
};

export default function ReviewReportPage({ params }: ReviewReportPageProps) {
  use(params);

  return (
    <section className="space-y-6">
      <ReportsFunnelHeader />
      <ReportsJourneySteps current="review" />
      <ReportGatePlaceholder stepName="Review draft sections" />
    </section>
  );
}

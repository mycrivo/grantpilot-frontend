"use client";

import { use } from "react";

import { ReportGatePlaceholder } from "@/components/reports/ReportGatePlaceholder";
import { ReportsFunnelHeader } from "@/components/reports/ReportsFunnelHeader";
import { ReportsJourneySteps } from "@/components/reports/ReportsJourneySteps";

type QuestionsReportPageProps = {
  params: Promise<{ id: string }>;
};

export default function QuestionsReportPage({ params }: QuestionsReportPageProps) {
  use(params);

  return (
    <section className="space-y-6">
      <ReportsFunnelHeader />
      <ReportsJourneySteps current="questions" />
      <ReportGatePlaceholder stepName="Answer missing questions" />
    </section>
  );
}

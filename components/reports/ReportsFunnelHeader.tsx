import Link from "next/link";

export function ReportsFunnelHeader() {
  return (
    <header className="mb-6 flex items-center justify-between border-b border-brand-divider pb-4">
      <p className="text-base font-bold text-brand-text-primary">GrantPilot</p>
      <Link href="/reports" className="rounded-[8px] px-3 py-2 text-sm font-semibold text-secondary hover:bg-brand-divider hover:text-brand-text-primary">
        Save &amp; exit
      </Link>
    </header>
  );
}

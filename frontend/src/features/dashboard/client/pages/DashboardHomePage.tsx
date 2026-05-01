import { useDashboardOverview } from "../api/dashboard.api";

export function DashboardHomePage() {
  const { data, isLoading } = useDashboardOverview();

  if (isLoading) return <div>Loading Overview...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-[var(--color-text)]">Dashboard Home</h1>
      <p className="text-[var(--color-muted)]">Overview of active claims, Compliance Score averages, and recent activity.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-[var(--color-surface)] rounded-xl shadow-sm border border-[var(--color-border)]">
          <h3 className="text-sm font-medium text-[var(--color-muted)]">Active Claims</h3>
          <p className="text-3xl font-bold mt-2 text-[var(--color-primary)]">{data?.activeClaimsCount}</p>
        </div>
        <div className="p-6 bg-[var(--color-surface)] rounded-xl shadow-sm border border-[var(--color-border)]">
          <h3 className="text-sm font-medium text-[var(--color-muted)]">Compliance Score</h3>
          <p className="text-3xl font-bold mt-2 text-green-500">{data?.averageComplianceScore}%</p>
        </div>
      </div>
    </div>
  );
}

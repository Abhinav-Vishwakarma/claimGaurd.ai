import { useUserProfile } from "../api/dashboard.api";

export function ProfilePage() {
  const { data, isLoading } = useUserProfile();

  if (isLoading) return <div>Loading Profile...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[var(--color-text)]">My Profile</h1>
        <p className="text-[var(--color-muted)] mt-1">Manage your account details and plan information.</p>
      </div>

      <div className="bg-[var(--color-surface)] p-6 rounded-xl shadow-sm border border-[var(--color-border)]">
        <h2 className="text-lg font-semibold text-[var(--color-text)] mb-4">Plan Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-[var(--color-muted)]">Member ID</p>
            <p className="text-lg font-medium">{data?.memberId}</p>
          </div>
          <div>
            <p className="text-sm text-[var(--color-muted)]">Plan Type</p>
            <p className="text-lg font-medium">{data?.planType}</p>
          </div>
        </div>

        <div className="mt-8">
          <div className="flex justify-between items-end mb-2">
            <p className="text-sm font-medium text-[var(--color-text)]">Deductible Progress</p>
            <p className="text-sm text-[var(--color-muted)]">${data?.deductible.met} / ${data?.deductible.total}</p>
          </div>
          <div className="w-full bg-[var(--color-bg)] rounded-full h-3">
            <div 
              className="bg-[var(--color-primary)] h-3 rounded-full" 
              style={{ width: `${Math.min(((data?.deductible.met || 0) / (data?.deductible.total || 1)) * 100, 100)}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useAllClients } from "../api/admin.api";
import { Users, UserCheck, ShieldCheck } from "lucide-react";

export function AdminHomePage() {
  const { data: clients, isLoading } = useAllClients();

  const stats = [
    { label: "Total Clients", value: clients?.length || 0, icon: Users, color: "text-blue-500" },
    { label: "Active Policies", value: clients?.filter(c => c.memberProfile?.policyActive).length || 0, icon: ShieldCheck, color: "text-green-500" },
    { label: "Compliant Members", value: clients?.filter(c => c.memberProfile?.premiumPaid).length || 0, icon: UserCheck, color: "text-purple-500" },
  ];

  if (isLoading) return <div>Loading dashboard stats...</div>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Admin Overview</h1>
        <p className="text-[var(--color-muted)] mt-2">Manage your clinical network and client compliance.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-[var(--color-surface)] p-6 rounded-2xl border border-[var(--color-border)] shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--color-muted)]">{stat.label}</p>
                <p className="text-2xl font-bold mt-1">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-xl bg-gray-50 dark:bg-gray-800 ${stat.color}`}>
                <stat.icon size={24} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] overflow-hidden">
        <div className="p-6 border-b border-[var(--color-border)]">
          <h2 className="text-xl font-bold">Recent Clients</h2>
        </div>
        <div className="divide-y divide-[var(--color-border)]">
          {clients?.slice(0, 5).map(client => (
            <div key={client.id} className="p-4 flex items-center justify-between hover:bg-[var(--color-bg)] transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center text-[var(--color-primary)] font-bold">
                  {client.name[0]}
                </div>
                <div>
                  <p className="font-medium">{client.name}</p>
                  <p className="text-xs text-[var(--color-muted)]">{client.email}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">{client.memberProfile?.memberId}</p>
                <p className="text-xs text-[var(--color-muted)]">{client.memberProfile?.planType}</p>
              </div>
            </div>
          ))}
          {(!clients || clients.length === 0) && (
            <div className="p-8 text-center text-[var(--color-muted)]">
              No clients found. Register a client to get started.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

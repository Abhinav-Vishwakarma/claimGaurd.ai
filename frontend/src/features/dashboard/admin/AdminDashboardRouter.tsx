import { usePath } from "../../../hooks/usePath";
import { AdminLayout } from "./components/AdminLayout";
import { AdminHomePage } from "./pages/AdminHomePage";
import { ClientRegistrationPage } from "./pages/ClientRegistrationPage";
import { AdminClaimsPage } from "./pages/AdminClaimsPage";
import { AdminClaimDetailPage } from "./pages/AdminClaimDetailPage";

export function AdminDashboardRouter() {
  const path = usePath();

  const renderContent = () => {
    switch (true) {
      case path === "/dashboard" || path === "/dashboard/home":
        return <AdminHomePage />;
      case path === "/dashboard/register":
        return <ClientRegistrationPage />;
      case path === "/dashboard/clients":
        return (
          <div className="bg-[var(--color-surface)] p-8 rounded-2xl border border-[var(--color-border)] shadow-sm text-center">
            <h2 className="text-xl font-bold">Manage Clients</h2>
            <p className="text-[var(--color-muted)] mt-2">View and edit existing client profiles here.</p>
            <div className="mt-8 p-12 border-2 border-dashed border-[var(--color-border)] rounded-xl text-[var(--color-muted)]">
              Client list view is coming soon.
            </div>
          </div>
        );
      // Claims routes — specific before general
      case /^\/dashboard\/claims\/admin\/[^/]+$/.test(path): {
        const id = path.split('/').pop() ?? '';
        return <AdminClaimDetailPage claimId={id} />;
      }
      case path.startsWith("/dashboard/claims"):
        return <AdminClaimsPage />;
      default:
        return <div>404 Admin Dashboard Route Not Found</div>;
    }
  };

  return (
    <AdminLayout>
      {renderContent()}
    </AdminLayout>
  );
}

import React from "react";
import { usePath } from "../../../hooks/usePath";
import { DashboardLayout } from "./components/DashboardLayout";
import { DashboardHomePage } from "./pages/DashboardHomePage";
import { ProfilePage } from "./pages/ProfilePage";
import { VaultPage } from "./pages/VaultPage";
import { AiJudgePage } from "./pages/AiJudgePage";
import { HistoryPage } from "./pages/HistoryPage";
import { AppealsPage } from "./pages/AppealsPage";

export function DashboardRouter() {
  const path = usePath();

  const renderContent = () => {
    switch (true) {
      case path === "/dashboard" || path === "/dashboard/home": return <DashboardHomePage />;
      case path.startsWith("/dashboard/profile"): return <ProfilePage />;
      case path.startsWith("/dashboard/vault"): return <VaultPage />;
      case path.startsWith("/dashboard/judge"): return <AiJudgePage />;
      case path.startsWith("/dashboard/history"): return <HistoryPage />;
      case path.startsWith("/dashboard/appeals"): return <AppealsPage />;
      default: return <div>404 Dashboard Route Not Found</div>;
    }
  };

  return (
    <DashboardLayout>
      {renderContent()}
    </DashboardLayout>
  );
}
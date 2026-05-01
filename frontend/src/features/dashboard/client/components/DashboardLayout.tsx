import React, { useState } from "react";
import { DashboardSidebar } from "./DashboardSidebar";

import { useLogout } from "../../../auth/auth.hooks";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const logout = useLogout();

  const handleSignOut = () => {
    logout.mutate();
  };

  return (
    <div className="flex h-screen bg-[var(--color-bg)] text-[var(--color-text)] overflow-hidden font-sans">
      <DashboardSidebar 
        isCollapsed={isCollapsed} 
        toggleCollapse={() => setIsCollapsed(!isCollapsed)} 
        onSignOut={handleSignOut}
      />
      
      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto w-full h-full p-8 transition-all">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
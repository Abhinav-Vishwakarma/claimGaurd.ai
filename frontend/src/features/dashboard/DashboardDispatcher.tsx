import { useEffect } from "react";
import { useMe } from "../auth/auth.hooks";
import { DashboardRouter as ClientDashboardRouter } from "./client/DashboardRouter";
import { HospitalDashboardRouter } from "./hospital/HospitalDashboardRouter";
import { AdminDashboardRouter } from "./admin/AdminDashboardRouter";
import { navigate } from "../../hooks/usePath";

export function DashboardDispatcher() {
  const { data, isLoading, isError } = useMe();
  const user = data?.user;

  useEffect(() => {
    if (isError) {
      // If unauthorized, go to login
      navigate("/login");
    }
  }, [isError]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50">
        <span className="text-gray-500 font-medium">Loading your dashboard...</span>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect via useEffect
  }

  switch (user.role) {
    case "CLIENT":
      return <ClientDashboardRouter />;
    case "HOSPITAL":
      return <HospitalDashboardRouter />;
    case "ADMIN":
      return <AdminDashboardRouter />;
    default:
      return (
        <div className="flex h-screen items-center justify-center">
          <p>Unknown role assigned: {user.role}</p>
        </div>
      );
  }
}

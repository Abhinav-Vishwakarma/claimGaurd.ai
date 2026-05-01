import React from "react";
import { useLogout } from "../../auth/auth.hooks";

export function HospitalDashboardRouter() {
  const logout = useLogout();
  return (
    <div className="flex h-screen bg-slate-50 flex-col items-center justify-center">
      <h1 className="text-3xl font-bold text-gray-800">Hospital Portal</h1>
      <p className="text-gray-600 mt-2">Welcome to the Hospital Dashboard.</p>
      <button 
        onClick={() => logout.mutate()} 
        className="mt-6 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
      >
        Sign Out
      </button>
    </div>
  );
}
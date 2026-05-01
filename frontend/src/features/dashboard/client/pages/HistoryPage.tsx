import React from "react";
import { useClaimsHistory } from "../api/dashboard.api";

export function HistoryPage() {
  const { data: claims, isLoading } = useClaimsHistory();

  if (isLoading) return <div>Loading history...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[var(--color-text)]">Claims History</h1>
        <p className="text-[var(--color-muted)] mt-1">Archive of past Explanation of Benefits (EOB) and their final statuses.</p>
      </div>

      <div className="bg-[var(--color-surface)] rounded-xl shadow-sm border border-[var(--color-border)] overflow-hidden mt-6">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[var(--color-bg)] border-b border-[var(--color-border)]">
              <th className="py-4 px-6 text-sm font-semibold text-[var(--color-muted)]">ID</th>
              <th className="py-4 px-6 text-sm font-semibold text-[var(--color-muted)]">Date of Service</th>
              <th className="py-4 px-6 text-sm font-semibold text-[var(--color-muted)]">Billed</th>
              <th className="py-4 px-6 text-sm font-semibold text-[var(--color-muted)]">Paid</th>
              <th className="py-4 px-6 text-sm font-semibold text-[var(--color-muted)]">Responsibility</th>
              <th className="py-4 px-6 text-sm font-semibold text-[var(--color-muted)]">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {claims?.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-[var(--color-muted)]">
                  No claims found.
                </td>
              </tr>
            ) : (
              claims?.map((claim) => (
                <tr key={claim.id} className="hover:bg-[var(--color-bg)] transition-colors">
                  <td className="py-4 px-6 text-sm font-medium text-[var(--color-text)]">{claim.id}</td>
                  <td className="py-4 px-6 text-sm text-[var(--color-muted)]">
                    {new Date(claim.dateOfService).toLocaleDateString()}
                  </td>
                  <td className="py-4 px-6 text-sm text-[var(--color-muted)]">${claim.billedAmount.toFixed(2)}</td>
                  <td className="py-4 px-6 text-sm text-green-500 font-medium">${claim.paidAmount.toFixed(2)}</td>
                  <td className="py-4 px-6 text-sm text-red-500 font-medium">${claim.patientResponsibility.toFixed(2)}</td>
                  <td className="py-4 px-6 text-sm">
                    <span 
                      className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide
                        ${claim.finalStatus === "processed" 
                          ? "bg-green-500/20 text-green-500" 
                          : "bg-yellow-500/20 text-yellow-500"}`
                      }
                    >
                      {claim.finalStatus}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
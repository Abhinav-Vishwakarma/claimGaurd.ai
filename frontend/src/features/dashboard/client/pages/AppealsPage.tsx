import { useAppeals } from "../api/dashboard.api";
import { Download, Send } from "lucide-react";

export function AppealsPage() {
  const { data: appeals, isLoading } = useAppeals();

  if (isLoading) return <div>Loading Appeals...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[var(--color-text)]">Appeals Center</h1>
        <p className="text-[var(--color-muted)] mt-1">Draft drafted appeal letters for denied or "Adverse Decision" claims.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 mt-6">
        {appeals?.length === 0 ? (
          <div className="bg-[var(--color-surface)] p-8 rounded-xl shadow-sm border border-[var(--color-border)] text-center text-[var(--color-muted)]">
            No appeal letters currently drafted.
          </div>
        ) : (
          appeals?.map((appeal) => (
            <div key={appeal.id} className="bg-[var(--color-surface)] p-6 rounded-xl shadow-sm border border-[var(--color-border)] hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-[var(--color-text)]">Appeal for Claim {appeal.claimId}</h3>
                  <p className="text-sm text-[var(--color-muted)] mt-1">Drafted on: {new Date(appeal.createdAt).toLocaleDateString()}</p>
                </div>
                <span className="bg-[var(--color-primary)]/20 text-[var(--color-primary)] font-semibold px-3 py-1 rounded-full text-xs uppercase tracking-wide">
                  {appeal.status}
                </span>
              </div>
              
              <div className="bg-[var(--color-bg)] border border-[var(--color-border)] p-4 rounded-lg mb-6 h-32 overflow-y-auto text-sm font-serif text-[var(--color-muted)]">
                {appeal.content}
              </div>

              <div className="flex justify-end gap-4 border-t border-[var(--color-border)] pt-4">
                <button className="flex items-center gap-2 px-4 py-2 border border-[var(--color-border)] text-[var(--color-text)] bg-[var(--color-surface)] rounded-lg hover:bg-[var(--color-bg)] transition-colors font-medium">
                  <Download className="w-4 h-4" />
                  Download PDF
                </button>
                <button className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] hover:opacity-90 text-white rounded-lg transition-colors font-medium">
                  <Send className="w-4 h-4" />
                  Submit Appeal
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

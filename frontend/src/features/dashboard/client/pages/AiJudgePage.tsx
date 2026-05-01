import { useState } from "react";
import { useMedicalVault } from "../api/dashboard.api";
import { useRunGatekeeper } from "../api/ocr.api";
import { DocumentSelector } from "../components/DocumentSelector";
import { ShieldAlert, ShieldCheck, Scale, Play, ChevronRight, AlertCircle, CheckCircle2 } from "lucide-react";

export function AiJudgePage() {
  const { data: vaultItems = [] } = useMedicalVault();
  const gatekeeperMutation = useRunGatekeeper();

  const [selection, setSelection] = useState({
    prescription: null as string | null,
    bill: null as string | null,
    labReport: null as string | null,
  });

  const canRun = selection.prescription && selection.bill && selection.labReport;

  const handleRunCheck = () => {
    if (!canRun) return;
    gatekeeperMutation.mutate({
      prescriptionVaultId: selection.prescription!,
      billVaultId: selection.bill!,
      labReportVaultId: selection.labReport!,
    });
  };

  const report = gatekeeperMutation.data?.data;

  return (
    <div className="space-y-8 pb-12">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Scale className="text-[var(--color-primary)]" />
          AI Integrity Gatekeeper
        </h1>
        <p className="text-[var(--color-muted)] mt-2">
          Triangulate your medical documents to ensure claim integrity before submission.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Document Selection Column */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-[var(--color-surface)] p-6 rounded-2xl border border-[var(--color-border)] shadow-sm space-y-6">
            <h2 className="font-bold flex items-center gap-2 border-b border-[var(--color-border)] pb-3">
              <Play size={18} className="text-[var(--color-primary)]" />
              Select Claim Evidence
            </h2>
            
            <DocumentSelector
              label="Prescription (Rx)"
              type="prescription"
              items={vaultItems}
              selectedId={selection.prescription}
              onSelect={(id) => setSelection({ ...selection, prescription: id })}
            />

            <DocumentSelector
              label="Medical Bill"
              type="bill"
              items={vaultItems}
              selectedId={selection.bill}
              onSelect={(id) => setSelection({ ...selection, bill: id })}
            />

            <DocumentSelector
              label="Lab/Diagnostic Report"
              type="lab_report"
              items={vaultItems}
              selectedId={selection.labReport}
              onSelect={(id) => setSelection({ ...selection, labReport: id })}
            />

            <button
              disabled={!canRun || gatekeeperMutation.isPending}
              onClick={handleRunCheck}
              className="w-full bg-[var(--color-primary)] text-white py-4 rounded-xl font-bold hover:brightness-110 transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-[var(--color-primary)]/20 flex items-center justify-center gap-2"
            >
              {gatekeeperMutation.isPending ? "Analysing Integrity..." : "Run Integrity Check"}
              {!gatekeeperMutation.isPending && <ChevronRight size={18} />}
            </button>
          </div>
        </div>

        {/* Results Column */}
        <div className="lg:col-span-2 space-y-6">
          {!gatekeeperMutation.isPending && !report && (
            <div className="h-full flex flex-col items-center justify-center p-12 bg-[var(--color-surface)]/50 border-2 border-dashed border-[var(--color-border)] rounded-2xl text-[var(--color-muted)] text-center">
              <Scale size={48} className="mb-4 opacity-20" />
              <p className="max-w-xs">Select one document of each type from your vault to begin the AI triangulation process.</p>
            </div>
          )}

          {gatekeeperMutation.isPending && (
            <div className="h-full flex flex-col items-center justify-center p-12 bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)]">
              <div className="relative w-20 h-20">
                <div className="absolute inset-0 border-4 border-[var(--color-primary)]/20 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin"></div>
              </div>
              <p className="mt-6 font-medium animate-pulse">Running Triangulation Engine...</p>
              <p className="text-xs text-[var(--color-muted)] mt-2">Checking CPT codes vs Prescription vs Lab Findings</p>
            </div>
          )}

          {report && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Verdict Card */}
              <div className={`p-6 rounded-2xl border-2 flex items-center justify-between shadow-lg ${report.is_clean_claim ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800" : "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800"}`}>
                <div className="flex items-center gap-4">
                  <div className={`p-4 rounded-2xl ${report.is_clean_claim ? "bg-green-500 text-white" : "bg-red-500 text-white"}`}>
                    {report.is_clean_claim ? <ShieldCheck size={32} /> : <ShieldAlert size={32} />}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">{report.is_clean_claim ? "Clean Claim Status" : "Integrity Issues Found"}</h2>
                    <p className={`text-sm ${report.is_clean_claim ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"}`}>
                      {report.is_clean_claim ? "Your claim is ready for medical necessity review." : "Administrative or triangulation mismatches detected."}
                    </p>
                  </div>
                </div>
              </div>

              {/* Detailed Checks */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CheckCard 
                  title="Administrative Validation" 
                  passed={report.checks.administrative.passed} 
                  details={report.checks.administrative.details || report.checks.administrative.reason} 
                />
                <CheckCard 
                  title="Policy & Premium Status" 
                  passed={report.checks.policy_active.passed} 
                  details={report.checks.policy_active.reason || "Policy active and premium paid."} 
                />
                <CheckCard 
                  title="Clinical Triangulation" 
                  passed={report.checks.triangulation.passed} 
                  details={report.checks.triangulation.reason || "All billed services match prescriptions."} 
                />
              </div>

              {/* Rejection Reasons if any */}
              {report.rejection_reasons.length > 0 && (
                <div className="bg-red-50 dark:bg-red-900/10 p-6 rounded-2xl border border-red-200 dark:border-red-800">
                  <h3 className="font-bold text-red-700 dark:text-red-400 mb-3 flex items-center gap-2">
                    <AlertCircle size={18} />
                    Corrective Actions Required
                  </h3>
                  <ul className="space-y-2">
                    {report.rejection_reasons.map((reason: string, i: number) => (
                      <li key={i} className="text-sm text-red-600 dark:text-red-300 flex items-start gap-2">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                        {reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CheckCard({ title, passed, details }: { title: string, passed: boolean, details: string }) {
  return (
    <div className="bg-[var(--color-surface)] p-5 rounded-xl border border-[var(--color-border)] flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">{title}</span>
        {passed ? (
          <CheckCircle2 className="text-green-500" size={20} />
        ) : (
          <AlertCircle className="text-red-500" size={20} />
        )}
      </div>
      <p className="text-sm font-medium leading-relaxed">{details}</p>
    </div>
  );
}

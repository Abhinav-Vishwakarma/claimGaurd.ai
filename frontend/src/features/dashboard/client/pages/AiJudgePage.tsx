import { useState } from "react";
import { useMedicalVault } from "../api/dashboard.api";
import { DocumentSelector } from "../components/DocumentSelector";
import { AgentPipelineView } from "../components/AgentPipelineView";
import { usePipelineSSE } from "../components/AgentPipelineView/usePipelineSSE";
import { Scale, Play, RotateCcw, ChevronRight } from "lucide-react";

export function AiJudgePage() {
  const { data: vaultItems = [] } = useMedicalVault();
  const pipeline = usePipelineSSE();

  const [selection, setSelection] = useState({
    prescription: null as string | null,
    bill: null as string | null,
    labReport: null as string | null,
  });

  const canRun =
    selection.prescription &&
    selection.bill &&
    selection.labReport &&
    pipeline.status !== "running";

  const handleRunPipeline = () => {
    if (!canRun) return;
    pipeline.startPipeline({
      prescriptionVaultId: selection.prescription!,
      billVaultId: selection.bill!,
      labReportVaultId: selection.labReport!,
    });
  };

  const handleReset = () => {
    pipeline.reset();
    setSelection({ prescription: null, bill: null, labReport: null });
  };

  const hasStarted = pipeline.status !== "idle";

  return (
    <div className="space-y-8 pb-12">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Scale className="text-[var(--color-primary)]" />
          AI Claim Judge
        </h1>
        <p className="text-[var(--color-muted)] mt-2">
          Select your medical documents and let our 3-agent AI pipeline determine
          if your claim is valid, detect fraud, and verify medical necessity.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ── Left Column: Document Selection ─────────────────────────────── */}
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
              label="Lab / Diagnostic Report"
              type="lab_report"
              items={vaultItems}
              selectedId={selection.labReport}
              onSelect={(id) => setSelection({ ...selection, labReport: id })}
            />

            {/* Run button */}
            <button
              disabled={!canRun}
              onClick={handleRunPipeline}
              className="w-full bg-[var(--color-primary)] text-white py-4 rounded-xl font-bold hover:brightness-110 transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-[var(--color-primary)]/20 flex items-center justify-center gap-2"
            >
              {pipeline.status === "running" ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Agents Running...
                </>
              ) : (
                <>
                  Analyze Claim
                  <ChevronRight size={18} />
                </>
              )}
            </button>

            {/* Reset button (shown after run) */}
            {hasStarted && pipeline.status !== "running" && (
              <button
                onClick={handleReset}
                className="w-full flex items-center justify-center gap-2 text-sm text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors py-2"
              >
                <RotateCcw size={14} />
                Start New Analysis
              </button>
            )}
          </div>

          {/* Session info (shown once complete) */}
          {pipeline.finalResult && (
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-4 text-xs text-[var(--color-muted)] space-y-1">
              <p className="font-semibold text-[var(--color-text)] text-sm mb-2">Session Saved ✓</p>
              <p>
                <span className="font-medium">Session ID:</span>{" "}
                <span className="font-mono">{pipeline.finalResult.sessionId.slice(0, 8)}…</span>
              </p>
              <p>
                <span className="font-medium">Events recorded:</span>{" "}
                {pipeline.events.length}
              </p>
              <p>
                <span className="font-medium">Verdict:</span>{" "}
                <span
                  className={
                    pipeline.finalResult.isClaimable
                      ? "text-emerald-400 font-bold"
                      : "text-red-400 font-bold"
                  }
                >
                  {pipeline.finalResult.verdict}
                </span>
              </p>
            </div>
          )}
        </div>

        {/* ── Right Column: Pipeline View ──────────────────────────────────── */}
        <div className="lg:col-span-2">
          {!hasStarted ? (
            /* Empty state */
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center p-12 bg-[var(--color-surface)]/50 border-2 border-dashed border-[var(--color-border)] rounded-2xl text-[var(--color-muted)] text-center space-y-4">
              <Scale size={48} className="opacity-20" />
              <div>
                <p className="font-semibold text-[var(--color-text)]">3-Agent AI Pipeline</p>
                <p className="text-sm mt-1 max-w-xs">
                  Select one document of each type and click{" "}
                  <strong>Analyze Claim</strong> to start the multi-agent
                  validation pipeline.
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <AgentPill icon="🔬" name="Extractor" />
                <span>→</span>
                <AgentPill icon="⚖️" name="The Judge" />
                <span>→</span>
                <AgentPill icon="🛡️" name="Gatekeeper" />
              </div>
            </div>
          ) : (
            <AgentPipelineView
              status={pipeline.status}
              agentStates={pipeline.agentStates}
              activeAgent={pipeline.activeAgent}
              activeTool={pipeline.activeTool}
              events={pipeline.events}
              finalResult={pipeline.finalResult}
              error={pipeline.error}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function AgentPill({ icon, name }: { icon: string; name: string }) {
  return (
    <div className="flex items-center gap-1.5 bg-[var(--color-soft)] border border-[var(--color-border)] px-3 py-1.5 rounded-full">
      <span>{icon}</span>
      <span className="font-medium text-[var(--color-text)]">{name}</span>
    </div>
  );
}

import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, ShieldAlert, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { AgentNode } from './AgentNode';
import { DataPacket } from './DataPacket';
import { EventLog } from './EventLog';
import {
  AGENT_META,
  type AgentId,
  type AgentState,
  type FinalPipelineResult,
  type ClinicalValidationReport,
  type GatekeeperReport,
} from './pipeline.types';

interface AgentPipelineViewProps {
  status: 'idle' | 'running' | 'complete' | 'error';
  agentStates: Record<AgentId, AgentState>;
  activeAgent: AgentId | null;
  activeTool: string | null;
  events: ReturnType<typeof import('./usePipelineSSE').usePipelineSSE>['events'];
  bufferedEvents: number;
  receivedEvents: number;
  finalResult: FinalPipelineResult | null;
  error: string | null;
}

const AGENTS: Exclude<AgentId, 'system'>[] = ['agent_1', 'agent_2', 'agent_3', 'agent_4'];

const isHandoffActive = (
  from: Exclude<AgentId, 'system'>,
  to: Exclude<AgentId, 'system'>,
  agentStates: Record<AgentId, AgentState>,
): boolean => {
  const fromState = agentStates[from];
  const toState = agentStates[to];
  return fromState === 'done' && (toState === 'active' || toState === 'thinking' || toState === 'tool_calling');
};

export function AgentPipelineView({
  status,
  agentStates,
  activeAgent,
  activeTool,
  events,
  bufferedEvents,
  receivedEvents,
  finalResult,
  error,
}: AgentPipelineViewProps) {
  const handoff_1_2 = isHandoffActive('agent_1', 'agent_2', agentStates);
  const handoff_2_3 = isHandoffActive('agent_2', 'agent_3', agentStates);
  const handoff_3_4 = isHandoffActive('agent_3', 'agent_4', agentStates);
  const activeIndex = activeAgent && activeAgent !== 'system'
    ? AGENTS.indexOf(activeAgent)
    : AGENTS.findLastIndex((agentId) => agentStates[agentId] !== 'idle');
  const currentIndex = activeIndex >= 0 ? activeIndex : 0;
  const shouldStack = status === 'running';

  return (
    <div className="space-y-6">
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className={`w-2 h-2 rounded-full ${
            status === 'running' ? 'bg-blue-400 animate-pulse'
              : status === 'complete' ? 'bg-emerald-400'
                : status === 'error' ? 'bg-red-400 animate-pulse'
                  : 'bg-[var(--color-border)]'
          }`} />
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
            {status === 'idle' ? 'Ready'
              : status === 'running' ? 'Pipeline Running...'
                : status === 'complete' ? 'Analysis Complete'
                  : 'Pipeline Halted'}
          </span>
        </div>

        {shouldStack ? (
          <div className="relative mx-auto min-h-[460px] max-w-3xl overflow-hidden py-4">
            {AGENTS.map((agentId, i) => {
              const distance = i - currentIndex;
              const absDistance = Math.abs(distance);
              const isFocused = i === currentIndex;

              return (
                <motion.div
                  key={agentId}
                  layout
                  initial={false}
                  animate={{
                    y: distance * 64,
                    scale: isFocused ? 1 : Math.max(0.84, 0.96 - absDistance * 0.06),
                    opacity: isFocused ? 1 : Math.max(0.35, 0.92 - absDistance * 0.2),
                    zIndex: 20 - absDistance,
                  }}
                  transition={{ type: 'spring', stiffness: 220, damping: 24 }}
                  className="absolute left-1/2 top-0 w-full max-w-2xl -translate-x-1/2 px-2"
                >
                  <AgentNode
                    agentId={agentId}
                    state={agentStates[agentId]}
                    activeTool={activeAgent === agentId ? activeTool : null}
                    stackMode
                    stepNumber={i + 1}
                  />
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="flex items-stretch gap-2 overflow-x-auto pb-4 custom-scrollbar">
            {AGENTS.map((agentId, i) => (
              <div key={agentId} className="flex items-stretch gap-2 flex-1 min-w-0">
                <div className="flex-1 min-w-[250px] h-full">
                  <AgentNode
                    agentId={agentId}
                    state={agentStates[agentId]}
                    activeTool={activeAgent === agentId ? activeTool : null}
                    stepNumber={i + 1}
                  />
                </div>
                {i < AGENTS.length - 1 && (
                  <div className="self-center">
                    <DataPacket
                      active={i === 0 ? handoff_1_2 : i === 1 ? handoff_2_3 : handoff_3_4}
                      label="PDF"
                      color={AGENT_META[AGENTS[i + 1]].color}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--color-border)] pt-3 text-xs text-[var(--color-muted)]">
          <span>Playback delay: 1 second per event</span>
          <span>{bufferedEvents > 0 ? `Buffered in memory: ${bufferedEvents} waiting` : 'Playback caught up'}</span>
        </div>
      </div>

      <AnimatePresence>
        {status === 'error' && error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="rounded-2xl border-2 border-red-500/50 bg-red-500/10 p-5"
          >
            <div className="flex items-start gap-4">
              <div className="p-2.5 bg-red-500 rounded-xl flex-shrink-0">
                <AlertTriangle className="text-white" size={22} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-red-400 text-base">Pipeline Halted - Action Required</p>
                <p className="text-sm text-red-300 mt-1.5 leading-relaxed break-words">
                  {error.length > 250 ? `${error.slice(0, 250)}...` : error}
                </p>
                <p className="text-xs text-[var(--color-muted)] mt-2">
                  Check the event log below for the full trace. Click <strong>Start New Analysis</strong> to retry.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <EventLog events={events} bufferedEvents={bufferedEvents} receivedEvents={receivedEvents} />

      <AnimatePresence>
        {finalResult && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            <VerdictCard result={finalResult} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function VerdictCard({ result }: { result: FinalPipelineResult }) {
  const [showValidation, setShowValidation] = useState(false);
  const [showGatekeeper, setShowGatekeeper] = useState(false);

  const isClaimable = result.isClaimable;
  const isNeeds = result.verdict === 'NEEDS_REVIEW';

  return (
    <div className="space-y-4">
      <div className={`p-6 rounded-2xl border-2 ${
        isClaimable
          ? 'bg-emerald-500/10 border-emerald-500/40'
          : isNeeds
            ? 'bg-amber-500/10 border-amber-500/40'
            : 'bg-red-500/10 border-red-500/40'
      }`}>
        <div className="flex items-center gap-4">
          <div className={`p-4 rounded-2xl text-white ${isClaimable ? 'bg-emerald-500' : isNeeds ? 'bg-amber-500' : 'bg-red-500'}`}>
            {isClaimable ? <ShieldCheck size={32} /> : <ShieldAlert size={32} />}
          </div>
          <div>
            <h3 className={`text-2xl font-black ${isClaimable ? 'text-emerald-400' : isNeeds ? 'text-amber-400' : 'text-red-400'}`}>
              {isClaimable ? 'CLAIMABLE' : isNeeds ? 'NEEDS REVIEW' : 'NOT CLAIMABLE'}
            </h3>
            <p className="text-sm text-[var(--color-muted)] mt-1 max-w-xl leading-relaxed">
              {result.verdictSummary}
            </p>
          </div>
        </div>

        {result.verdictReasons.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">Reasons</p>
            {result.verdictReasons.map((reason, i) => (
              <div key={i} className={`text-sm flex items-start gap-2 ${isClaimable ? 'text-emerald-300' : 'text-red-300'}`}>
                <span className="mt-1 w-1.5 h-1.5 rounded-full bg-current flex-shrink-0" />
                {reason}
              </div>
            ))}
          </div>
        )}
      </div>

      {result.validationReport && (
        <ExpandableSection
          title="Agent 2 - Clinical Validation Report"
          open={showValidation}
          onToggle={() => setShowValidation(!showValidation)}
        >
          <ValidationDetail report={result.validationReport} />
        </ExpandableSection>
      )}

      {result.gatekeeperReport && (
        <ExpandableSection
          title="Agent 3 - Integrity Gatekeeper Report"
          open={showGatekeeper}
          onToggle={() => setShowGatekeeper(!showGatekeeper)}
        >
          <GatekeeperDetail report={result.gatekeeperReport as GatekeeperReport} />
        </ExpandableSection>
      )}
    </div>
  );
}

function ExpandableSection({ title, open, onToggle, children }: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-5 hover:bg-[var(--color-soft)] transition-colors"
      >
        <span className="font-semibold text-sm">{title}</span>
        {open ? <ChevronUp size={16} className="text-[var(--color-muted)]" /> : <ChevronDown size={16} className="text-[var(--color-muted)]" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="p-5 pt-0 border-t border-[var(--color-border)]">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ValidationDetail({ report }: { report: ClinicalValidationReport }) {
  return (
    <div className="space-y-4 pt-4 text-sm">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="p-3 bg-[var(--color-soft)] rounded-xl">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted)] mb-1">Matched Condition</p>
          <p className="font-semibold">{report.matched_condition ?? 'Unknown'}</p>
          <p className="text-[11px] text-[var(--color-muted)] mt-0.5">
            Qdrant confidence: {(report.qdrant_confidence * 100).toFixed(1)}%
          </p>
        </div>

        <StatusTile
          label="ICD-10 Specificity"
          passed={report.icd10_specificity.is_leaf_node && !report.icd10_specificity.non_billable_hit}
          detail={report.icd10_specificity.reason}
        />

        <StatusTile
          label="Medical Necessity"
          passed={report.medical_necessity.passed}
          detail={report.medical_necessity.reason}
        />

        <StatusTile
          label={`Upcoding Check (${report.fraud_detection.upcoding.severity})`}
          passed={report.fraud_detection.upcoding.type === 'NONE'}
          detail={report.fraud_detection.upcoding.description}
        />

        <StatusTile
          label={`Unbundling Check (${report.fraud_detection.unbundling.severity})`}
          passed={report.fraud_detection.unbundling.type === 'NONE'}
          detail={report.fraud_detection.unbundling.description}
        />
      </div>

      {report.medical_necessity.unauthorized_cpts.length > 0 && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
          <p className="text-[10px] font-bold uppercase tracking-wider text-red-400 mb-2">Unauthorized CPT Codes</p>
          <div className="flex flex-wrap gap-2">
            {report.medical_necessity.unauthorized_cpts.map((cpt) => (
              <span key={cpt} className="text-xs bg-red-500/20 text-red-300 px-2 py-1 rounded-lg font-mono">{cpt}</span>
            ))}
          </div>
        </div>
      )}

      <div className="p-3 bg-[var(--color-soft)] rounded-xl">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted)] mb-1">Groq AI Fraud Assessment</p>
        <p className="text-xs text-[var(--color-text)] leading-relaxed">{report.fraud_detection.ai_reasoning}</p>
      </div>
    </div>
  );
}

function GatekeeperDetail({ report }: { report: GatekeeperReport }) {
  return (
    <div className="space-y-3 pt-4 text-sm">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <StatusTile
          label="Administrative"
          passed={report.checks.administrative.passed}
          detail={report.checks.administrative.reason ?? 'Patient ID and provider NPI verified'}
        />
        <StatusTile
          label="Policy & Premium"
          passed={report.checks.policy_active.passed}
          detail={report.checks.policy_active.reason ?? 'Policy active and premium paid'}
        />
        <StatusTile
          label="Clinical Triangulation"
          passed={report.checks.triangulation.passed}
          detail={report.checks.triangulation.reason ?? 'All services match prescriptions'}
        />
      </div>
    </div>
  );
}

function StatusTile({ label, passed, detail }: { label: string; passed: boolean; detail?: string }) {
  return (
    <div className={`p-3 rounded-xl border ${passed ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
      <div className="flex items-center justify-between mb-1">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted)]">{label}</p>
        <span className={`text-xs font-bold ${passed ? 'text-emerald-400' : 'text-red-400'}`}>
          {passed ? 'OK' : 'X'}
        </span>
      </div>
      {detail && <p className="text-xs text-[var(--color-muted)] leading-relaxed">{detail}</p>}
    </div>
  );
}

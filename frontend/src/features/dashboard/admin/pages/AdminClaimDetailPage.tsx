import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, FileText, Play, CheckCircle, XCircle,
  ChevronDown, ChevronUp, Banknote,
} from 'lucide-react';
import { useAdminClaimDetail, useMakeDecision, type AdjudicationResult } from '../api/adminClaims.api';
import { AgentPipelineView } from '../../client/components/AgentPipelineView';
import { usePipelineSSE } from '../../client/components/AgentPipelineView/usePipelineSSE';
import { getAccessToken } from '../../../../lib/authStorage';
import type { AgentEvent } from '../../client/components/AgentPipelineView/pipeline.types';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

const navigate = (path: string) => {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
};

// ─── Financial Breakdown (admin view) ────────────────────────────────────────

function AdminFinancialBreakdown({ adj }: { adj: AdjudicationResult }) {
  const [showCpt, setShowCpt] = useState(false);
  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden">
      <div className="p-5 border-b border-[var(--color-border)] flex items-center justify-between">
        <p className="font-bold">💰 Agent 4 — Financial Adjudication</p>
        <span className="text-xs text-emerald-400 font-mono">The Calculator</span>
      </div>
      <div className="p-5 space-y-2.5 text-sm">
        <FRow label="Total Billed" value={`$${adj.totalBilledAmount.toFixed(2)}`} />
        <FRow label="Allowable Limit" value={`$${adj.totalAllowableAmount.toFixed(2)}`} muted />
        <FRow label="Approved Amount (Scrubbed)" value={`$${adj.approvedAmount.toFixed(2)}`} bold />
        <FRow label="Scrub Savings" value={`$${adj.scrubSavings.toFixed(2)}`} className="text-amber-400" />
        <div className="border-t border-[var(--color-border)] pt-3 space-y-2">
          <FRow label="Copay" value={`$${adj.copay.toFixed(2)}`} />
          <FRow label={`Coinsurance (${(adj.coinsuranceRate * 100).toFixed(0)}%)`} value={`$${adj.coinsuranceCharge.toFixed(2)}`} />
          <FRow label="Patient Responsibility" value={`$${adj.patientResponsibility.toFixed(2)}`} className="text-red-400" bold />
          <FRow label="Insurer Should Pay" value={`$${adj.insurerPays.toFixed(2)}`} className="text-emerald-400 text-base" bold />
        </div>
        <button
          onClick={() => setShowCpt(!showCpt)}
          className="w-full flex items-center justify-between text-xs text-[var(--color-muted)] mt-1 hover:text-[var(--color-text)]"
        >
          <span>CPT breakdown ({adj.cptBreakdown.length})</span>
          {showCpt ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>
        <AnimatePresence>
          {showCpt && (
            <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
              {adj.cptBreakdown.map((b) => (
                <div key={b.cptCode} className="flex items-center justify-between text-xs py-1.5 border-b border-[var(--color-border)] last:border-0">
                  <span className="font-mono font-bold">{b.cptCode}</span>
                  <span className="text-[var(--color-muted)]">${b.billedAmount.toFixed(0)} → ${b.allowableAmount.toFixed(0)}</span>
                  {b.scrubSavings > 0 && <span className="text-amber-400">-${b.scrubSavings.toFixed(0)}</span>}
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
        {adj.notes.map((n, i) => (
          <p key={i} className="text-xs text-[var(--color-muted)] italic border-l-2 border-[var(--color-border)] pl-2">{n}</p>
        ))}
      </div>
    </div>
  );
}

function FRow({ label, value, muted, bold, className }: {
  label: string; value: string; muted?: boolean; bold?: boolean; className?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[var(--color-muted)]">{label}</span>
      <span className={`${bold ? 'font-bold' : ''} ${muted ? 'text-[var(--color-muted)]' : ''} ${className ?? ''}`}>{value}</span>
    </div>
  );
}

// ─── Admin Decision Panel ─────────────────────────────────────────────────────

function DecisionPanel({ claimId, insurerPays, onDecisionMade }: {
  claimId: string;
  insurerPays: number;
  onDecisionMade: () => void;
}) {
  const { mutateAsync, isPending, error } = useMakeDecision(claimId);
  const [decision, setDecision] = useState<'APPROVED' | 'PARTIAL_APPROVED' | 'REJECTED' | null>(null);
  const [remark, setRemark] = useState('');
  const [partialAmount, setPartialAmount] = useState(insurerPays);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!decision) return;
    await mutateAsync({
      decision,
      adminRemark: remark || undefined,
      adminApprovedAmount: decision === 'PARTIAL_APPROVED' ? partialAmount : undefined,
    });
    setSubmitted(true);
    onDecisionMade();
  };

  if (submitted) {
    return (
      <div className="p-6 bg-emerald-500/10 border-2 border-emerald-500/30 rounded-2xl text-center">
        <CheckCircle size={32} className="text-emerald-400 mx-auto mb-2" />
        <p className="font-bold text-emerald-400">Decision Recorded</p>
        <p className="text-sm text-[var(--color-muted)] mt-1">The client has been notified and can view the result.</p>
      </div>
    );
  }

  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 space-y-5">
      <p className="font-bold text-base">⚖️ Make Admin Decision</p>

      {error && <p className="text-sm text-red-400 bg-red-500/10 p-3 rounded-xl">{(error as Error).message}</p>}

      <div className="grid grid-cols-3 gap-3">
        {([
          ['APPROVED', '✅ Approve', 'bg-emerald-500 text-white', '#10b981'],
          ['PARTIAL_APPROVED', '⚡ Partial', 'bg-teal-500 text-white', '#14b8a6'],
          ['REJECTED', '❌ Reject', 'bg-red-500 text-white', '#ef4444'],
        ] as const).map(([d, label, activeClass]) => (
          <button
            key={d}
            onClick={() => setDecision(d)}
            className={`py-3 rounded-xl text-sm font-bold border-2 transition-all ${
              decision === d
                ? `${activeClass} border-transparent shadow-lg`
                : 'border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-primary)]/40'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {decision === 'PARTIAL_APPROVED' && (
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">Insurer Pays (Admin Override)</label>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-[var(--color-muted)] font-bold">$</span>
            <input
              type="number"
              min={0}
              step={0.01}
              value={partialAmount}
              onChange={(e) => setPartialAmount(parseFloat(e.target.value) || 0)}
              className="flex-1 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-4 py-2.5 text-sm font-mono"
            />
          </div>
          <div className="flex justify-between text-xs text-[var(--color-muted)] mt-1.5">
            <span>AI recommendation: ${insurerPays.toFixed(2)}</span>
            <span>Patient additionally pays: ${Math.max(0, insurerPays - partialAmount).toFixed(2)}</span>
          </div>
        </div>
      )}

      <div>
        <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
          Admin Remark {decision === 'REJECTED' ? '(Required)' : '(Optional)'}
        </label>
        <textarea
          value={remark}
          onChange={(e) => setRemark(e.target.value)}
          rows={3}
          placeholder={
            decision === 'REJECTED'
              ? 'Explain why this claim is being rejected...'
              : 'Add optional notes visible to the client...'
          }
          className="w-full mt-1.5 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-4 py-3 text-sm focus:outline-none resize-none"
        />
      </div>

      <button
        disabled={!decision || isPending || (decision === 'REJECTED' && !remark.trim())}
        onClick={handleSubmit}
        className="w-full py-3.5 bg-[var(--color-primary)] text-white rounded-xl font-bold text-sm disabled:opacity-40 hover:opacity-90 transition-opacity"
      >
        {isPending ? 'Saving...' : 'Submit Decision'}
      </button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function AdminClaimDetailPage({ claimId }: { claimId: string }) {
  const { data: claim, isLoading, refetch } = useAdminClaimDetail(claimId);
  const pipeline = usePipelineSSE();
  const [analysisStarted, setAnalysisStarted] = useState(false);
  const [showVerdict, setShowVerdict] = useState(false);

  // 2-second reveal delay on verdict
  useEffect(() => {
    if (pipeline.status === 'complete' || pipeline.status === 'error') {
      const timer = setTimeout(() => setShowVerdict(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [pipeline.status]);

  const handleRunAnalysis = async () => {
    setAnalysisStarted(true);
    setShowVerdict(false);

    // Reset pipeline state
    pipeline.reset();

    const token = getAccessToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const res = await fetch(`${API}/claims/admin/${claimId}/analyze`, { method: 'POST', headers });

      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { message?: string })?.message || `Server error ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event = JSON.parse(line.slice(6)) as AgentEvent;
              pipeline.enqueueEvent(event);
            } catch { /* skip malformed */ }
          }
        }
      }
      // Refetch claim after pipeline finishes
      refetch();
    } catch (err) {
      pipeline.enqueueEvent({
        seq: 9999, t: 0, agent: 'system', type: 'PIPELINE_ERROR',
        message: (err as Error).message || 'Pipeline failed',
      });
    }
  };

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!claim) return <div className="text-[var(--color-muted)] text-center py-12">Claim not found.</div>;

  const adj = (claim.adjudicationResult ?? (claim.claimSession as any)?.adjudicationResult) as AdjudicationResult | null;

  // Use adjudication from live pipeline result if available, otherwise from DB
  const liveAdj = pipeline.finalResult?.adjudicationResult as AdjudicationResult | null;
  const displayAdj = liveAdj ?? adj;
  const insurerPays = displayAdj?.insurerPays ?? 0;
  const alreadyDecided = !!claim.adminDecision;

  // Show decision panel: either after live pipeline completes (with 2s delay) or if already has a session
  const showDecisionPanel = !alreadyDecided && (
    (analysisStarted && pipeline.status === 'complete' && showVerdict) ||
    (!analysisStarted && !!claim.claimSession)
  );

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back */}
      <button
        onClick={() => navigate('/dashboard/claims')}
        className="flex items-center gap-2 text-sm text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors"
      >
        <ArrowLeft size={16} /> Back to Claims
      </button>

      {/* Patient + Claim header */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-[var(--color-primary)]/20 flex items-center justify-center font-bold text-[var(--color-primary)] text-sm">
              {(claim.user.name ?? claim.user.email).slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="font-bold text-lg">{claim.user.name ?? claim.user.email}</p>
              <p className="text-sm text-[var(--color-muted)]">{claim.user.email}</p>
              {claim.user.memberProfile && (
                <p className="text-xs text-[var(--color-muted)] mt-0.5">
                  {claim.user.memberProfile.planType} · {claim.user.memberProfile.memberId}
                  {' · '}Copay ${claim.user.memberProfile.copay}
                  {' · '}Coinsurance {(claim.user.memberProfile.coinsuranceRate * 100).toFixed(0)}%
                </p>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-[var(--color-muted)]">Billed Amount</p>
            <p className="text-2xl font-black font-mono">${claim.billedAmount.toFixed(2)}</p>
            <p className="text-xs text-[var(--color-muted)] mt-0.5">{claim.provider}</p>
          </div>
        </div>
      </div>

      {/* Documents */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5">
        <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)] mb-4 flex items-center gap-2">
          <FileText size={13} /> Submitted Evidence Documents
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {claim.vaultItems.map((v) => (
            <a key={v.id} href={v.url} target="_blank" rel="noreferrer"
              className="flex flex-col gap-1.5 p-3 bg-[var(--color-soft)] rounded-xl hover:bg-[var(--color-border)] transition-colors group border border-transparent hover:border-[var(--color-primary)]/30"
            >
              <FileText size={20} className="text-[var(--color-muted)] group-hover:text-[var(--color-primary)] transition-colors" />
              <p className="text-sm font-medium truncate">{v.fileName}</p>
              <p className="text-xs text-[var(--color-muted)] capitalize">{v.type.replace('_', ' ')}</p>
            </a>
          ))}
        </div>
      </div>

      {/* Run AI Analysis — shown only when not yet started and no prior session */}
      {!analysisStarted && !claim.claimSession && (
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-8 text-center">
          <div className="w-16 h-16 bg-[var(--color-primary)]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Play size={28} className="text-[var(--color-primary)] ml-1" />
          </div>
          <p className="font-bold text-xl mb-2">Run AI Claim Analysis</p>
          <p className="text-sm text-[var(--color-muted)] mb-6 max-w-md mx-auto">
            4-agent pipeline: Clinical Extractor → The Judge → Integrity Gatekeeper → Financial Adjudicator
          </p>
          <button
            onClick={handleRunAnalysis}
            className="px-8 py-3.5 bg-[var(--color-primary)] text-white rounded-xl font-bold hover:opacity-90 transition-opacity"
          >
            🚀 Start AI Analysis
          </button>
        </div>
      )}

      {/* Re-run button if prior session exists */}
      {!analysisStarted && claim.claimSession && !alreadyDecided && (
        <div className="flex justify-end">
          <button
            onClick={handleRunAnalysis}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-[var(--color-muted)] border border-[var(--color-border)] rounded-xl hover:text-[var(--color-text)] transition-colors"
          >
            <Play size={14} /> Re-run Analysis
          </button>
        </div>
      )}

      {/* Live pipeline view */}
      {analysisStarted && (
        <AgentPipelineView
          status={pipeline.status}
          agentStates={pipeline.agentStates}
          activeAgent={pipeline.activeAgent}
          activeTool={pipeline.activeTool}
          events={pipeline.events}
          finalResult={showVerdict ? pipeline.finalResult : null}
          error={pipeline.error}
        />
      )}

      {/* 2-second countdown spinner */}
      {analysisStarted && pipeline.status === 'complete' && !showVerdict && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-3 py-8">
          <div className="w-10 h-10 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-[var(--color-muted)] animate-pulse">Preparing financial verdict...</p>
        </motion.div>
      )}

      {/* Prior session result — show when no live pipeline */}
      {!analysisStarted && claim.claimSession && displayAdj && (
        <AdminFinancialBreakdown adj={displayAdj} />
      )}

      {/* Live pipeline financial result after verdict reveal */}
      {analysisStarted && showVerdict && displayAdj && (
        <AdminFinancialBreakdown adj={displayAdj} />
      )}

      {/* Decision panel */}
      {showDecisionPanel && (
        <DecisionPanel
          claimId={claimId}
          insurerPays={insurerPays}
          onDecisionMade={() => refetch()}
        />
      )}

      {/* Already decided banner */}
      {alreadyDecided && (
        <div className={`p-6 rounded-2xl border-2 ${
          claim.adminDecision !== 'REJECTED' ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'
        }`}>
          <div className="flex items-start gap-4">
            {claim.adminDecision !== 'REJECTED'
              ? <CheckCircle size={24} className="text-emerald-400 flex-shrink-0" />
              : <XCircle size={24} className="text-red-400 flex-shrink-0" />
            }
            <div>
              <p className="font-bold text-lg">
                {claim.adminDecision === 'APPROVED' ? '✅ Claim Approved'
                  : claim.adminDecision === 'PARTIAL_APPROVED' ? `⚡ Partial Settlement — $${(claim.adminApprovedAmount ?? 0).toFixed(2)} granted`
                  : '❌ Claim Rejected'}
              </p>
              {claim.adminRemark && <p className="text-sm text-[var(--color-muted)] mt-2 leading-relaxed">{claim.adminRemark}</p>}
              {claim.decidedAt && <p className="text-xs text-[var(--color-muted)] mt-2">Decided: {new Date(claim.decidedAt).toLocaleString()}</p>}
            </div>
          </div>
        </div>
      )}

      {/* Payment request on file */}
      {claim.paymentRequest && (
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)] mb-3 flex items-center gap-2">
            <Banknote size={13} /> Client Payment Request
          </p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {([
              ['Account Holder', claim.paymentRequest.accountHolderName],
              ['Bank', claim.paymentRequest.bankName],
              ['IFSC / Routing', claim.paymentRequest.ifscCode],
              ['Account No.', `••••${claim.paymentRequest.accountNumber?.slice(-4) ?? '????'}`],
              ['Grant Amount', `$${claim.paymentRequest.grantedAmount.toFixed(2)}`],
              ['Status', claim.paymentRequest.status.replace('_', ' ')],
            ] as [string, string][]).map(([k, v]) => (
              <div key={k} className="bg-[var(--color-soft)] rounded-xl px-3 py-2">
                <p className="text-xs text-[var(--color-muted)]">{k}</p>
                <p className="font-semibold">{v}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

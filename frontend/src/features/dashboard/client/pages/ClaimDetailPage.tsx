import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, FileText, CheckCircle, XCircle, Clock, AlertCircle,
  ChevronDown, ChevronUp, Banknote, Shield, RefreshCw,
} from 'lucide-react';
import { useClaimDetail, useSubmitPaymentRequest, useRefileClaim } from '../api/claims.api';
import { useMedicalVault } from '../api/dashboard.api';
import type { AdjudicationResult } from '../../admin/api/adminClaims.api';

const navigate = (path: string) => {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
};

// ─── Financial Breakdown Card ─────────────────────────────────────────────────

function FinancialBreakdownCard({ adj, grantedAmount }: { adj: AdjudicationResult; grantedAmount: number }) {
  const [showCpt, setShowCpt] = useState(false);
  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden">
      <div className="p-5 border-b border-[var(--color-border)]">
        <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)] mb-1">💰 Financial Breakdown — Agent 4</p>
        <p className="font-bold text-lg">The Calculator Result</p>
      </div>
      <div className="p-5 space-y-3">
        <Row label="Total Billed" value={`$${adj.totalBilledAmount.toFixed(2)}`} />
        <Row label="Allowable Limit" value={`$${adj.totalAllowableAmount.toFixed(2)}`} muted />
        {adj.scrubSavings > 0 && (
          <Row label="Price Scrubbing Applied" value={`−$${adj.scrubSavings.toFixed(2)}`} className="text-amber-400" />
        )}
        <Row label="Approved Amount" value={`$${adj.approvedAmount.toFixed(2)}`} bold />
        <div className="border-t border-[var(--color-border)] pt-3 space-y-2">
          <Row label={`Copay`} value={`$${adj.copay.toFixed(2)}`} />
          <Row label={`Coinsurance (${(adj.coinsuranceRate * 100).toFixed(0)}%)`} value={`$${adj.coinsuranceCharge.toFixed(2)}`} />
          <Row label="Patient Responsibility" value={`$${adj.patientResponsibility.toFixed(2)}`} className="text-red-400 font-bold" bold />
          <Row label="Insurer Pays (AI)" value={`$${adj.insurerPays.toFixed(2)}`} className="text-emerald-400 font-bold" bold />
        </div>
        {grantedAmount !== adj.insurerPays && (
          <div className="mt-3 p-3 bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 rounded-xl">
            <Row label="Admin Approved Grant" value={`$${grantedAmount.toFixed(2)}`} className="text-[var(--color-primary)] font-bold" bold />
          </div>
        )}
        {adj.cptBreakdown.length > 0 && (
          <>
            <button
              onClick={() => setShowCpt(!showCpt)}
              className="w-full flex items-center justify-between text-xs text-[var(--color-muted)] mt-1 hover:text-[var(--color-text)] transition-colors"
            >
              <span>CPT Code Breakdown ({adj.cptBreakdown.length} codes)</span>
              {showCpt ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            <AnimatePresence>
              {showCpt && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="space-y-1.5 pt-2">
                    {adj.cptBreakdown.map((b) => (
                      <div key={b.cptCode} className="flex items-center justify-between text-xs px-3 py-2 bg-[var(--color-soft)] rounded-lg">
                        <span className="font-mono font-bold">{b.cptCode}</span>
                        <span className="text-[var(--color-muted)]">Billed ${b.billedAmount.toFixed(0)} → Allowable ${b.allowableAmount.toFixed(0)}</span>
                        {b.scrubSavings > 0 && <span className="text-amber-400">-${b.scrubSavings.toFixed(0)}</span>}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
        {adj.notes.map((n, i) => (
          <p key={i} className="text-xs text-[var(--color-muted)] italic border-l-2 border-[var(--color-border)] pl-3">{n}</p>
        ))}
      </div>
    </div>
  );
}

function Row({ label, value, muted, bold, className }: {
  label: string; value: string; muted?: boolean; bold?: boolean; className?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-[var(--color-muted)]">{label}</span>
      <span className={`text-sm ${bold ? 'font-bold' : ''} ${muted ? 'text-[var(--color-muted)]' : ''} ${className ?? ''}`}>{value}</span>
    </div>
  );
}

// ─── Payment Request Form ─────────────────────────────────────────────────────

function PaymentRequestForm({ claimId, grantedAmount, onSuccess }: { claimId: string; grantedAmount: number; onSuccess: () => void }) {
  const { mutateAsync, isPending, error } = useSubmitPaymentRequest(claimId);
  const [form, setForm] = useState({ accountHolderName: '', accountNumber: '', bankName: '', ifscCode: '', additionalNotes: '' });

  const handleChange = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await mutateAsync(form);
    onSuccess();
  };

  return (
    <div className="bg-[var(--color-surface)] border-2 border-[var(--color-primary)]/30 rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2.5 bg-[var(--color-primary)] rounded-xl"><Banknote className="text-white" size={20} /></div>
        <div>
          <p className="font-bold text-base">Accept Grant & Submit Bank Details</p>
          <p className="text-sm text-[var(--color-muted)]">Grant amount: <span className="font-bold text-emerald-400">${grantedAmount.toFixed(2)}</span></p>
        </div>
      </div>

      {error && <p className="text-sm text-red-400 mb-4 bg-red-500/10 p-3 rounded-xl">{(error as Error).message}</p>}

      <form onSubmit={handleSubmit} className="space-y-4">
        {[
          { key: 'accountHolderName', label: 'Account Holder Name', placeholder: 'As per bank records' },
          { key: 'accountNumber', label: 'Account Number', placeholder: '••••••••••' },
          { key: 'bankName', label: 'Bank Name', placeholder: 'e.g. State Bank of India' },
          { key: 'ifscCode', label: 'IFSC / Routing Code', placeholder: 'e.g. SBIN0001234' },
        ].map(({ key, label, placeholder }) => (
          <div key={key} className="space-y-1">
            <label className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">{label}</label>
            <input
              required
              type={key === 'accountNumber' ? 'password' : 'text'}
              value={form[key as keyof typeof form]}
              onChange={handleChange(key as keyof typeof form)}
              placeholder={placeholder}
              className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/40"
            />
          </div>
        ))}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">Additional Notes (optional)</label>
          <textarea
            value={form.additionalNotes}
            onChange={handleChange('additionalNotes')}
            rows={2}
            placeholder="Any special instructions..."
            className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-4 py-2.5 text-sm focus:outline-none resize-none"
          />
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="w-full py-3 bg-[var(--color-primary)] text-white rounded-xl font-semibold text-sm disabled:opacity-40 hover:opacity-90 transition-opacity"
        >
          {isPending ? 'Submitting...' : '✅ Submit Payment Request'}
        </button>
        <p className="text-xs text-[var(--color-muted)] text-center">
          Your bank details will be verified by the admin before payment is released.
        </p>
      </form>
    </div>
  );
}

// ─── Re-file Modal ────────────────────────────────────────────────────────────

function RefileModal({ claimId, onClose }: { claimId: string; onClose: () => void }) {
  const { data: vaultData } = useMedicalVault();
  const { mutateAsync, isPending } = useRefileClaim(claimId);
  const [selected, setSelected] = useState({ prescription: '', bill: '', labReport: '' });

  const prescriptions = vaultData?.filter((v) => v.type === 'prescription') ?? [];
  const bills = vaultData?.filter((v) => v.type === 'bill') ?? [];
  const labReports = vaultData?.filter((v) => v.type === 'lab_report') ?? [];

  const canSubmit = selected.prescription && selected.bill && selected.labReport;

  const handleSubmit = async () => {
    const result = await mutateAsync({ prescriptionVaultId: selected.prescription, billVaultId: selected.bill, labReportVaultId: selected.labReport });
    onClose();
    navigate(`/dashboard/claims/${result.id}`);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 w-full max-w-md space-y-4"
      >
        <h3 className="font-bold text-lg">Re-file Claim</h3>
        <p className="text-sm text-[var(--color-muted)]">Select updated documents to re-submit your claim.</p>
        {([
          { key: 'prescription', label: '💊 Prescription', items: prescriptions },
          { key: 'bill', label: '🧾 Medical Bill', items: bills },
          { key: 'labReport', label: '🔬 Lab Report', items: labReports },
        ] as const).map(({ key, label, items }) => (
          <div key={key} className="space-y-1">
            <label className="text-xs font-semibold text-[var(--color-muted)]">{label}</label>
            <select
              value={selected[key]}
              onChange={(e) => setSelected((p) => ({ ...p, [key]: e.target.value }))}
              className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-4 py-2.5 text-sm"
            >
              <option value="">Select...</option>
              {items.map((v) => <option key={v.id} value={v.id}>{v.fileName}</option>)}
            </select>
          </div>
        ))}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-[var(--color-border)] rounded-xl text-sm font-semibold hover:bg-[var(--color-soft)] transition-colors">Cancel</button>
          <button
            disabled={!canSubmit || isPending}
            onClick={handleSubmit}
            className="flex-1 py-2.5 bg-[var(--color-primary)] text-white rounded-xl text-sm font-semibold disabled:opacity-40"
          >
            {isPending ? 'Filing...' : 'Re-file Claim'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const STATUS_ICONS = {
  PENDING: <Clock size={20} className="text-amber-400" />,
  UNDER_REVIEW: <AlertCircle size={20} className="text-blue-400" />,
  APPROVED: <CheckCircle size={20} className="text-emerald-400" />,
  PARTIAL_APPROVED: <CheckCircle size={20} className="text-teal-400" />,
  REJECTED: <XCircle size={20} className="text-red-400" />,
};

export function ClaimDetailPage({ claimId }: { claimId: string }) {
  const { data: claim, isLoading, refetch } = useClaimDetail(claimId);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showRefile, setShowRefile] = useState(false);

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!claim) return <div className="text-center py-12 text-[var(--color-muted)]">Claim not found.</div>;

  const adj = claim.claimSession?.adjudicationResult as AdjudicationResult | null;
  const grantedAmount = claim.adminApprovedAmount ?? adj?.insurerPays ?? 0;
  const isApproved = claim.status === 'APPROVED' || claim.status === 'PARTIAL_APPROVED';
  const hasPaymentRequest = !!claim.paymentRequest;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Back */}
      <button onClick={() => navigate('/dashboard/claims')} className="flex items-center gap-2 text-sm text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors">
        <ArrowLeft size={16} /> Back to My Claims
      </button>

      {/* Header */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              {STATUS_ICONS[claim.status as keyof typeof STATUS_ICONS]}
              <span className="font-bold text-lg">{claim.provider}</span>
            </div>
            <p className="text-sm text-[var(--color-muted)] font-mono">ID: {claim.id}</p>
            <p className="text-sm text-[var(--color-muted)] mt-1">Filed: {new Date(claim.createdAt).toLocaleDateString()}</p>
            <p className="text-sm text-[var(--color-muted)]">Billed Amount: <span className="font-mono font-bold">${claim.billedAmount.toFixed(2)}</span></p>
          </div>
          <div className="text-right">
            {claim.status === 'REJECTED' && (
              <button
                onClick={() => setShowRefile(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-xl text-sm font-semibold hover:bg-amber-500/20 transition-colors"
              >
                <RefreshCw size={15} /> Re-file Claim
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Admin Decision */}
      {claim.adminDecision && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-6 rounded-2xl border-2 ${
            isApproved ? 'bg-emerald-500/10 border-emerald-500/40'
            : 'bg-red-500/10 border-red-500/40'
          }`}
        >
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-xl text-white ${isApproved ? 'bg-emerald-500' : 'bg-red-500'}`}>
              {isApproved ? <CheckCircle size={24} /> : <XCircle size={24} />}
            </div>
            <div className="flex-1">
              <p className={`font-black text-xl mb-1 ${isApproved ? 'text-emerald-400' : 'text-red-400'}`}>
                {claim.adminDecision === 'APPROVED' ? '✅ Claim Approved'
                  : claim.adminDecision === 'PARTIAL_APPROVED' ? '⚡ Partial Settlement'
                  : '❌ Claim Rejected'}
              </p>
              {isApproved && (
                <p className="text-2xl font-bold text-emerald-300 mb-2">${grantedAmount.toFixed(2)} <span className="text-sm font-normal text-[var(--color-muted)]">grant approved</span></p>
              )}
              {claim.adminRemark && (
                <div className="mt-2 p-3 bg-black/20 rounded-xl">
                  <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)] mb-1">Admin Remark</p>
                  <p className="text-sm leading-relaxed">{claim.adminRemark}</p>
                </div>
              )}
              {claim.decidedAt && (
                <p className="text-xs text-[var(--color-muted)] mt-2">Decided: {new Date(claim.decidedAt).toLocaleString()}</p>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Financial Breakdown */}
      {adj && isApproved && (
        <FinancialBreakdownCard adj={adj} grantedAmount={grantedAmount} />
      )}

      {/* Payment Request Section */}
      {isApproved && (
        <>
          {hasPaymentRequest ? (
            <div className={`p-5 rounded-2xl border-2 ${
              claim.paymentRequest!.status === 'APPROVED' ? 'bg-emerald-500/10 border-emerald-500/30'
              : claim.paymentRequest!.status === 'REJECTED' ? 'bg-red-500/10 border-red-500/30'
              : 'bg-blue-500/10 border-blue-500/30'
            }`}>
              <div className="flex items-center gap-3">
                <Shield size={20} className={
                  claim.paymentRequest!.status === 'APPROVED' ? 'text-emerald-400'
                  : claim.paymentRequest!.status === 'REJECTED' ? 'text-red-400'
                  : 'text-blue-400'
                } />
                <div>
                  <p className="font-bold">Payment Request {claim.paymentRequest!.status.replace('_', ' ')}</p>
                  <p className="text-sm text-[var(--color-muted)]">
                    {claim.paymentRequest!.status === 'PENDING_VERIFICATION'
                      ? 'Your bank details are being verified by admin.'
                      : claim.paymentRequest!.status === 'APPROVED'
                        ? `Payment of $${claim.paymentRequest!.grantedAmount.toFixed(2)} has been approved! Transfer in progress.`
                        : `Payment rejected. ${(claim.paymentRequest as any)?.adminRemark ?? ''}`}
                  </p>
                </div>
              </div>
            </div>
          ) : !showPaymentForm ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[var(--color-surface)] border-2 border-[var(--color-primary)]/30 rounded-2xl p-6 text-center"
            >
              <Banknote size={36} className="text-[var(--color-primary)] mx-auto mb-3" />
              <p className="font-bold text-lg mb-1">Accept Your Grant</p>
              <p className="text-sm text-[var(--color-muted)] mb-5">
                You are entitled to <span className="font-bold text-emerald-400">${grantedAmount.toFixed(2)}</span>.
                Click below to enter your bank details and receive payment.
              </p>
              <button
                onClick={() => setShowPaymentForm(true)}
                className="px-6 py-3 bg-[var(--color-primary)] text-white rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity"
              >
                💰 Accept Grant & Enter Bank Details
              </button>
            </motion.div>
          ) : (
            <PaymentRequestForm
              claimId={claimId}
              grantedAmount={grantedAmount}
              onSuccess={() => { setShowPaymentForm(false); refetch(); }}
            />
          )}
        </>
      )}

      {/* Submitted Documents */}
      {claim.vaultItems && claim.vaultItems.length > 0 && (
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)] mb-4">Submitted Documents</p>
          <div className="space-y-2">
            {claim.vaultItems.map((v) => (
              <a key={v.id} href={v.url} target="_blank" rel="noreferrer"
                className="flex items-center gap-3 p-3 bg-[var(--color-soft)] rounded-xl hover:bg-[var(--color-border)] transition-colors group"
              >
                <FileText size={16} className="text-[var(--color-muted)] group-hover:text-[var(--color-primary)] transition-colors" />
                <span className="text-sm font-medium truncate">{v.fileName}</span>
                <span className="ml-auto text-xs text-[var(--color-muted)] capitalize">{v.type.replace('_', ' ')}</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Pending state */}
      {(claim.status === 'PENDING' || claim.status === 'UNDER_REVIEW') && !claim.adminDecision && (
        <div className="p-5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl flex items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-[var(--color-primary)] border-t-transparent animate-spin flex-shrink-0" />
          <div>
            <p className="font-semibold">
              {claim.status === 'PENDING' ? 'Awaiting Admin Review' : 'AI Analysis In Progress'}
            </p>
            <p className="text-sm text-[var(--color-muted)] mt-0.5">
              {claim.status === 'PENDING'
                ? 'An admin will review and run AI analysis on your claim.'
                : 'The AI pipeline is currently analyzing your documents.'}
            </p>
          </div>
        </div>
      )}

      {/* Re-file modal */}
      {showRefile && <RefileModal claimId={claimId} onClose={() => setShowRefile(false)} />}
    </div>
  );
}

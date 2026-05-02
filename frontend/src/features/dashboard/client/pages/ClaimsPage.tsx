import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ClipboardList, Plus, FileText, CheckCircle, Clock, XCircle, AlertCircle, ChevronRight } from 'lucide-react';
import { useMyClaimsList, useFileClaim, type ClaimListItem } from '../api/claims.api';
import { useMedicalVault } from '../api/dashboard.api';

const navigate = (path: string) => {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
};

// ─── Status helpers ───────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  PENDING: { label: 'Pending Review', icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30' },
  UNDER_REVIEW: { label: 'Under Review', icon: AlertCircle, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30' },
  APPROVED: { label: 'Approved', icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' },
  PARTIAL_APPROVED: { label: 'Partial Approval', icon: CheckCircle, color: 'text-teal-400', bg: 'bg-teal-500/10 border-teal-500/30' },
  REJECTED: { label: 'Rejected', icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30' },
} as const;

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.PENDING;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.color}`}>
      <Icon size={11} />
      {cfg.label}
    </span>
  );
}

// ─── File Claim Tab ───────────────────────────────────────────────────────────

function FileClaimTab() {
  const { data: vaultData } = useMedicalVault();
  const { mutateAsync: fileClaim, isPending, error } = useFileClaim();
  const [selected, setSelected] = useState({ prescription: '', bill: '', labReport: '' });
  const [success, setSuccess] = useState<string | null>(null);

  const prescriptions = vaultData?.filter((v) => v.type === 'prescription') ?? [];
  const bills = vaultData?.filter((v) => v.type === 'bill') ?? [];
  const labReports = vaultData?.filter((v) => v.type === 'lab_report') ?? [];

  const canSubmit = selected.prescription && selected.bill && selected.labReport;

  const handleSubmit = async () => {
    try {
      const result = await fileClaim({
        prescriptionVaultId: selected.prescription,
        billVaultId: selected.bill,
        labReportVaultId: selected.labReport,
      });
      setSuccess(result.id);
      setSelected({ prescription: '', bill: '', labReport: '' });
    } catch { /* error shown via error binding */ }
  };

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center py-16 text-center"
      >
        <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mb-6">
          <CheckCircle size={40} className="text-white" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Claim Filed Successfully!</h2>
        <p className="text-[var(--color-muted)] mb-2">Your claim is now pending admin review.</p>
        <p className="text-xs text-[var(--color-muted)] font-mono mb-6">ID: {success}</p>
        <button
          onClick={() => setSuccess(null)}
          className="px-5 py-2 bg-[var(--color-primary)] text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          File Another Claim
        </button>
      </motion.div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold mb-1">File a New Claim</h2>
        <p className="text-sm text-[var(--color-muted)]">
          Select the three documents from your Medical Vault that support this claim.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-400">
          {(error as Error).message}
        </div>
      )}

      {/* Document selectors */}
      {([
        { key: 'prescription', label: '💊 Prescription', items: prescriptions, placeholder: 'Select prescription...' },
        { key: 'bill', label: '🧾 Medical Bill', items: bills, placeholder: 'Select bill...' },
        { key: 'labReport', label: '🔬 Lab Report', items: labReports, placeholder: 'Select lab report...' },
      ] as const).map(({ key, label, items, placeholder }) => (
        <div key={key} className="space-y-1.5">
          <label className="text-sm font-semibold text-[var(--color-text)]">{label}</label>
          <select
            value={selected[key]}
            onChange={(e) => setSelected((p) => ({ ...p, [key]: e.target.value }))}
            className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/40"
          >
            <option value="">{placeholder}</option>
            {items.map((item) => (
              <option key={item.id} value={item.id}>{item.fileName}</option>
            ))}
          </select>
          {items.length === 0 && (
            <p className="text-xs text-amber-400">No {key.replace(/([A-Z])/g, ' $1').toLowerCase()}s in vault. Upload one first.</p>
          )}
        </div>
      ))}

      <button
        disabled={!canSubmit || isPending}
        onClick={handleSubmit}
        className="w-full py-3.5 bg-[var(--color-primary)] text-white rounded-xl font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-all"
      >
        {isPending ? 'Filing Claim...' : '📋 Submit Claim for Review'}
      </button>

      <p className="text-xs text-[var(--color-muted)] text-center">
        Your claim will be reviewed by our clinical AI system and then verified by an admin.
      </p>
    </div>
  );
}

// ─── Claims List Tab ──────────────────────────────────────────────────────────

function ClaimsListTab({ claims }: { claims: ClaimListItem[] }) {
  if (claims.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <FileText size={48} className="text-[var(--color-border)] mb-4" />
        <p className="text-[var(--color-muted)]">No claims filed yet.</p>
        <p className="text-sm text-[var(--color-muted)] mt-1">Use the "File a Claim" tab to submit your first claim.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {claims.map((claim) => (
        <motion.div
          key={claim.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => navigate(`/dashboard/claims/${claim.id}`)}
          className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 cursor-pointer hover:border-[var(--color-primary)]/40 transition-all group"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <StatusBadge status={claim.status} />
                {claim.adminDecision === 'APPROVED' || claim.adminDecision === 'PARTIAL_APPROVED' ? (
                  <span className="text-xs text-emerald-400 font-semibold">
                    Grant: ${(claim.adminApprovedAmount ?? 0).toFixed(2)}
                  </span>
                ) : null}
                {claim.paymentRequest && (
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                    claim.paymentRequest.status === 'APPROVED' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                    : claim.paymentRequest.status === 'REJECTED' ? 'text-red-400 bg-red-500/10 border-red-500/30'
                    : 'text-blue-400 bg-blue-500/10 border-blue-500/30'
                  }`}>
                    Payment: {claim.paymentRequest.status.replace('_', ' ')}
                  </span>
                )}
              </div>
              <p className="font-semibold text-[var(--color-text)] truncate">{claim.provider}</p>
              <p className="text-sm text-[var(--color-muted)] mt-0.5">
                Billed: <span className="font-mono">${claim.billedAmount.toFixed(2)}</span>
                {' · '}Filed {new Date(claim.createdAt).toLocaleDateString()}
              </p>
              {claim.adminRemark && claim.status === 'REJECTED' && (
                <p className="text-xs text-red-400 mt-1.5 bg-red-500/5 px-2 py-1 rounded-lg border border-red-500/20">
                  Admin note: {claim.adminRemark.slice(0, 80)}{claim.adminRemark.length > 80 ? '...' : ''}
                </p>
              )}
            </div>
            <ChevronRight size={18} className="text-[var(--color-muted)] group-hover:text-[var(--color-primary)] transition-colors flex-shrink-0 mt-1" />
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function ClaimsPage() {
  const [tab, setTab] = useState<'list' | 'file'>('list');
  const { data: claims = [], isLoading } = useMyClaimsList();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[var(--color-text)] flex items-center gap-3">
            <ClipboardList className="text-[var(--color-primary)]" size={30} />
            My Claims
          </h1>
          <p className="text-[var(--color-muted)] mt-1">File and track your insurance claim submissions.</p>
        </div>
        <button
          onClick={() => setTab('file')}
          className="flex items-center gap-2 px-4 py-2.5 bg-[var(--color-primary)] text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          <Plus size={16} /> File New Claim
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[var(--color-border)] gap-1">
        {([['list', 'My Claims', ClipboardList], ['file', 'File a Claim', Plus]] as const).map(([t, label, Icon]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors -mb-px ${
              tab === t
                ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                : 'border-transparent text-[var(--color-muted)] hover:text-[var(--color-text)]'
            }`}
          >
            <Icon size={15} /> {label}
            {t === 'list' && claims.length > 0 && (
              <span className="ml-1 bg-[var(--color-primary)]/20 text-[var(--color-primary)] text-xs px-1.5 py-0.5 rounded-full font-bold">
                {claims.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {tab === 'list'
            ? isLoading
              ? <div className="text-[var(--color-muted)] text-center py-12">Loading claims...</div>
              : <ClaimsListTab claims={claims} />
            : <FileClaimTab />
          }
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

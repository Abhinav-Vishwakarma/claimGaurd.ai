import { useState } from 'react';
import { motion } from 'framer-motion';
import { ClipboardCheck, Clock, AlertCircle, Eye, Banknote, ChevronRight } from 'lucide-react';
import { useAdminClaimsList, useAdminPaymentRequests, useProcessPayment, type AdminClaimListItem, type AdminPaymentRequest } from '../api/adminClaims.api';

const navigate = (path: string) => {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
};

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  PENDING: { label: 'Pending', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30' },
  UNDER_REVIEW: { label: 'Under Review', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30' },
  APPROVED: { label: 'Approved', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' },
  PARTIAL_APPROVED: { label: 'Partial', color: 'text-teal-400', bg: 'bg-teal-500/10 border-teal-500/30' },
  REJECTED: { label: 'Rejected', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30' },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.PENDING;
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${cfg.bg} ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

// ─── Claim Card ───────────────────────────────────────────────────────────────

function ClaimCard({ claim }: { claim: AdminClaimListItem }) {
  const initials = (claim.user.name ?? claim.user.email).slice(0, 2).toUpperCase();

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => navigate(`/dashboard/claims/admin/${claim.id}`)}
      className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 cursor-pointer hover:border-[var(--color-primary)]/40 transition-all group"
    >
      <div className="flex items-start gap-4">
        <div className="w-11 h-11 rounded-full bg-[var(--color-primary)]/20 flex items-center justify-center font-bold text-[var(--color-primary)] flex-shrink-0 text-sm">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
            <p className="font-semibold truncate">{claim.user.name ?? claim.user.email}</p>
            <StatusBadge status={claim.status} />
          </div>
          <p className="text-sm text-[var(--color-muted)] truncate">{claim.provider}</p>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <span className="text-xs font-mono bg-[var(--color-soft)] px-2 py-0.5 rounded-lg">${claim.billedAmount.toFixed(2)} billed</span>
            {claim.user.memberProfile && (
              <span className="text-xs text-[var(--color-muted)]">{claim.user.memberProfile.planType} · {claim.user.memberProfile.memberId}</span>
            )}
            <span className="text-xs text-[var(--color-muted)]">{new Date(claim.createdAt).toLocaleDateString()}</span>
          </div>
          {claim.claimSession && (
            <p className={`text-xs mt-1.5 font-semibold ${claim.claimSession.isClaimable ? 'text-emerald-400' : 'text-red-400'}`}>
              AI: {claim.claimSession.verdict} — {claim.claimSession.verdictSummary?.slice(0, 60)}...
            </p>
          )}
        </div>
        <ChevronRight size={16} className="text-[var(--color-muted)] group-hover:text-[var(--color-primary)] transition-colors mt-1 flex-shrink-0" />
      </div>
    </motion.div>
  );
}

// ─── Payment Request Card ─────────────────────────────────────────────────────

function PaymentCard({ req }: { req: AdminPaymentRequest }) {
  const { mutateAsync, isPending } = useProcessPayment(req.id);
  const [remark, setRemark] = useState('');
  const [showForm, setShowForm] = useState(false);

  const handle = async (action: 'APPROVED' | 'REJECTED') => {
    await mutateAsync({ action, adminRemark: remark });
    setShowForm(false);
  };

  const PYMT_CFG: Record<string, { label: string; color: string }> = {
    PENDING_VERIFICATION: { label: 'Pending Verification', color: 'text-amber-400' },
    APPROVED: { label: 'Payment Approved', color: 'text-emerald-400' },
    REJECTED: { label: 'Payment Rejected', color: 'text-red-400' },
  };
  const pcfg = PYMT_CFG[req.status] ?? PYMT_CFG.PENDING_VERIFICATION;

  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 space-y-4">
      <div className="flex items-start gap-4">
        <div className="p-2.5 bg-emerald-500/10 rounded-xl"><Banknote className="text-emerald-400" size={20} /></div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="font-semibold">{req.user?.name ?? req.user?.email}</p>
            <span className={`text-xs font-bold ${pcfg.color}`}>{pcfg.label}</span>
          </div>
          <p className="text-sm text-[var(--color-muted)]">Grant: <span className="font-bold text-emerald-400">${req.grantedAmount.toFixed(2)}</span></p>
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-[var(--color-muted)]">
            <span>🏦 {req.bankName}</span>
            <span>📋 {req.ifscCode}</span>
            <span>👤 {req.accountHolderName}</span>
            <span>🔢 ••••{req.accountNumber.slice(-4)}</span>
          </div>
          {req.additionalNotes && <p className="text-xs text-[var(--color-muted)] mt-1 italic">Note: {req.additionalNotes}</p>}
        </div>
      </div>

      {req.status === 'PENDING_VERIFICATION' && (
        <>
          {!showForm ? (
            <button
              onClick={() => setShowForm(true)}
              className="w-full py-2 border border-[var(--color-border)] rounded-xl text-sm font-semibold hover:bg-[var(--color-soft)] transition-colors"
            >
              Review Payment Request
            </button>
          ) : (
            <div className="space-y-3 border-t border-[var(--color-border)] pt-4">
              <textarea
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                placeholder="Add a remark (optional)..."
                rows={2}
                className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-sm resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => handle('APPROVED')}
                  disabled={isPending}
                  className="flex-1 py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-bold disabled:opacity-40 hover:opacity-90"
                >✅ Approve Payment</button>
                <button
                  onClick={() => handle('REJECTED')}
                  disabled={isPending}
                  className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-bold disabled:opacity-40 hover:opacity-90"
                >❌ Reject</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function AdminClaimsPage() {
  const [tab, setTab] = useState<'active' | 'payments'>('active');
  const { data: claims = [], isLoading: claimsLoading } = useAdminClaimsList();
  const { data: payments = [], isLoading: paymentsLoading } = useAdminPaymentRequests();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <ClipboardCheck className="text-[var(--color-primary)]" size={30} />
          Claims Management
        </h1>
        <p className="text-[var(--color-muted)] mt-1">Review pending claims with AI analysis and manage payment approvals.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Pending', value: claims.filter((c) => c.status === 'PENDING').length, icon: Clock, color: 'text-amber-400' },
          { label: 'Under Review', value: claims.filter((c) => c.status === 'UNDER_REVIEW').length, icon: AlertCircle, color: 'text-blue-400' },
          { label: 'Awaiting Payment', value: payments.length, icon: Banknote, color: 'text-emerald-400' },
          { label: 'Total Active', value: claims.length, icon: Eye, color: 'text-[var(--color-primary)]' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Icon size={16} className={color} />
              <span className="text-xs text-[var(--color-muted)]">{label}</span>
            </div>
            <p className={`text-2xl font-black ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[var(--color-border)]">
        {([['active', 'Active Claims', ClipboardCheck], ['payments', 'Payment Requests', Banknote]] as const).map(([t, label, Icon]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 -mb-px transition-colors ${
              tab === t ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-transparent text-[var(--color-muted)]'
            }`}
          >
            <Icon size={15} /> {label}
            {t === 'active' && claims.length > 0 && (
              <span className="bg-[var(--color-primary)]/20 text-[var(--color-primary)] text-xs px-1.5 py-0.5 rounded-full font-bold">{claims.length}</span>
            )}
            {t === 'payments' && payments.length > 0 && (
              <span className="bg-emerald-500/20 text-emerald-400 text-xs px-1.5 py-0.5 rounded-full font-bold">{payments.length}</span>
            )}
          </button>
        ))}
      </div>

      {tab === 'active' && (
        <div className="space-y-3">
          {claimsLoading && <p className="text-[var(--color-muted)] text-center py-8">Loading claims...</p>}
          {!claimsLoading && claims.length === 0 && (
            <div className="text-center py-16 text-[var(--color-muted)]">
              <ClipboardCheck size={48} className="mx-auto mb-4 text-[var(--color-border)]" />
              No active claims to review.
            </div>
          )}
          {claims.map((c) => <ClaimCard key={c.id} claim={c} />)}
        </div>
      )}

      {tab === 'payments' && (
        <div className="space-y-3">
          {paymentsLoading && <p className="text-[var(--color-muted)] text-center py-8">Loading payment requests...</p>}
          {!paymentsLoading && payments.length === 0 && (
            <div className="text-center py-16 text-[var(--color-muted)]">
              <Banknote size={48} className="mx-auto mb-4 text-[var(--color-border)]" />
              No pending payment requests.
            </div>
          )}
          {payments.map((p) => <PaymentCard key={p.id} req={p} />)}
        </div>
      )}
    </div>
  );
}

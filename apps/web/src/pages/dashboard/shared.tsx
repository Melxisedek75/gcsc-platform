import {
  Award,
  Clock4,
  CheckCircle2,
  ClipboardList,
  AlertTriangle,
  XCircle,
  ShieldCheck,
  Building2,
  Home,
} from 'lucide-react';
import type { GcscCompliance } from '../../services/api';
import { contractorTrustCopy } from './format';
import type { AccountRole } from './types';

export const statusConfig: Record<string, { color: string; bg: string; icon: typeof CheckCircle2 }> = {
  New: { color: '#7B2FF7', bg: 'rgba(123,47,247,0.1)', icon: Award },
  Open: { color: '#7B2FF7', bg: 'rgba(123,47,247,0.1)', icon: Award },
  Pending: { color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', icon: Clock4 },
  Accepted: { color: '#3B6BF7', bg: 'rgba(59,107,247,0.1)', icon: CheckCircle2 },
  'In Progress': { color: '#3B6BF7', bg: 'rgba(59,107,247,0.1)', icon: Clock4 },
  Completed: { color: '#10B981', bg: 'rgba(16,185,129,0.1)', icon: CheckCircle2 },
  Submitted: { color: '#7B2FF7', bg: 'rgba(123,47,247,0.1)', icon: ClipboardList },
  Approved: { color: '#3B6BF7', bg: 'rgba(59,107,247,0.1)', icon: CheckCircle2 },
  Released: { color: '#10B981', bg: 'rgba(16,185,129,0.1)', icon: CheckCircle2 },
  Disputed: { color: '#EF4444', bg: 'rgba(239,68,68,0.1)', icon: AlertTriangle },
  'Under Review': { color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', icon: Clock4 },
  Awarded: { color: '#10B981', bg: 'rgba(16,185,129,0.1)', icon: Award },
  Declined: { color: '#EF4444', bg: 'rgba(239,68,68,0.1)', icon: XCircle },
};

export function StatusBadge({ status }: { status: string }) {
  const cfg = statusConfig[status] || statusConfig['New'];
  const Icon = cfg.icon;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ color: cfg.color, backgroundColor: cfg.bg }}
    >
      <Icon size={12} />
      {status}
    </span>
  );
}

export function ContractorTrustBadge({ verification }: { verification?: GcscCompliance | null }) {
  const status = verification?.overall_status || 'profile_incomplete';
  const copy = contractorTrustCopy[status] || contractorTrustCopy.profile_incomplete;
  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: copy.tone }}>
          Verification status
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold" style={{ color: copy.tone, backgroundColor: 'rgba(123,47,247,0.08)' }}>
          {verification?.ready_for_bids ? <CheckCircle2 size={12} /> : <Clock4 size={12} />}
          {copy.label}
        </span>
      </div>
      <p className="text-xs text-[#64748B] mt-2">{copy.detail}</p>
    </div>
  );
}

export function RoleBadge({ role }: { role: AccountRole | 'admin' }) {
  if (role === 'admin') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[rgba(123,47,247,0.08)] text-[#7B2FF7]">
        <ShieldCheck size={13} />
        Admin
      </span>
    );
  }

  const isContractor = role === 'contractor';
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[rgba(123,47,247,0.08)] text-[#7B2FF7]">
      {isContractor ? <Building2 size={13} /> : <Home size={13} />}
      {isContractor ? 'Builder / Contractor' : 'Owner / Homeowner'}
    </span>
  );
}

export function DetailBlock({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-[#7B2FF7]">{title}</p>
      <div className="mt-2 space-y-2">
        {lines.map((line) => (
          <p key={line} className="text-sm leading-6 text-[#475569]">{line}</p>
        ))}
      </div>
    </div>
  );
}

export function LockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3B6BF7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

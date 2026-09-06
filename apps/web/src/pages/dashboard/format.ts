import type { GcscAuditEvent, GcscProfile, GcscUser } from '../../services/api';

export const fieldClass =
  'w-full px-4 py-2.5 rounded-lg border border-[#E2E8F0] bg-white text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#7B2FF7]/30 focus:border-[#7B2FF7] transition-all';

export function formatCurrency(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function projectStatusLabel(status: string): string {
  const map: Record<string, string> = {
    open: 'Open',
    pending: 'Pending',
    in_progress: 'In Progress',
    active: 'In Progress',
    disputed: 'Disputed',
    completed: 'Completed',
    cancelled: 'Cancelled',
  };
  return map[status] || status;
}

export function bidStatusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: 'Submitted',
    accepted: 'Accepted',
    rejected: 'Declined',
  };
  return map[status] || status;
}

export function milestoneStatusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: 'Pending',
    submitted: 'Submitted',
    approved: 'Approved',
    released: 'Released',
    disputed: 'Disputed',
  };
  return map[status] || status;
}

export const profileFieldLabels: Record<string, string> = {
  fullName: 'Full name',
  phone: 'Phone',
  companyName: 'Company name',
  ein: 'EIN',
  licenseNumber: 'License number',
  serviceArea: 'Service area',
  specialties: 'Specialties',
  propertyAddress: 'Property address',
  propertyType: 'Property type',
  budgetRange: 'Budget range',
  projectNeeds: 'Project needs',
  city: 'City',
  state: 'State',
};

export const complianceStatusCopy: Record<string, { label: string; tone: string }> = {
  profile_incomplete: { label: 'Profile incomplete', tone: '#F59E0B' },
  documents_missing: { label: 'Documents missing', tone: '#F59E0B' },
  pending_review: { label: 'Pending review', tone: '#3B6BF7' },
  wallet_missing: { label: 'Wallet missing', tone: '#7B2FF7' },
  verified: { label: 'Verified', tone: '#10B981' },
  rejected: { label: 'Needs correction', tone: '#EF4444' },
};

export const contractorTrustCopy: Record<string, { label: string; detail: string; tone: string }> = {
  verified: { label: 'Verified Contractor', detail: 'Ready for escrow bidding', tone: '#10B981' },
  pending_review: { label: 'Pending review', detail: 'Documents submitted, awaiting review', tone: '#3B6BF7' },
  documents_missing: { label: 'Missing documents', detail: 'Required verification documents are not complete', tone: '#F59E0B' },
  wallet_missing: { label: 'Wallet missing', detail: 'WebAuth wallet is not connected yet', tone: '#7B2FF7' },
  profile_incomplete: { label: 'Profile incomplete', detail: 'Business profile needs more details', tone: '#F59E0B' },
  rejected: { label: 'Needs correction', detail: 'One or more documents need review', tone: '#EF4444' },
};

export function formatFileSize(bytes: number) {
  if (!bytes) return '0 KB';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function documentTypeLabel(type: string) {
  return String(type || 'Document')
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function getProfile(user: GcscUser): GcscProfile {
  return {
    accountType: user.role === 'contractor' ? 'contractor' : 'homeowner',
    companyName: '',
    businessName: '',
    ein: '',
    licenseNumber: '',
    serviceArea: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    specialties: [],
    yearsInBusiness: '',
    website: '',
    bio: '',
    logoDataUrl: '',
    projectNeeds: '',
    propertyAddress: '',
    propertyType: '',
    budgetRange: '',
    ...(user.profile || {}),
  };
}

export function initials(user: GcscUser): string {
  const label = user.fullName || user.full_name || user.email;
  return label
    .split(/\s|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'GC';
}

export function getLocalProfileCompletion(user: GcscUser) {
  const profile = getProfile(user);
  const required = user.role === 'contractor'
    ? ['fullName', 'phone', 'companyName', 'ein', 'licenseNumber', 'serviceArea', 'specialties']
    : ['fullName', 'phone', 'propertyAddress', 'propertyType', 'budgetRange', 'projectNeeds', 'city', 'state'];
  const missing = required.filter((field) => {
    if (field === 'fullName') return !(user.fullName || user.full_name);
    if (field === 'phone') return !user.phone;
    if (field === 'specialties') return !profile.specialties?.length;
    return !String(profile[field as keyof GcscProfile] || '').trim();
  });

  return {
    percent: Math.round(((required.length - missing.length) / required.length) * 100),
    completed: missing.length === 0,
    missing,
    required,
  };
}

export function profileFieldLabel(field: string) {
  return profileFieldLabels[field] || field;
}

export const auditActionLabels: Record<string, string> = {
  'profile.updated': 'Profile updated',
  'document.submitted': 'Document submitted',
  'document.reviewed': 'Document reviewed',
  'wallet.connected': 'Wallet connected',
  'project.created': 'Project created',
  'bid.submitted': 'Bid submitted',
  'bid.accepted': 'Bid accepted',
  'escrow.milestone.created': 'Milestone created',
  'escrow.milestone.submitted': 'Milestone submitted',
  'escrow.milestone.approved': 'Milestone approved',
  'escrow.milestone.released': 'Milestone released',
  'escrow.milestone.disputed': 'Milestone disputed',
  'escrow.chain_tx.recorded': 'Chain transaction recorded',
  'escrow.chain_tx.confirmed': 'Chain transaction confirmed',
  'escrow.chain_tx.failed': 'Chain transaction failed',
  'financing.precheck.created': 'Financing precheck created',
  'payment.intent.created': 'Payment intent created',
};

export function metadataSummary(event: GcscAuditEvent) {
  const metadata = event.metadata || {};
  const keys = Object.keys(metadata);
  if (keys.length === 0) return 'No metadata';

  return keys
    .slice(0, 5)
    .map((key) => {
      const value = metadata[key];
      if (Array.isArray(value)) return `${key}: ${value.join(', ')}`;
      if (typeof value === 'object' && value !== null) return `${key}: ${JSON.stringify(value)}`;
      return `${key}: ${String(value)}`;
    })
    .join(' | ');
}

export function financingProductLabel(productType: string) {
  const labels: Record<string, string> = {
    escrow_advance: 'Escrow-Backed Contractor Advance',
    token_credit: 'Token-Collateral Equipment Credit',
    claimbridge: 'ClaimBridge Emergency Advance',
    working_capital: 'Contract-Backed Working Capital',
  };
  return labels[productType] || productType;
}

// GCSC API Client
const API_BASE = import.meta.env.VITE_API_URL || 'https://gcsc-backend-production.up.railway.app/api'

export interface GcscProfile {
  accountType: 'homeowner' | 'contractor'
  companyName?: string
  businessName?: string
  ein?: string
  licenseNumber?: string
  serviceArea?: string
  address?: string
  city?: string
  state?: string
  zip?: string
  specialties?: string[]
  yearsInBusiness?: string
  website?: string
  bio?: string
  logoDataUrl?: string
  projectNeeds?: string
  propertyAddress?: string
  propertyType?: string
  budgetRange?: string
  updatedAt?: string
}

export interface GcscProfileCompletion {
  percent: number
  completed: boolean
  missing: string[]
  required: string[]
}

export interface GcscUserDocument {
  id: number
  user_id: number
  user?: GcscDocumentOwner | null
  document_type: string
  file_name: string
  mime_type: string
  file_size: number
  file_sha256: string
  status: 'submitted' | 'approved' | 'rejected' | 'missing'
  review_note?: string
  submitted_at?: string
  reviewed_at?: string | null
  reviewed_by?: number | null
  created_at?: string
  updated_at?: string
}

export interface GcscDocumentOwner {
  id: number
  email: string
  role: 'homeowner' | 'contractor' | 'admin' | string
  full_name: string
  companyName?: string
  businessName?: string
  serviceArea?: string
  accountType?: string
  logoDataUrl?: string
}

export interface GcscAuditEvent {
  id: number
  actor_id: number | null
  target_user_id: number | null
  action: string
  entity_type: string
  entity_id: number | null
  metadata: Record<string, unknown>
  ip_address?: string
  user_agent?: string
  created_at?: string
}

export type GcscFinancingProductType = 'escrow_advance' | 'token_credit' | 'claimbridge' | 'working_capital'

export interface GcscFinancingPrecheck {
  id: number
  user_id: number
  user?: GcscDocumentOwner | null
  role: 'homeowner' | 'contractor' | 'admin' | string
  product_type: GcscFinancingProductType | string
  state: string
  context: Record<string, unknown>
  safety_acknowledged: boolean
  status: string
  admin_note?: string
  created_at?: string
  updated_at?: string
}

export interface GcscRequiredDocument {
  document_type: string
  label: string
  status: 'missing' | 'submitted' | 'approved' | 'rejected'
  document: GcscUserDocument | null
}

export interface GcscComplianceChecklistItem {
  key: string
  label: string
  completed: boolean
  status?: string
}

export interface GcscCompliance {
  overall_status: 'profile_incomplete' | 'documents_missing' | 'pending_review' | 'wallet_missing' | 'verified' | 'rejected'
  profile_completion: GcscProfileCompletion
  required_documents: GcscRequiredDocument[]
  documents?: GcscUserDocument[]
  documents_submitted: boolean
  documents_approved: boolean
  wallet_connected: boolean
  ready_for_bids: boolean
  checklist: GcscComplianceChecklistItem[]
}

export interface GcscWallet {
  accountName: string
  permission: string
  publicKey?: string
  walletType: string
  connectedAt?: string
}

export interface GcscUser {
  id: number
  email: string
  role: 'homeowner' | 'contractor' | 'admin'
  full_name: string
  fullName?: string
  phone?: string
  profile?: GcscProfile
  profile_completion?: GcscProfileCompletion
  wallet?: GcscWallet | null
  email_verified?: boolean
  phone_verified?: boolean
  verification_status?: string
  verification_channel?: 'email' | 'sms' | string
}

export interface GcscProject {
  id: number
  homeowner_id: number
  title: string
  description: string
  category: string
  budget_min: number
  budget_max: number
  location: string
  timeline_days: number
  status: string
  escrow_id?: number | null
  created_at: string
}

export interface GcscBidContractor {
  id: number
  full_name: string
  companyName?: string
  serviceArea?: string
  specialties?: string[]
  yearsInBusiness?: string
  bio?: string
  logoDataUrl?: string
}

export interface GcscPublicContractorProfile {
  contractor: GcscBidContractor
  verification: GcscCompliance
}

export interface GcscBid {
  id: number
  project_id: number
  contractor_id: number
  amount: number
  proposed_timeline_days: number
  message?: string
  status: string
  contractor?: GcscBidContractor | null
  contractor_verification?: GcscCompliance | null
  created_at: string
}

export interface GcscEscrow {
  id: number
  project_id: number
  homeowner_id: number
  contractor_id: number
  total_amount: number
  status: string
  created_at: string
}

export interface GcscChainTx {
  id: number
  milestone_id: number
  escrow_id: number
  action: string
  tx_id: string
  chain_id: string
  contract_account: string
  actor: string
  status: string
  created_by?: number | null
  created_at: string
}

export interface GcscMilestone {
  id: number
  escrow_id: number
  title: string
  description: string
  amount: number
  status: string
  verified_by?: string
  chain_txs?: GcscChainTx[]
  created_at: string
  updated_at?: string
}

class ApiClient {
  private token: string | null = null

  constructor() {
    this.token = localStorage.getItem('gcsc_auth_token')
  }

  setToken(token: string) {
    this.token = token
    localStorage.setItem('gcsc_auth_token', token)
  }

  clearToken() {
    this.token = null
    localStorage.removeItem('gcsc_auth_token')
  }

  private async request(path: string, options: RequestInit = {}) {
    const url = `${API_BASE}${path}`
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers as Record<string, string>
    }
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`

    const res = await fetch(url, { ...options, headers })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || `API error: ${res.status}`)
    return data
  }

  // AUTH
  register(body: { email: string; password: string; role: string; fullName: string; phone?: string; verificationMode?: string }) {
    return this.request('/auth/register', { method: 'POST', body: JSON.stringify(body) })
  }
  checkVerification(body: { email: string; phone?: string; role: string; channel: 'email' | 'sms'; code: string }) {
    return this.request('/auth/verification/check', { method: 'POST', body: JSON.stringify(body) })
  }
  login(body: { email: string; password: string }) {
    return this.request('/auth/login', { method: 'POST', body: JSON.stringify(body) })
  }
  getProfile() {
    return this.request('/auth/profile')
  }
  updateProfile(body: Partial<GcscProfile> & { fullName?: string; full_name?: string; phone?: string }) {
    return this.request('/auth/profile', { method: 'PUT', body: JSON.stringify(body) })
  }
  getDocuments() {
    return this.request('/auth/documents')
  }
  submitDocument(body: { documentType: string; fileName: string; mimeType: string; fileDataUrl: string; reviewNote?: string }) {
    return this.request('/auth/documents', { method: 'POST', body: JSON.stringify(body) })
  }
  getCompliance() {
    return this.request('/auth/compliance')
  }
  reviewDocument(id: number, body: { status: 'approved' | 'rejected'; reviewNote?: string }) {
    return this.request(`/admin/documents/${id}/review`, { method: 'PUT', body: JSON.stringify(body) })
  }
  getAdminDocuments(status?: string) {
    const qs = status ? '?' + new URLSearchParams({ status }) : ''
    return this.request(`/admin/documents${qs}`)
  }
  getAdminAuditEvents(filters?: { action?: string; actor_id?: number | string; target_user_id?: number | string; limit?: number | string }) {
    const params = new URLSearchParams()
    if (filters?.action) params.set('action', filters.action)
    if (filters?.actor_id) params.set('actor_id', String(filters.actor_id))
    if (filters?.target_user_id) params.set('target_user_id', String(filters.target_user_id))
    if (filters?.limit) params.set('limit', String(filters.limit))
    const qs = params.toString() ? `?${params.toString()}` : ''
    return this.request(`/admin/audit-events${qs}`)
  }
  createFinancingPrecheck(body: {
    productType: GcscFinancingProductType
    state?: string
    context?: Record<string, unknown>
    safetyAcknowledged: boolean
  }) {
    return this.request('/financing/prechecks', { method: 'POST', body: JSON.stringify(body) })
  }
  getFinancingPrechecks() {
    return this.request('/financing/prechecks')
  }
  getAdminFinancingPrechecks(status?: string) {
    const qs = status ? '?' + new URLSearchParams({ status }) : ''
    return this.request(`/admin/financing-prechecks${qs}`)
  }
  logout() {
    this.clearToken()
  }

  // PROJECTS
  getProjects(filters?: Record<string, string>) {
    const qs = filters ? '?' + new URLSearchParams(filters) : ''
    return this.request(`/projects${qs}`)
  }
  getProject(id: number) {
    return this.request(`/projects/${id}`)
  }
  getPublicContractorProfile(id: number | string) {
    return this.request(`/contractors/${id}/public`)
  }
  getMyProjects() {
    return this.request('/projects/my/projects')
  }
  createProject(body: {
    title: string
    description: string
    category?: string
    budget_min?: number
    budget_max?: number
    location?: string
    timeline_days?: number
  }) {
    return this.request('/projects', { method: 'POST', body: JSON.stringify(body) })
  }

  // BIDS
  getMyBids() {
    return this.request('/bids/my/bids')
  }
  submitBid(body: { project_id: number; amount: number; proposed_timeline_days?: number; message?: string }) {
    return this.request('/bids', { method: 'POST', body: JSON.stringify(body) })
  }
  acceptBid(id: number) {
    return this.request(`/bids/${id}/accept`, { method: 'POST' })
  }

  // ESCROW
  createEscrow(body: { projectId: number; homeownerId: number; contractorId: number; amount: number }) {
    return this.request('/escrow/create', { method: 'POST', body: JSON.stringify(body) })
  }
  getEscrow(id: number) {
    return this.request(`/escrow/${id}`)
  }
  createMilestone(escrowId: number, body: { title: string; description?: string; amount: number }) {
    return this.request(`/escrow/${escrowId}/milestones`, { method: 'POST', body: JSON.stringify(body) })
  }
  submitMilestone(id: number) {
    return this.request(`/milestones/${id}/submit`, { method: 'POST' })
  }
  approveMilestone(id: number) {
    return this.request(`/milestones/${id}/approve`, { method: 'POST' })
  }
  releaseMilestone(id: number) {
    return this.request(`/milestones/${id}/release`, { method: 'POST' })
  }
  disputeMilestone(id: number) {
    return this.request(`/milestones/${id}/dispute`, { method: 'POST' })
  }
  recordMilestoneChainTx(id: number, body: {
    action: string
    tx_id: string
    chain_id: string
    contract_account: string
    actor: string
    status?: string
  }) {
    return this.request(`/milestones/${id}/chain-txs`, { method: 'POST', body: JSON.stringify(body) })
  }
  verifyMilestoneChainTx(milestoneId: number, txId: string) {
    return this.request(`/milestones/${milestoneId}/chain-txs/${txId}/verify`, { method: 'POST' })
  }

  // TOKEN
  getTokenInfo() {
    return this.request('/token/info')
  }
  getPriceHistory() {
    return this.request('/token/price-history')
  }
  calculateStaking(body: { amount: number; duration: number }) {
    return this.request('/token/staking/calculate', { method: 'POST', body: JSON.stringify(body) })
  }

  // WALLET
  connectWallet(body: { accountName: string; permission?: string; publicKey?: string; walletType?: string }) {
    return this.request('/wallet/connect', { method: 'POST', body: JSON.stringify(body) })
  }
  getConnectedWallet() {
    return this.request('/wallet/me')
  }
  getBalance(account: string) {
    return this.request(`/wallet/balance/${account}`)
  }
}

export const api = new ApiClient()

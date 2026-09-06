import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { motion } from 'framer-motion'
import { ArrowLeft, Building2, CheckCircle2, Clock4, MapPin, ShieldCheck, Tag, UserCircle, XCircle } from 'lucide-react'
import { api, type GcscPublicContractorProfile } from '../services/api'

const statusCopy: Record<string, { label: string; tone: string; icon: typeof CheckCircle2 }> = {
  verified: { label: 'Verified contractor', tone: '#10B981', icon: CheckCircle2 },
  pending_review: { label: 'Pending review', tone: '#3B6BF7', icon: Clock4 },
  documents_missing: { label: 'Documents missing', tone: '#F59E0B', icon: Clock4 },
  wallet_missing: { label: 'Wallet missing', tone: '#7B2FF7', icon: Clock4 },
  profile_incomplete: { label: 'Profile incomplete', tone: '#F59E0B', icon: Clock4 },
  rejected: { label: 'Needs correction', tone: '#EF4444', icon: XCircle },
}

function VerificationPill({ status }: { status: string }) {
  const copy = statusCopy[status] || statusCopy.profile_incomplete
  const Icon = copy.icon
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold"
      style={{ color: copy.tone, backgroundColor: 'rgba(123,47,247,0.08)' }}
    >
      <Icon size={16} />
      {copy.label}
    </span>
  )
}

export default function ContractorProfile() {
  const { id } = useParams()
  const [profile, setProfile] = useState<GcscPublicContractorProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true

    const loadProfile = async () => {
      setLoading(true)
      setError('')
      try {
        const response = await api.getPublicContractorProfile(id || '')
        if (mounted) setProfile(response)
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : 'Could not load contractor profile')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    void loadProfile()

    return () => {
      mounted = false
    }
  }, [id])

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex items-center gap-2 text-[#7B2FF7] font-inter font-semibold">
          <Clock4 size={18} className="animate-pulse" />
          Loading contractor profile...
        </div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <section className="section-padding bg-white">
        <div className="mx-auto max-w-container container-padding text-center">
          <p className="text-xs font-semibold uppercase tracking-wider gradient-text">Public Contractor Profile</p>
          <h1 className="mt-4 font-outfit font-bold text-[2rem] gradient-text">Profile unavailable</h1>
          <p className="mt-3 text-[#64748B]">{error || 'This contractor profile could not be found.'}</p>
          <Link to="/dashboard" className="mt-8 inline-flex items-center gap-2 rounded-full border border-[#C4B5FD] px-5 py-3 text-sm font-semibold text-[#7B2FF7]">
            <ArrowLeft size={16} />
            Back to dashboard
          </Link>
        </div>
      </section>
    )
  }

  const contractor = profile.contractor
  const verification = profile.verification
  const specialties = contractor.specialties || []

  return (
    <section className="section-padding bg-white">
      <div className="mx-auto max-w-container container-padding">
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-[#7B2FF7] hover:text-[#3B6BF7] transition-colors">
          <ArrowLeft size={16} />
          Back to dashboard
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
          className="mt-8 grid grid-cols-1 lg:grid-cols-[0.8fr_1.2fr] gap-8"
        >
          <aside className="glass-card p-6">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-[#7B2FF7] via-[#3B6BF7] to-[#00D4FF] flex items-center justify-center overflow-hidden">
              {contractor.logoDataUrl ? (
                <img src={contractor.logoDataUrl} alt={contractor.companyName || contractor.full_name} className="w-full h-full object-cover" />
              ) : (
                <Building2 size={38} className="text-white" />
              )}
            </div>
            <p className="mt-6 text-xs font-semibold uppercase tracking-wider gradient-text">Public Contractor Profile</p>
            <h1 className="mt-2 font-outfit font-bold text-[2rem] leading-tight gradient-text">
              {contractor.companyName || contractor.full_name}
            </h1>
            <p className="mt-2 text-sm text-[#64748B]">{contractor.full_name}</p>
            <div className="mt-5">
              <VerificationPill status={verification.overall_status} />
            </div>
          </aside>

          <div className="space-y-6">
            <div className="glass-card p-6">
              <p className="text-xs font-semibold uppercase tracking-wider gradient-text">Verification Status</p>
              <h2 className="mt-2 font-outfit font-bold text-[1.5rem] gradient-text">Bid readiness</h2>
              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {verification.checklist.map((item) => (
                  <div key={item.key} className="rounded-2xl border border-[#E2E8F0] p-4 flex items-center gap-3">
                    {item.completed ? <CheckCircle2 size={18} className="text-[#10B981] shrink-0" /> : <Clock4 size={18} className="text-[#F59E0B] shrink-0" />}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#0F172A] truncate">{item.label}</p>
                      <p className="text-xs text-[#94A3B8]">{item.completed ? 'Complete' : item.status || 'Needed'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="glass-card p-6">
                <div className="flex items-center gap-2 text-[#7B2FF7]">
                  <MapPin size={18} />
                  <span className="text-xs font-semibold uppercase tracking-wider">Service Area</span>
                </div>
                <p className="mt-3 font-outfit font-bold text-[1.25rem] gradient-text">{contractor.serviceArea || 'Not listed'}</p>
              </div>

              <div className="glass-card p-6">
                <div className="flex items-center gap-2 text-[#7B2FF7]">
                  <UserCircle size={18} />
                  <span className="text-xs font-semibold uppercase tracking-wider">Experience</span>
                </div>
                <p className="mt-3 font-outfit font-bold text-[1.25rem] gradient-text">{contractor.yearsInBusiness || 'Not listed'}</p>
              </div>
            </div>

            {specialties.length > 0 && (
              <div className="glass-card p-6">
                <div className="flex items-center gap-2 text-[#7B2FF7]">
                  <Tag size={18} />
                  <span className="text-xs font-semibold uppercase tracking-wider">Specialties</span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {specialties.map((item) => (
                    <span key={item} className="rounded-full bg-[rgba(123,47,247,0.08)] px-3 py-1.5 text-sm font-semibold text-[#7B2FF7]">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {contractor.bio && (
              <div className="glass-card p-6">
                <div className="flex items-center gap-2 text-[#7B2FF7]">
                  <ShieldCheck size={18} />
                  <span className="text-xs font-semibold uppercase tracking-wider">Profile Notes</span>
                </div>
                <p className="mt-4 text-sm leading-7 text-[#475569]">{contractor.bio}</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  )
}

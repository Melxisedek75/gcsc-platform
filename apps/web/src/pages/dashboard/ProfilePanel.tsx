import { useState, type ChangeEvent } from 'react';
import { motion } from 'framer-motion';
import { Upload, Save, Loader2 } from 'lucide-react';
import { api, type GcscProfile, type GcscUser } from '../../services/api';
import { fieldClass, getProfile, getLocalProfileCompletion, initials, profileFieldLabel } from './format';
import { RoleBadge } from './shared';

export function ProfilePanel({ user, onUserChange }: { user: GcscUser; onUserChange: (user: GcscUser) => void }) {
  const [profile, setProfile] = useState<GcscProfile>(() => getProfile(user));
  const [fullName, setFullName] = useState(user.fullName || user.full_name || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const isContractor = user.role === 'contractor';
  const completion = user.profile_completion || getLocalProfileCompletion(user);

  const updateProfile = (field: keyof GcscProfile, value: string | string[]) => {
    setProfile((current) => ({ ...current, [field]: value }));
  };

  const onLogoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 750000) {
      setStatus('Logo file is too large. Please use an image under 750KB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => updateProfile('logoDataUrl', String(reader.result || ''));
    reader.readAsDataURL(file);
  };

  const saveProfile = async () => {
    setSaving(true);
    setStatus('');
    try {
      const response = await api.updateProfile({
        ...profile,
        fullName,
        phone,
        specialties: profile.specialties || [],
      });
      setProfile(getProfile(response.user));
      onUserChange(response.user);
      setStatus('Profile saved.');
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not save profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
      className="space-y-6"
    >
      <div>
        <h2 className="font-outfit font-bold text-[1.5rem] gradient-text">Account Profile</h2>
        <p className="font-inter text-sm text-[#475569] mt-1">
          Save real business or property information for your GCSC account.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="glass-card p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">Email verification</p>
          <p className={`mt-2 font-outfit font-bold ${user.email_verified ? 'text-[#059669]' : 'text-[#B45309]'}`}>
            {user.email_verified ? 'Verified' : 'Pending'}
          </p>
          <p className="mt-1 text-xs text-[#64748B]">Contractors verify by email before business trust workflows.</p>
        </div>
        <div className="glass-card p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">Phone verification</p>
          <p className={`mt-2 font-outfit font-bold ${user.phone_verified ? 'text-[#059669]' : 'text-[#B45309]'}`}>
            {user.phone_verified ? 'Verified' : 'Pending'}
          </p>
          <p className="mt-1 text-xs text-[#64748B]">Homeowners verify by SMS before sensitive owner and ClaimBridge workflows.</p>
        </div>
      </div>

      <div className="glass-card p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider gradient-text">Profile completeness</p>
            <h3 className="font-outfit font-bold text-[1.25rem] gradient-text mt-1">
              {completion.completed ? 'Profile ready for review' : 'Finish your account details'}
            </h3>
          </div>
          <div className="text-left md:text-right">
            <p className="font-outfit font-bold text-[2rem] gradient-text">{completion.percent}%</p>
            <p className="text-xs text-[#64748B]">Saved through backend profile storage</p>
          </div>
        </div>
        <div className="mt-4 h-2 rounded-full bg-[#E2E8F0] overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${completion.percent}%`,
              background: 'linear-gradient(135deg, #7B2FF7 0%, #3B6BF7 55%, #00D4FF 100%)',
            }}
          />
        </div>
        {!completion.completed && (
          <div className="mt-4">
            <p className="text-xs font-semibold text-[#7B2FF7] uppercase tracking-wider">Missing profile data</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {completion.missing.map((field) => (
                <span key={field} className="px-3 py-1 rounded-full bg-[rgba(123,47,247,0.08)] text-xs font-semibold text-[#7B2FF7]">
                  {profileFieldLabel(field)}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="glass-card p-6 text-center">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#7B2FF7] to-[#3B6BF7] flex items-center justify-center mx-auto mb-3 overflow-hidden">
            {profile.logoDataUrl ? (
              <img src={profile.logoDataUrl} alt="Account logo" className="w-full h-full object-cover" />
            ) : (
              <span className="font-outfit font-bold text-2xl text-white">{initials(user)}</span>
            )}
          </div>
          <h3 className="font-outfit font-bold gradient-text">{fullName || user.email}</h3>
          <p className="text-sm text-[#475569] mt-1">{user.email}</p>
          <div className="mt-3"><RoleBadge role={user.role} /></div>
          <label className="mt-5 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full border border-[#C4B5FD] text-sm font-semibold text-[#7B2FF7] cursor-pointer hover:bg-[rgba(123,47,247,0.06)] transition-colors">
            <Upload size={15} />
            Upload logo
            <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={onLogoChange} />
          </label>
          <p className="text-xs text-[#94A3B8] mt-3">PNG, JPG, WEBP or GIF under 750KB.</p>
        </div>

        <div className="lg:col-span-2 glass-card p-6 space-y-4">
          <h3 className="font-outfit font-semibold text-[1.0625rem] gradient-text mb-4">
            {isContractor ? 'Builder Business Details' : 'Owner Project Details'}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-[#7B2FF7] uppercase tracking-wider">Full name</span>
              <input className={fieldClass} value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-[#7B2FF7] uppercase tracking-wider">Phone</span>
              <input className={fieldClass} value={phone} onChange={(e) => setPhone(e.target.value)} />
            </label>
          </div>

          {isContractor ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="space-y-1.5">
                  <span className="text-xs font-semibold text-[#7B2FF7] uppercase tracking-wider">Company name</span>
                  <input className={fieldClass} value={profile.companyName || ''} onChange={(e) => updateProfile('companyName', e.target.value)} />
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-semibold text-[#7B2FF7] uppercase tracking-wider">EIN</span>
                  <input className={fieldClass} value={profile.ein || ''} onChange={(e) => updateProfile('ein', e.target.value)} placeholder="XX-XXXXXXX" />
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-semibold text-[#7B2FF7] uppercase tracking-wider">License number</span>
                  <input className={fieldClass} value={profile.licenseNumber || ''} onChange={(e) => updateProfile('licenseNumber', e.target.value)} />
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-semibold text-[#7B2FF7] uppercase tracking-wider">Years in business</span>
                  <input className={fieldClass} value={profile.yearsInBusiness || ''} onChange={(e) => updateProfile('yearsInBusiness', e.target.value)} />
                </label>
              </div>
              <label className="space-y-1.5 block">
                <span className="text-xs font-semibold text-[#7B2FF7] uppercase tracking-wider">Service area</span>
                <input className={fieldClass} value={profile.serviceArea || ''} onChange={(e) => updateProfile('serviceArea', e.target.value)} placeholder="City, county, or state" />
              </label>
              <label className="space-y-1.5 block">
                <span className="text-xs font-semibold text-[#7B2FF7] uppercase tracking-wider">Specialties</span>
                <input
                  className={fieldClass}
                  value={(profile.specialties || []).join(', ')}
                  onChange={(e) => updateProfile('specialties', e.target.value.split(',').map((item) => item.trim()).filter(Boolean))}
                  placeholder="Kitchen, roofing, plumbing"
                />
              </label>
            </>
          ) : (
            <>
              <label className="space-y-1.5 block">
                <span className="text-xs font-semibold text-[#7B2FF7] uppercase tracking-wider">Property address</span>
                <input className={fieldClass} value={profile.propertyAddress || ''} onChange={(e) => updateProfile('propertyAddress', e.target.value)} />
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="space-y-1.5">
                  <span className="text-xs font-semibold text-[#7B2FF7] uppercase tracking-wider">Property type</span>
                  <input className={fieldClass} value={profile.propertyType || ''} onChange={(e) => updateProfile('propertyType', e.target.value)} placeholder="House, condo, duplex" />
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-semibold text-[#7B2FF7] uppercase tracking-wider">Budget range</span>
                  <input className={fieldClass} value={profile.budgetRange || ''} onChange={(e) => updateProfile('budgetRange', e.target.value)} placeholder="$10k - $40k" />
                </label>
              </div>
              <label className="space-y-1.5 block">
                <span className="text-xs font-semibold text-[#7B2FF7] uppercase tracking-wider">Project needs</span>
                <textarea className={`${fieldClass} min-h-[110px] resize-y`} value={profile.projectNeeds || ''} onChange={(e) => updateProfile('projectNeeds', e.target.value)} />
              </label>
            </>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-[#7B2FF7] uppercase tracking-wider">City</span>
              <input className={fieldClass} value={profile.city || ''} onChange={(e) => updateProfile('city', e.target.value)} />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-[#7B2FF7] uppercase tracking-wider">State</span>
              <input className={fieldClass} value={profile.state || ''} onChange={(e) => updateProfile('state', e.target.value)} />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-[#7B2FF7] uppercase tracking-wider">ZIP</span>
              <input className={fieldClass} value={profile.zip || ''} onChange={(e) => updateProfile('zip', e.target.value)} />
            </label>
          </div>

          <label className="space-y-1.5 block">
            <span className="text-xs font-semibold text-[#7B2FF7] uppercase tracking-wider">Public bio / notes</span>
            <textarea className={`${fieldClass} min-h-[110px] resize-y`} value={profile.bio || ''} onChange={(e) => updateProfile('bio', e.target.value)} />
          </label>

          {status && <p className={`text-sm ${status.includes('saved') ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>{status}</p>}
          <button
            onClick={saveProfile}
            disabled={saving}
            className="mt-4 px-6 py-2.5 rounded-full text-white font-inter font-semibold text-sm transition-all hover:scale-[1.04]"
            style={{ background: 'linear-gradient(135deg, #7B2FF7 0%, #3B6BF7 100%)' }}
          >
            {saving ? <Loader2 size={16} className="inline animate-spin mr-2" /> : <Save size={16} className="inline mr-2" />}
            Save Profile
          </button>
        </div>
      </div>
    </motion.div>
  );
}

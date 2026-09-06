import { useState, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, CheckCircle2, Building2, Home, Loader2 } from 'lucide-react';
import { api, type GcscUser } from '../../services/api';
import { fieldClass } from './format';
import type { AccountRole } from './types';

export function AccountAccess({ onAuthenticated }: { onAuthenticated: (user: GcscUser) => void }) {
  const [mode, setMode] = useState<'register' | 'login'>('register');
  const [role, setRole] = useState<AccountRole>('contractor');
  const [form, setForm] = useState({ fullName: '', email: '', password: '', phone: '' });
  const [verificationPending, setVerificationPending] = useState<{
    email: string;
    phone: string;
    role: AccountRole;
    channel: 'email' | 'sms';
  } | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [status, setStatus] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const registrationChannel = role === 'homeowner' ? 'sms' : 'email';

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus('');
    setSubmitting(true);
    try {
      const response = mode === 'register'
        ? await api.register({ ...form, role, verificationMode: 'preferred' })
        : await api.login({ email: form.email, password: form.password });
      if (mode === 'register' && response.verification_required) {
        setVerificationPending({
          email: form.email,
          phone: form.phone,
          role,
          channel: response.verification_channel || registrationChannel,
        });
        setStatus(response.verification_channel === 'sms'
          ? 'SMS code sent. Enter it to activate your homeowner account.'
          : 'Email code sent. Enter it to activate your contractor account.');
        return;
      }
      api.setToken(response.token);
      if (mode === 'register') {
        sessionStorage.setItem('gcsc_registration_notice', JSON.stringify({
          email: form.email,
          phone: form.phone,
          createdAt: new Date().toISOString(),
        }));
      }
      onAuthenticated(response.user);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not complete account request');
    } finally {
      setSubmitting(false);
    }
  };

  const verifyCode = async (e: FormEvent) => {
    e.preventDefault();
    if (!verificationPending) return;
    setStatus('');
    setSubmitting(true);
    try {
      const response = await api.checkVerification({
        email: verificationPending.email,
        phone: verificationPending.phone,
        role: verificationPending.role,
        channel: verificationPending.channel,
        code: verificationCode,
      });
      api.setToken(response.token);
      sessionStorage.setItem('gcsc_registration_notice', JSON.stringify({
        email: verificationPending.email,
        phone: verificationPending.phone,
        createdAt: new Date().toISOString(),
      }));
      onAuthenticated(response.user);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not verify code');
    } finally {
      setSubmitting(false);
    }
  };

  const resendCode = async () => {
    setStatus('');
    setSubmitting(true);
    try {
      const response = await api.register({ ...form, role, verificationMode: 'preferred' });
      if (response.verification_required) {
        setVerificationPending({
          email: form.email,
          phone: form.phone,
          role,
          channel: response.verification_channel || registrationChannel,
        });
        setStatus('Verification code sent again.');
      } else {
        setStatus('Verification provider is not configured yet, so this account can open without a code.');
      }
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not send code again');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-white flex items-center justify-center container-padding py-16">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-[920px] grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-6"
      >
        <div className="glass-card p-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#7B2FF7] via-[#3B6BF7] to-[#00D4FF] flex items-center justify-center mb-5">
            <ShieldCheck size={30} className="text-white" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wider gradient-text mb-3">Real GCSC account</p>
          <h1 className="font-outfit font-bold text-[2.2rem] leading-tight gradient-text shimmer-text">
            Register your construction profile.
          </h1>
          <p className="font-inter text-sm text-[#475569] mt-4 leading-7">
            Create a real account for the dashboard. Builders can save business, EIN, license,
            logo, and service data. Owners can save project and property information before escrow.
          </p>
          <div className="mt-6 space-y-3 text-sm text-[#475569]">
            <div className="flex gap-2"><CheckCircle2 size={18} className="text-[#10B981] shrink-0" /> Profile is saved through the backend API.</div>
            <div className="flex gap-2"><CheckCircle2 size={18} className="text-[#10B981] shrink-0" /> WebAuth wallet can be linked after login.</div>
            <div className="flex gap-2"><CheckCircle2 size={18} className="text-[#10B981] shrink-0" /> No demo account is shown by default.</div>
          </div>
          <div className="mt-5 rounded-2xl border border-[#FDE68A] bg-[#FFFBEB] p-4 text-sm text-[#92400E] leading-6">
            Contractors verify by email and homeowners verify by SMS when the backend verification provider is configured.
            If verification is still pending provider setup, the dashboard keeps a clear account status notice after registration.
          </div>
        </div>

        <form onSubmit={verificationPending ? verifyCode : submit} className="glass-card p-8 space-y-5">
          <div className="flex rounded-full bg-[#F1F5F9] p-1">
            {(['register', 'login'] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setMode(item)}
                className="flex-1 py-2.5 rounded-full text-sm font-semibold transition-all"
                style={{
                  background: mode === item ? 'linear-gradient(135deg, #7B2FF7 0%, #3B6BF7 100%)' : 'transparent',
                  color: mode === item ? '#FFFFFF' : '#475569',
                }}
              >
                {item === 'register' ? 'Create account' : 'Sign in'}
              </button>
            ))}
          </div>

          {mode === 'register' && !verificationPending && (
            <div className="rounded-2xl border border-[#DBEAFE] bg-[#EFF6FF] p-4 text-sm text-[#1E40AF] leading-6">
              {role === 'homeowner'
                ? 'Homeowners verify by SMS with Twilio before sensitive owner and ClaimBridge flows.'
                : 'Contractors verify by email before business profile, document review, and bid trust workflows.'}
            </div>
          )}

          {verificationPending && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-[#C7D2FE] bg-[#EEF2FF] p-4 text-sm text-[#3730A3] leading-6">
                <p className="font-semibold text-[#312E81]">Verify your code</p>
                <p className="mt-1">
                  {verificationPending.channel === 'sms'
                    ? `Enter the SMS code sent to ${verificationPending.phone}.`
                    : `Enter the email code sent to ${verificationPending.email}.`}
                </p>
              </div>
              <input
                className={fieldClass}
                inputMode="numeric"
                placeholder="6-digit code"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required
              />
              <button
                type="button"
                onClick={resendCode}
                disabled={submitting}
                className="text-sm font-semibold text-[#7B2FF7] hover:text-[#3B6BF7] disabled:opacity-60"
              >
                Send code again
              </button>
            </div>
          )}

          {mode === 'register' && !verificationPending && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(['contractor', 'homeowner'] as const).map((item) => {
                const Icon = item === 'contractor' ? Building2 : Home;
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setRole(item)}
                    className="flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all"
                    style={{
                      borderColor: role === item ? '#7B2FF7' : '#E2E8F0',
                      background: role === item ? 'rgba(123,47,247,0.08)' : '#FFFFFF',
                    }}
                  >
                    <Icon size={20} className={role === item ? 'text-[#7B2FF7]' : 'text-[#64748B]'} />
                    <span>
                      <span className="block text-sm font-semibold text-[#0F172A]">{item === 'contractor' ? 'Builder' : 'Owner'}</span>
                      <span className="block text-xs text-[#64748B]">{item === 'contractor' ? 'Business profile' : 'Project profile'}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {mode === 'register' && !verificationPending && (
            <input
              className={fieldClass}
              placeholder="Full name"
              value={form.fullName}
              onChange={(e) => setForm((current) => ({ ...current, fullName: e.target.value }))}
              required
            />
          )}
          {!verificationPending && (
            <>
              <input
                className={fieldClass}
                type="email"
                placeholder="Email"
                value={form.email}
                onChange={(e) => setForm((current) => ({ ...current, email: e.target.value }))}
                required
              />
              <input
                className={fieldClass}
                type="password"
                placeholder="Password, minimum 8 characters"
                value={form.password}
                onChange={(e) => setForm((current) => ({ ...current, password: e.target.value }))}
                minLength={8}
                required
              />
            </>
          )}
          {mode === 'register' && !verificationPending && (
            <input
              className={fieldClass}
              placeholder="Phone"
              value={form.phone}
              onChange={(e) => setForm((current) => ({ ...current, phone: e.target.value }))}
              required={registrationChannel === 'sms'}
            />
          )}

          {status && <p className="text-sm text-[#EF4444]">{status}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-full text-white font-inter font-semibold text-sm transition-all disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #7B2FF7 0%, #3B6BF7 55%, #00D4FF 100%)' }}
          >
            {submitting && <Loader2 size={16} className="animate-spin" />}
            {verificationPending ? 'Verify and Open Dashboard' : mode === 'register' ? 'Create GCSC Account' : 'Open Dashboard'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

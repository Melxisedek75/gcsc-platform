import { lazy, Suspense, useEffect, useState } from 'react';
import { Link } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import { api, type GcscUser } from '../services/api';
import {
  LayoutDashboard,
  Calculator,
  ClipboardList,
  UserCircle,
  Wallet,
  Coins,
  Menu,
  X,
  ChevronRight,
  DollarSign,
  CheckCircle2,
  LogOut,
  Loader2,
  ShieldCheck,
  Activity,
} from 'lucide-react';
import { getProfile, initials } from './dashboard/format';
import type { Section } from './dashboard/types';
import { AccountAccess } from './dashboard/AccountAccess';

// Authenticated panels are code-split so each dashboard section loads on demand.
// This also keeps recharts (used only by the estimator) out of the main chunk.
const ProjectsPanel = lazy(() => import('./dashboard/ProjectsPanel').then((m) => ({ default: m.ProjectsPanel })));
const EstimatorPanel = lazy(() => import('./dashboard/EstimatorPanel').then((m) => ({ default: m.EstimatorPanel })));
const BidsPanel = lazy(() => import('./dashboard/BidsPanel').then((m) => ({ default: m.BidsPanel })));
const LoansFinancingPanel = lazy(() => import('./dashboard/LoansFinancingPanel').then((m) => ({ default: m.LoansFinancingPanel })));
const ProfilePanel = lazy(() => import('./dashboard/ProfilePanel').then((m) => ({ default: m.ProfilePanel })));
const CompliancePanel = lazy(() => import('./dashboard/CompliancePanel').then((m) => ({ default: m.CompliancePanel })));
const AdminDocumentReviewPanel = lazy(() => import('./dashboard/AdminDocumentReviewPanel').then((m) => ({ default: m.AdminDocumentReviewPanel })));
const AdminFinancingPrechecksPanel = lazy(() => import('./dashboard/AdminFinancingPrechecksPanel').then((m) => ({ default: m.AdminFinancingPrechecksPanel })));
const AdminAuditLogPanel = lazy(() => import('./dashboard/AdminAuditLogPanel').then((m) => ({ default: m.AdminAuditLogPanel })));
const WalletPanel = lazy(() => import('./dashboard/WalletPanel').then((m) => ({ default: m.WalletPanel })));
const TokenRedirect = lazy(() => import('./dashboard/TokenRedirect').then((m) => ({ default: m.TokenRedirect })));

const navItems: { key: Section; label: string; icon: typeof LayoutDashboard; adminOnly?: boolean }[] = [
  { key: 'projects', label: 'Projects', icon: LayoutDashboard },
  { key: 'estimator', label: 'Estimator', icon: Calculator },
  { key: 'bids', label: 'My Bids', icon: ClipboardList },
  { key: 'loans', label: 'Loans', icon: DollarSign },
  { key: 'profile', label: 'Profile', icon: UserCircle },
  { key: 'compliance', label: 'Compliance', icon: ShieldCheck },
  { key: 'admin-review', label: 'Admin Review', icon: ShieldCheck, adminOnly: true },
  { key: 'admin-financing', label: 'Financing Review', icon: Wallet, adminOnly: true },
  { key: 'admin-audit', label: 'Audit Log', icon: Activity, adminOnly: true },
  { key: 'wallet', label: 'Wallet', icon: Wallet },
];

export default function Dashboard() {
  const [activeSection, setActiveSection] = useState<Section>('projects');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<GcscUser | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [registrationNotice, setRegistrationNotice] = useState<{ email?: string; phone?: string } | null>(null);

  useEffect(() => {
    let mounted = true;
    const loadProfile = async () => {
      try {
        const response = await api.getProfile();
        if (mounted) setUser(response.user);
      } catch {
        api.clearToken();
      } finally {
        if (mounted) setLoadingUser(false);
      }
    };

    if (localStorage.getItem('gcsc_auth_token')) {
      loadProfile();
    } else {
      setLoadingUser(false);
    }

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    const rawNotice = sessionStorage.getItem('gcsc_registration_notice');
    if (!rawNotice) return;
    try {
      const notice = JSON.parse(rawNotice) as { email?: string; phone?: string };
      setRegistrationNotice(notice);
    } catch {
      setRegistrationNotice({});
    }
    sessionStorage.removeItem('gcsc_registration_notice');
  }, [user]);

  const logout = () => {
    api.logout();
    setUser(null);
    setActiveSection('projects');
  };

  const renderPanel = () => {
    if (!user) return null;

    switch (activeSection) {
      case 'projects':
        return <ProjectsPanel user={user} />;
      case 'estimator':
        return <EstimatorPanel />;
      case 'bids':
        return <BidsPanel user={user} />;
      case 'loans':
        return <LoansFinancingPanel user={user} />;
      case 'profile':
        return user ? <ProfilePanel user={user} onUserChange={setUser} /> : null;
      case 'compliance':
        return <CompliancePanel user={user} />;
      case 'admin-review':
        return user.role === 'admin' ? <AdminDocumentReviewPanel /> : <ProjectsPanel user={user} />;
      case 'admin-financing':
        return user.role === 'admin' ? <AdminFinancingPrechecksPanel /> : <ProjectsPanel user={user} />;
      case 'admin-audit':
        return user.role === 'admin' ? <AdminAuditLogPanel /> : <ProjectsPanel user={user} />;
      case 'wallet':
        return user ? <WalletPanel user={user} onUserChange={setUser} /> : null;
      case 'token':
        return <TokenRedirect />;
      default:
        return <ProjectsPanel user={user} />;
    }
  };

  if (loadingUser) {
    return (
      <div className="min-h-[100dvh] bg-white flex items-center justify-center">
        <div className="flex items-center gap-3 text-[#7B2FF7] font-inter font-semibold">
          <Loader2 size={22} className="animate-spin" />
          Loading dashboard...
        </div>
      </div>
    );
  }

  if (!user) {
    return <AccountAccess onAuthenticated={setUser} />;
  }

  const profile = getProfile(user);
  const visibleNavItems = navItems.filter((item) => !item.adminOnly || user.role === 'admin');

  return (
    <div className="min-h-[100dvh] bg-white flex">
      {/* Desktop Sidebar */}
      <aside
        className="hidden lg:flex flex-col w-[240px] shrink-0 border-r border-[#E2E8F0] bg-[#F8FAFC] fixed left-0 top-[72px] bottom-0 overflow-y-auto z-40"
      >
        <nav className="flex-1 px-3 py-6 space-y-1">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setActiveSection(item.key)}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200"
                style={{
                  backgroundColor: isActive ? 'rgba(123,47,247,0.08)' : 'transparent',
                  color: isActive ? '#7B2FF7' : '#475569',
                }}
              >
                <Icon size={18} />
                {item.label}
                {isActive && (
                  <motion.div
                    layoutId="sidebar-indicator"
                    className="ml-auto w-1 h-1 rounded-full"
                    style={{ backgroundColor: '#7B2FF7' }}
                  />
                )}
              </button>
            );
          })}

          {/* Divider */}
          <div className="my-3 border-t border-[#E2E8F0]" />

          {/* Token link */}
          <Link
            to="/token"
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-[#475569] hover:bg-[rgba(123,47,247,0.06)] hover:text-[#7B2FF7] transition-all duration-200"
          >
            <Coins size={18} />
            Token
            <ChevronRight size={14} className="ml-auto text-[#94A3B8]" />
          </Link>
        </nav>

        {/* Sidebar Footer */}
        <div className="px-4 py-4 border-t border-[#E2E8F0]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#7B2FF7] to-[#3B6BF7] flex items-center justify-center overflow-hidden">
              {profile.logoDataUrl ? (
                <img src={profile.logoDataUrl} alt="Account logo" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs font-bold text-white">{initials(user)}</span>
              )}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-[#0F172A] truncate">{user.fullName || user.full_name || user.email}</p>
              <p className="text-xs text-[#94A3B8] truncate">{user.role === 'contractor' ? 'Builder account' : 'Owner account'}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="mt-4 w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-[#64748B] hover:text-[#7B2FF7] hover:bg-[rgba(123,47,247,0.06)] transition-colors"
          >
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 bg-black/30 z-40"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.aside
              initial={{ x: -260 }}
              animate={{ x: 0 }}
              exit={{ x: -260 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
              className="lg:hidden fixed left-0 top-0 bottom-0 w-[260px] bg-[#F8FAFC] border-r border-[#E2E8F0] z-50 flex flex-col"
            >
              <div className="flex items-center justify-between px-4 py-4 border-b border-[#E2E8F0]">
                <span className="font-outfit font-bold text-[#0F172A]">Dashboard</span>
                <button onClick={() => setMobileMenuOpen(false)} className="p-1 text-[#475569]">
                  <X size={20} />
                </button>
              </div>
              <nav className="flex-1 px-3 py-4 space-y-1">
                {visibleNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeSection === item.key;
                  return (
                    <button
                      key={item.key}
                      onClick={() => {
                        setActiveSection(item.key);
                        setMobileMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-all duration-200"
                      style={{
                        backgroundColor: isActive ? 'rgba(123,47,247,0.08)' : 'transparent',
                        color: isActive ? '#7B2FF7' : '#475569',
                      }}
                    >
                      <Icon size={18} />
                      {item.label}
                    </button>
                  );
                })}
                <div className="my-3 border-t border-[#E2E8F0]" />
                <Link
                  to="/token"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium text-[#475569] hover:bg-[rgba(123,47,247,0.06)] hover:text-[#7B2FF7] transition-all duration-200"
                >
                  <Coins size={18} />
                  Token
                  <ChevronRight size={14} className="ml-auto text-[#94A3B8]" />
                </Link>
                <button
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium text-[#475569] hover:bg-[rgba(123,47,247,0.06)] hover:text-[#7B2FF7] transition-all duration-200"
                >
                  <LogOut size={18} />
                  Sign out
                </button>
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 lg:ml-[240px] min-w-0">
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-[#E2E8F0] bg-[#F8FAFC] sticky top-0 z-30">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 rounded-lg text-[#0F172A] hover:bg-[#E2E8F0] transition-colors"
          >
            <Menu size={20} />
          </button>
          <span className="font-outfit font-semibold text-[#0F172A]">
            {visibleNavItems.find((n) => n.key === activeSection)?.label || 'Dashboard'}
          </span>
        </div>

        <div className="container-padding py-8 max-w-[1200px]">
          {registrationNotice && (
            <div className="mb-6 rounded-2xl border border-[#BFDBFE] bg-[#EFF6FF] p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex gap-3">
                  <CheckCircle2 size={22} className="text-[#2563EB] shrink-0 mt-0.5" />
                  <div>
                    <p className="font-outfit font-bold text-[#0F172A]">GCSC account created</p>
                    <p className="text-sm text-[#475569] mt-1 leading-6">
                      Your dashboard account is active with email {registrationNotice.email || user.email}.
                      {registrationNotice.phone ? ' Your phone number was saved on the profile.' : ' No phone confirmation was sent.'}
                      {' '}Check the verification status panel before using sensitive owner, contractor, claim, or finance workflows.
                    </p>
                    <p className="text-xs text-[#64748B] mt-2">
                      Next step: complete Profile, upload contractor documents if needed, and connect WebAuth wallet.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setRegistrationNotice(null)}
                  className="self-start rounded-lg px-3 py-2 text-xs font-semibold text-[#2563EB] hover:bg-white transition-colors"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              <Suspense
                fallback={
                  <div className="flex items-center justify-center py-20 text-[#7B2FF7]">
                    <Loader2 size={22} className="animate-spin" />
                  </div>
                }
              >
                {renderPanel()}
              </Suspense>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Wallet, Coins, ShieldCheck, ClipboardList, AlertTriangle, CheckCircle2, Clock, ChevronRight } from 'lucide-react';
import { api, type GcscUser } from '../../services/api';
import { getProfile } from './format';
import { DetailBlock } from './shared';
import type { FinancingProduct } from './types';

const financingProducts: FinancingProduct[] = [
  {
    id: 'escrow-advance',
    productType: 'escrow_advance',
    title: 'Escrow-Backed Contractor Advance',
    bestFor: 'contractor',
    icon: Wallet,
    summary: 'If the homeowner has already funded escrow, a verified contractor can review a limited future advance for starting work or buying materials.',
    example: ['Educational example only:', 'Escrow balance: $50,000', 'Possible demo advance: up to $10,000'],
    rule: 'max advance = min(20% escrow balance, 50% next milestone, risk limit)',
    status: 'Demo/MVP gate only. No live funds are issued yet.',
    cta: 'Review Escrow Advance',
    whatThisIs: 'A readiness workflow for a contractor advance connected to an already funded construction escrow.',
    howItWorks: [
      'The homeowner funds escrow for a real project.',
      'The contractor requests a limited advance against that funded escrow reference.',
      'SmartContractor checks state availability, contractor verification, milestone context, and risk limits before any future review.',
    ],
    checks: ['Verified contractor profile', 'Funded escrow reference', 'Milestone amount', 'State eligibility', 'Admin/legal/provider review'],
    documents: ['Signed project contract', 'Escrow reference', 'Milestone schedule', 'Material or startup cost explanation'],
  },
  {
    id: 'token-credit',
    productType: 'token_credit',
    title: 'Token-Collateral Equipment Credit',
    bestFor: 'contractor',
    icon: Coins,
    summary: 'A contractor can review future equipment or material credit based on declared GCSC token collateral.',
    example: ['Educational example only:', 'Declared GCSC collateral: $10,000', 'Possible demo credit: up to 25% or risk limit'],
    rule: 'max credit = min(25% declared collateral, risk limit)',
    status: 'Demo/MVP gate only. No token lock, liquidation, or live lending yet.',
    cta: 'Review Token Credit',
    whatThisIs: 'A readiness workflow for future contractor credit that may use GCSC token collateral after legal and security review.',
    howItWorks: [
      'The contractor declares a collateral amount for review.',
      'The platform estimates a conservative demo credit limit.',
      'Any real token lock, repayment, or liquidation would require separate legal, provider, and audit approval.',
    ],
    checks: ['Verified contractor profile', 'Wallet readiness', 'Declared collateral amount', 'State eligibility', 'Admin/legal/provider review'],
    documents: ['Equipment or material plan', 'Business profile', 'Wallet/account reference', 'Risk review note'],
  },
  {
    id: 'claimbridge',
    productType: 'claimbridge',
    title: 'ClaimBridge Emergency Advance',
    bestFor: 'homeowner',
    icon: ShieldCheck,
    summary: 'A homeowner with insured property damage can review a future emergency advance workflow against an expected insurance claim payout.',
    example: ['Educational example only:', 'Estimated insurance payout: $50,000', 'Possible demo advance: up to 20% or risk limit'],
    rule: 'max advance = min(20% estimated insurance payout, risk limit)',
    status: 'Demo/MVP gate only. No assignment of benefits, insurer integration, or claim payout routing yet.',
    cta: 'Review ClaimBridge',
    whatThisIs: 'A readiness workflow for homeowners who may need fast support after fire, water, flood, storm, roof, smoke, or similar insured damage.',
    howItWorks: [
      'The homeowner records basic claim and incident information.',
      'The platform checks state availability and required review gates.',
      'No insurance proceeds are assigned or routed until a licensed legal/provider process exists.',
    ],
    checks: ['Homeowner identity', 'Property state', 'Insurance policy reference', 'Incident type', 'Admin/legal/provider review'],
    documents: ['Policy reference or hash', 'Incident photos or report', 'Claim number if available', 'Temporary relocation or urgent expense note'],
  },
  {
    id: 'working-capital',
    productType: 'working_capital',
    title: 'Contract-Backed Working Capital',
    bestFor: 'contractor',
    icon: ClipboardList,
    summary: 'A verified contractor with a signed construction contract can review future working capital for starting the job.',
    example: ['Educational example only:', 'Contract amount: $80,000', 'Possible demo advance: up to 20% or risk limit'],
    rule: 'max advance = min(20% contract amount, risk limit)',
    status: 'Demo/MVP gate only. No live loan issuance or repayment routing yet.',
    cta: 'Review Working Capital',
    whatThisIs: 'A readiness workflow for contractor working capital connected to a verified construction contract.',
    howItWorks: [
      'The contractor references a signed construction contract.',
      'The platform checks contract amount, state availability, verification, and risk limits.',
      'Any real loan issuance or repayment routing would require final approval outside this demo workflow.',
    ],
    checks: ['Verified contractor profile', 'Signed contract reference', 'Scope of work', 'State eligibility', 'Admin/legal/provider review'],
    documents: ['Signed construction contract', 'Scope of work', 'Startup budget', 'License and insurance documents'],
  },
];

export function LoansFinancingPanel({ user }: { user: GcscUser }) {
  const profile = getProfile(user);
  const selectedState = String(profile.state || '').trim().toUpperCase();
  const hasSavedProfile = Boolean(user.full_name || profile.companyName || profile.propertyAddress);
  const [precheckStatus, setPrecheckStatus] = useState('');
  const [savingPrecheck, setSavingPrecheck] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState(financingProducts[0].id);
  const role = user.role === 'contractor' ? 'contractor' : 'homeowner';
  const orderedProducts = useMemo(() => {
    return [...financingProducts].sort((a, b) => {
      const aScore = a.bestFor === role ? 0 : 1;
      const bScore = b.bestFor === role ? 0 : 1;
      return aScore - bScore;
    });
  }, [role]);
  const selectedProduct = financingProducts.find((product) => product.id === selectedProductId) || orderedProducts[0];
  const DetailIcon = selectedProduct.icon;
  const saveDemoPrecheck = async () => {
    setSavingPrecheck(true);
    setPrecheckStatus('');
    try {
      const response = await api.createFinancingPrecheck({
        productType: selectedProduct.productType,
        state: selectedState,
        safetyAcknowledged: true,
        context: {
          productTitle: selectedProduct.title,
          readinessOnly: true,
          noLiveLending: true,
        },
      });
      setPrecheckStatus(response.message || 'Demo/MVP financing precheck saved for admin review.');
    } catch (err) {
      setPrecheckStatus(err instanceof Error ? err.message : 'Could not save demo financing precheck.');
    } finally {
      setSavingPrecheck(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
      className="space-y-6"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#7B2FF7]">Loans / Financing</p>
          <h2 className="mt-2 font-outfit font-bold text-[1.75rem] gradient-text">SmartContractor Financing</h2>
          <p className="mt-2 max-w-[760px] text-sm leading-6 text-[#475569]">
            Explore future financing options connected to verified contracts, escrow, insurance claims, and GCSC token collateral.
          </p>
        </div>
        <div className="rounded-2xl border border-[#BFDBFE] bg-[#EFF6FF] px-4 py-3 text-sm text-[#1E3A8A]">
          {selectedState ? `Your selected state: ${selectedState}` : 'Add your property or business state to check future eligibility.'}
        </div>
      </div>

      <div className="rounded-2xl border border-[#FED7AA] bg-[#FFF7ED] p-5">
        <div className="flex gap-3">
          <AlertTriangle size={22} className="text-[#EA580C] shrink-0 mt-0.5" />
          <div>
            <p className="font-outfit font-bold text-[#9A3412]">Readiness workflow only</p>
            <p className="mt-1 text-sm leading-6 text-[#9A3412]">
              SmartContractor Financing helps contractors and homeowners understand future options that may connect to escrow, a signed contract, an insurance claim, or GCSC token collateral. These financial products are not live money products yet. Each workflow requires eligibility checks, documents, risk review, state rules, admin/legal/provider review, security review, and final approval.
            </p>
          </div>
        </div>
      </div>

      <div className="glass-card p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#7B2FF7]">Readiness checklist</p>
            <h3 className="mt-1 font-outfit font-bold text-[1.15rem] text-[#0F172A]">Before any future financing review</h3>
            <p className="mt-2 text-sm leading-6 text-[#475569]">
              This checklist helps you understand what SmartContractor would need before a real provider, legal, or admin review.
            </p>
          </div>
          <span className="rounded-full bg-[#FEF2F2] px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-[#991B1B]">
            Not live lending
          </span>
        </div>
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
          {[
            { label: 'Profile and role saved', complete: hasSavedProfile },
            { label: 'State selected', complete: Boolean(selectedState) },
            { label: 'Contract, escrow, claim, or collateral context added', complete: false },
            { label: 'Admin review required', complete: false },
            { label: 'Not live lending', complete: true },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
              <div className="flex items-center gap-2">
                {item.complete ? (
                  <CheckCircle2 size={17} className="text-[#10B981] shrink-0" />
                ) : (
                  <Clock size={17} className="text-[#F59E0B] shrink-0" />
                )}
                <p className="text-sm font-semibold text-[#0F172A]">{item.label}</p>
              </div>
              <p className="mt-2 text-xs leading-5 text-[#64748B]">
                {item.complete ? 'Ready for demo review.' : 'Needed before a future real-money workflow.'}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 min-[2200px]:grid-cols-[minmax(0,1fr)_420px] gap-6">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {orderedProducts.map((product) => {
            const Icon = product.icon;
            const isSelected = selectedProduct.id === product.id;
            return (
              <button
                key={product.id}
                type="button"
                onClick={() => setSelectedProductId(product.id)}
                className="glass-card min-w-0 p-5 text-left transition-all hover:-translate-y-0.5"
                style={{ borderColor: isSelected ? '#7B2FF7' : undefined, boxShadow: isSelected ? '0 20px 45px rgba(123,47,247,0.14)' : undefined }}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#7B2FF7] to-[#00D4FF] flex items-center justify-center shrink-0">
                    <Icon size={22} className="text-white" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-outfit font-bold text-[1.05rem] leading-snug text-[#0F172A]">{product.title}</h3>
                      <span className="rounded-full bg-[#F1F5F9] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#475569] sm:whitespace-nowrap">
                        Best for {product.bestFor === 'contractor' ? 'contractors' : 'homeowners'}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-[#475569]">{product.summary}</p>
                  </div>
                </div>
                <div className="mt-5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
                  {product.example.map((line) => (
                    <p key={line} className="text-xs leading-5 text-[#475569]">{line}</p>
                  ))}
                </div>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold text-[#64748B]">{product.status}</p>
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#7B2FF7]">
                    {product.cta}
                    <ChevronRight size={15} />
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <aside className="glass-card p-6 h-fit min-[2200px]:sticky min-[2200px]:top-[92px]">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#7B2FF7] to-[#00D4FF] flex items-center justify-center shrink-0">
              <DetailIcon size={24} className="text-white" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#7B2FF7]">Selected workflow</p>
              <h3 className="mt-1 font-outfit font-bold text-[1.25rem] text-[#0F172A]">{selectedProduct.title}</h3>
            </div>
          </div>

          <div className="mt-6 space-y-5">
            <DetailBlock title="What this is" lines={[selectedProduct.whatThisIs]} />
            <DetailBlock title="Who it is for" lines={[selectedProduct.bestFor === 'contractor' ? 'Best for verified contractors preparing for project startup, equipment, materials, or working capital needs.' : 'Best for homeowners who may need emergency support after insured property damage.']} />
            <DetailBlock title="How it works" lines={selectedProduct.howItWorks} />
            <DetailBlock title="What we check" lines={selectedProduct.checks} />
            <DetailBlock title="Documents needed" lines={selectedProduct.documents} />
            <DetailBlock
              title="State availability"
              lines={[
                'Availability and terms may depend on your state. SmartContractor uses state-aware compliance review before enabling any financial workflow.',
                selectedState ? `Your selected state: ${selectedState}` : 'Add your property or business state to check future eligibility.',
              ]}
            />
            <DetailBlock title="Current status" lines={[selectedProduct.status, selectedProduct.rule]} />
            <div className="rounded-2xl border border-[#BFDBFE] bg-[#EFF6FF] p-4">
              <p className="font-outfit font-bold text-[#1E3A8A]">Demo precheck</p>
              <p className="mt-2 text-sm leading-6 text-[#1E3A8A]">
                Save this selected workflow as a demo/MVP precheck for future admin review. This does not request live funds or create a credit approval.
              </p>
              <button
                type="button"
                onClick={saveDemoPrecheck}
                disabled={savingPrecheck}
                className="mt-4 inline-flex items-center justify-center rounded-full bg-[#7B2FF7] px-5 py-2.5 text-sm font-semibold text-white transition-all hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingPrecheck ? 'Saving...' : 'Save demo precheck'}
              </button>
              {precheckStatus && <p className="mt-3 text-sm leading-6 text-[#1E3A8A]">{precheckStatus}</p>}
            </div>
            <div className="rounded-2xl border border-[#FCA5A5] bg-[#FEF2F2] p-4">
              <p className="font-outfit font-bold text-[#991B1B]">Important safety notice</p>
              <p className="mt-2 text-sm leading-6 text-[#991B1B]">
                These financing workflows are in demo/MVP readiness. They do not represent a final loan offer, credit approval, insurance claim assignment, or live financial product. Real-money activation requires identity verification, contractor verification, state eligibility, legal/provider review, security review, and final approval.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </motion.div>
  );
}

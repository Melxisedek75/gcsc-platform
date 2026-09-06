import { useRef, useEffect, useState, lazy, Suspense } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import type { LucideIcon } from 'lucide-react'
import {
  Shield, Zap, Lock, Fingerprint, Home as HomeIcon, HardHat, Globe,
  ChevronDown, CheckCircle2
} from 'lucide-react'
import DecryptText from '../components/DecryptText'
import MagneticButton from '../components/MagneticButton'
import StarBorder from '../components/StarBorder'
import AuroraBackground from '../components/AuroraBackground'

gsap.registerPlugin(ScrollTrigger)

const ParticleNetwork = lazy(() => import('../components/ParticleNetwork'))

/* ─── icon helpers ─── */
const FeatureIcon = ({ icon: Icon }: { icon: LucideIcon }) => (
  <div className="w-14 h-14 rounded-full brand-gradient flex items-center justify-center mb-5 shrink-0">
    <Icon className="w-6 h-6 text-white" />
  </div>
)

/* ═════════════════════════════════════════════════════════════════
   Section 2 — Hero
   ═════════════════════════════════════════════════════════════════ */
function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline()
      tl.fromTo(
        '.hero-tagline',
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out', delay: 0.8 }
      )
      tl.fromTo(
        '.hero-headline',
        { opacity: 0, y: 60, rotateX: 35 },
        { opacity: 1, y: 0, rotateX: 0, duration: 0.8, ease: 'power3.out', stagger: 0.12 },
        '-=0.2'
      )
      tl.fromTo(
        '.hero-desc',
        { opacity: 0, y: 30 },
        { opacity: 0.8, y: 0, duration: 0.7, ease: 'power3.out' },
        '-=0.3'
      )
      tl.fromTo(
        '.hero-cta',
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out', stagger: 0.1 },
        '-=0.3'
      )
      tl.fromTo(
        '.hero-badge',
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out', stagger: 0.1 },
        '-=0.3'
      )
      tl.fromTo(
        '.hero-scroll',
        { opacity: 0 },
        { opacity: 1, duration: 0.5 },
        '-=0.2'
      )
    }, contentRef)

    return () => ctx.revert()
  }, [])

  const scrollToEscrow = () => {
    const el = document.getElementById('escrow-flow')
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section
      ref={sectionRef}
      className="relative min-h-[100dvh] flex items-center justify-center overflow-hidden"
    >
      <Suspense fallback={null}>
        <ParticleNetwork />
      </Suspense>

      <div
        className="absolute inset-0 z-[2] pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 40%, #02040A 100%)',
        }}
      />
      <div className="absolute inset-0 z-[2] pointer-events-none mesh-gradient-bg opacity-50" />

      <div
        ref={contentRef}
        className="relative z-[3] text-center px-6 max-w-[900px] mx-auto pt-20"
      >
        <div className="hero-tagline opacity-0">
          <DecryptText
            text="PROTECTED HOME IMPROVEMENT AGREEMENTS"
            className="inline-block text-xs font-mono font-medium tracking-[0.12em] text-muted-blue uppercase"
            delay={800}
          />
        </div>

        <h1 className="mt-6">
          <span className="hero-headline block font-display font-bold text-white leading-[0.95] tracking-[-0.04em] opacity-0"
            style={{ fontSize: 'clamp(56px, 8vw, 120px)' }}>
            Construction payments
          </span>
          <span className="hero-headline gradient-text shimmer-text block font-display font-bold leading-[0.95] tracking-[-0.04em] opacity-0"
            style={{ fontSize: 'clamp(56px, 8vw, 120px)' }}>
            protected by escrow.
          </span>
        </h1>

        <p className="hero-desc mt-6 text-soft-white/80 max-w-[640px] mx-auto opacity-0"
          style={{ fontSize: 'clamp(18px, 1.5vw, 22px)', lineHeight: 1.65 }}>
          GCSC Smart Contractor connects homeowners and contractors with milestone-based escrow, verified profiles, and clear payment workflows in our secure escrow system.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
          <div className="hero-cta opacity-0">
            <MagneticButton variant="primary" to="/dashboard">
              Open Dashboard
            </MagneticButton>
          </div>
          <div className="hero-cta opacity-0">
            <MagneticButton variant="secondary" onClick={scrollToEscrow}>
              Watch How It Works
            </MagneticButton>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 mt-10">
          <div className="hero-badge gradient-badge flex items-center gap-2 opacity-0">
            <Shield className="w-4 h-4" /> Milestone escrow
          </div>
          <div className="hero-badge gradient-badge flex items-center gap-2 opacity-0">
            <Fingerprint className="w-4 h-4" /> Verified profiles
          </div>
          <div className="hero-badge gradient-badge flex items-center gap-2 opacity-0">
            <Zap className="w-4 h-4" /> Zero transaction fees
          </div>
        </div>

        <div className="hero-scroll mt-16 opacity-0">
          <button onClick={scrollToEscrow} className="flex flex-col items-center gap-2 text-muted-blue hover:text-soft-white transition-colors">
            <span className="text-xs font-mono tracking-widest uppercase">Scroll</span>
            <ChevronDown className="w-6 h-6 animate-bounce-chevron" />
          </button>
        </div>
      </div>
    </section>
  )
}

/* ═════════════════════════════════════════════════════════════════
   Section 3 — Trust Ticker
   ═════════════════════════════════════════════════════════════════ */
function TrustTicker() {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!ref.current) return
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect() } },
      { threshold: 0.5 }
    )
    obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])

  const items = [
    { icon: <Lock className="w-5 h-5 text-electric-blue" />, title: 'AES-256 Encryption', sub: 'Bank-grade security' },
    { icon: <Zap className="w-5 h-5 text-electric-blue" />, title: 'Instant Settlement', sub: 'Instant processing' },
    { icon: <Shield className="w-5 h-5 text-electric-blue" />, title: 'Permanent Records', sub: 'System verified' },
    { icon: <CheckCircle2 className="w-5 h-5 text-electric-blue" />, title: 'Verified Contractors', sub: 'Verified identity' },
    { icon: <Zap className="w-5 h-5 text-electric-blue" />, title: '$0 Transaction Fees', sub: 'Zero transaction cost' },
  ]

  const doubled = [...items, ...items, ...items, ...items]

  return (
    <div
      ref={ref}
      className={`w-full h-20 bg-navy border-y border-[rgba(91,110,138,0.1)] overflow-hidden flex items-center transition-all duration-600 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
      }`}
    >
      <div className="flex animate-marquee whitespace-nowrap">
        {doubled.map((item, i) => (
          <div key={i} className="flex items-center gap-3 mx-6 shrink-0">
            {item.icon}
            <span className="text-sm font-semibold text-soft-white">{item.title}</span>
            <span className="text-xs text-muted-blue">{item.sub}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ═════════════════════════════════════════════════════════════════
   Section 4 — Feature Grid
   ═════════════════════════════════════════════════════════════════ */
function FeatureGrid() {
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.feat-label',
        { opacity: 0, y: 20 },
        {
          opacity: 1, y: 0, duration: 0.6, ease: 'power3.out',
          scrollTrigger: { trigger: sectionRef.current, start: 'top 80%' },
        }
      )
      gsap.fromTo(
        '.feat-headline',
        { opacity: 0, y: 40 },
        {
          opacity: 1, y: 0, duration: 0.8, ease: 'power3.out',
          scrollTrigger: { trigger: sectionRef.current, start: 'top 75%' },
        }
      )
      gsap.fromTo(
        '.feat-subtext',
        { opacity: 0, y: 30 },
        {
          opacity: 0.7, y: 0, duration: 0.7, ease: 'power3.out',
          scrollTrigger: { trigger: sectionRef.current, start: 'top 70%' },
        }
      )
      gsap.fromTo(
        '.feat-card',
        { opacity: 0, y: 50 },
        {
          opacity: 1, y: 0, duration: 0.7, ease: 'power3.out', stagger: 0.15,
          scrollTrigger: { trigger: sectionRef.current, start: 'top 65%' },
        }
      )
    }, sectionRef)
    return () => ctx.revert()
  }, [])

  const features = [
    {
      icon: Shield,
      title: 'Secure Escrow',
      desc: 'Escrow agreements hold funds securely until milestones are completed and approved by both parties. No intermediaries, no delays.',
    },
    {
      icon: Zap,
      title: 'Zero Transaction Fees',
      desc: 'Instant processing with zero transaction fees. Keep more of what you earn.',
    },
    {
      icon: Lock,
      title: 'AES-256 Encryption',
      desc: 'Sensitive platform data is protected with AES-256 encryption controls. Your project data stays private, always.',
    },
    {
      icon: Fingerprint,
      title: 'Verified Identity',
      desc: 'Verified identity ensures trust between homeowners and contractors. Every profile is verified.',
    },
  ]

  return (
    <section ref={sectionRef} className="py-[120px] px-6 md:px-12 mesh-gradient-bg opacity-50">
      <div className="max-w-[1280px] mx-auto">
        <div className="text-center mb-16">
          <div className="feat-label opacity-0">
            <span className="text-xs font-mono font-medium tracking-[0.12em] text-brand-blue uppercase">
              <DecryptText text="PLATFORM FEATURES" trigger="inView" />
            </span>
          </div>
          <h2 className="feat-headline mt-4 font-display font-bold text-white opacity-0"
            style={{ fontSize: 'clamp(40px, 5vw, 72px)', lineHeight: 1, letterSpacing: '-0.03em' }}>
            Secured by Trust.<br />
            Powered by <span className="brand-gradient-text">Trust.</span>
          </h2>
          <p className="feat-subtext mt-4 text-soft-white/70 max-w-[560px] mx-auto opacity-0"
            style={{ fontSize: 'clamp(18px, 1.5vw, 22px)' }}>
            Every transaction, identity, and payment is protected by our secure system.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f) => (
            <div key={f.title} className="feat-card opacity-0">
              <StarBorder>
                <div className="p-8 md:p-10 group transition-transform duration-300 hover:-translate-y-1.5">
                  <FeatureIcon icon={f.icon} />
                  <h3 className="font-display text-xl font-bold text-white mb-3">{f.title}</h3>
                  <p className="text-sm text-soft-white/70 leading-relaxed">{f.desc}</p>
                </div>
              </StarBorder>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ═════════════════════════════════════════════════════════════════
   Section 5 — How It Works
   ═════════════════════════════════════════════════════════════════ */
function HowItWorks() {
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.hiw-label, .hiw-headline, .hiw-subtext',
        { opacity: 0, y: 30 },
        {
          opacity: 1, y: 0, duration: 0.7, ease: 'power3.out', stagger: 0.1,
          scrollTrigger: { trigger: sectionRef.current, start: 'top 80%' },
        }
      )
      gsap.fromTo(
        '.hiw-step',
        { opacity: 0, x: 40 },
        {
          opacity: 1, x: 0, duration: 0.8, ease: 'power3.out', stagger: 0.2,
          scrollTrigger: { trigger: '.hiw-steps', start: 'top 70%' },
        }
      )
      gsap.fromTo(
        '.hiw-line',
        { scaleY: 0 },
        {
          scaleY: 1, duration: 0.6, ease: 'power3.out', stagger: 0.2,
          transformOrigin: 'top',
          scrollTrigger: { trigger: '.hiw-steps', start: 'top 60%' },
        }
      )
    }, sectionRef)
    return () => ctx.revert()
  }, [])

  const steps = [
    {
      num: '01',
      title: 'Post Your Project',
      desc: 'Describe your construction project in minutes. Set your budget, timeline, and requirements. Our system matches you with qualified, verified contractors instantly.',
    },
    {
      num: '02',
      title: 'Receive Competitive Bids',
      desc: 'Multiple vetted contractors bid on your project. Compare portfolios, read verified reviews, and communicate directly through the platform before making your choice.',
    },
    {
      num: '03',
      title: 'Escrow Protection & Release',
      desc: 'Funds are held in secure escrow. Payments release automatically when milestones are completed and approved — no disputes, no delays, no risk.',
    },
  ]

  return (
    <section ref={sectionRef} className="py-[160px] px-6 md:px-12 bg-navy border-t border-[rgba(91,110,138,0.06)]">
      <div className="max-w-[1280px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16">
        <div className="lg:sticky lg:top-[120px] lg:self-start">
          <span className="hiw-label block text-xs font-mono font-medium tracking-[0.12em] text-brand-blue uppercase opacity-0">
            <DecryptText text="HOW IT WORKS" trigger="inView" />
          </span>
          <h2 className="hiw-headline mt-4 font-display font-bold text-white opacity-0"
            style={{ fontSize: 'clamp(40px, 5vw, 72px)', lineHeight: 1, letterSpacing: '-0.03em' }}>
            Three Steps to Secure Payments
          </h2>
          <p className="hiw-subtext mt-4 text-soft-white/70 opacity-0"
            style={{ fontSize: 'clamp(18px, 1.5vw, 22px)' }}>
            From project posting to final payment release — every step protected by our secure system.
          </p>
        </div>

        <div className="hiw-steps relative space-y-0">
          {steps.map((step, i) => (
            <div key={step.num} className="relative">
              {i > 0 && (
                <div className="hiw-line absolute left-[39px] top-[-32px] w-[2px] h-[32px] bg-brand-blue/30" />
              )}
              <div className="hiw-step bg-navy border border-[rgba(91,110,138,0.12)] rounded-3xl p-10 md:p-12 mb-8 opacity-0 hover:border-brand-blue/30 transition-colors duration-300">
                <span className="block font-display text-[80px] font-bold brand-gradient-text leading-none mb-4">
                  {step.num}
                </span>
                <h3 className="font-display text-2xl md:text-3xl font-bold text-white mb-3">
                  {step.title}
                </h3>
                <p className="text-soft-white/70 leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ═════════════════════════════════════════════════════════════════
   Section 6 — Escrow Flow Demo (Pinned Scroll)
   ═════════════════════════════════════════════════════════════════ */
function EscrowFlowDemo() {
  const sectionRef = useRef<HTMLElement>(null)
  const pinRef = useRef<HTMLDivElement>(null)
  const [phase, setPhase] = useState(0)

  const phases = [
    { num: '01', title: 'Deposit', desc: 'Homeowner deposits funds into secure escrow. Funds are immediately locked and encrypted with AES-256. Both parties receive an escrow agreement receipt.' },
    { num: '02', title: 'Work in Progress', desc: 'Contractor completes the construction work. Milestone tracking keeps both parties aligned on progress. Photo evidence and status updates are logged in our system.' },
    { num: '03', title: 'Milestone Approval', desc: 'Homeowner reviews completed work and approves the milestone. Both parties confirm approval in the system. The escrow agreement validates the signatures.' },
    { num: '04', title: 'Payment Release', desc: 'Payment is automatically released to the contractor. The transaction is securely recorded in our system. A permanent receipt is generated for both parties.' },
  ]

  useEffect(() => {
    if (!sectionRef.current || !pinRef.current) return

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: sectionRef.current,
        start: 'top top',
        end: '+=300%',
        pin: pinRef.current,
        scrub: 0.5,
        onUpdate: (self) => {
          const p = Math.min(3, Math.floor(self.progress * 4))
          setPhase(p)
        },
      })

      gsap.fromTo(
        '.ef-node',
        { opacity: 0, scale: 0.5 },
        {
          opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(1.4)', stagger: 0.1,
          scrollTrigger: { trigger: sectionRef.current, start: 'top 90%' },
        }
      )
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  return (
    <section ref={sectionRef} id="escrow-flow" className="relative bg-deep-navy min-h-[300vh]">
      <div
        ref={pinRef}
        className="relative min-h-[100dvh] flex flex-col items-center justify-center overflow-hidden"
      >
        <div
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: 'url(/escrow-flow-bg.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: 0.15,
          }}
        />
        <div className="absolute inset-0 z-[1] pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at center, transparent 30%, #070B14 100%)' }}
        />

        <div className="relative z-[2] w-full max-w-[1100px] mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 md:gap-4">
            {/* Homeowner Node */}
            <div className="ef-node flex flex-col items-center opacity-0">
              <div className="w-[120px] h-[120px] rounded-full border-2 flex items-center justify-center"
                style={{ borderImage: 'linear-gradient(135deg, #0072F5, #7C3AED) 1', borderStyle: 'solid' }}>
                <div className="w-full h-full rounded-full brand-gradient flex items-center justify-center">
                  <HomeIcon className="w-10 h-10 text-white" />
                </div>
              </div>
              <span className="mt-3 text-base font-semibold text-soft-white">Homeowner</span>
              <span className="text-sm text-muted-blue">Deposits Funds</span>
            </div>

            {/* Path 1 */}
            <svg className="hidden md:block w-[200px] h-[4px]" viewBox="0 0 200 4">
              <line x1="0" y1="2" x2="200" y2="2" stroke="#0072F5" strokeWidth="3" strokeLinecap="round"
                strokeDasharray="200" strokeDashoffset={phase >= 1 ? 0 : 200}
                className="transition-all duration-700" />
              {phase >= 1 && (
                <circle cx="180" cy="2" r="4" fill="#00C6FF" className="animate-pulse" />
              )}
            </svg>

            {/* Escrow Hub */}
            <div className="ef-node flex flex-col items-center opacity-0">
              <div className="relative w-[160px] h-[160px]">
                <div className="absolute inset-0 rounded-full border-2 border-dashed border-brand-blue/40 animate-spin-slower" />
                <div className="absolute inset-2 rounded-full brand-gradient flex items-center justify-center">
                  <div className="text-center">
                    <span className="block font-display text-2xl font-bold text-white">GCSC</span>
                    <span className="block text-[10px] font-mono tracking-[0.12em] text-white/80 uppercase">ESCROW</span>
                  </div>
                </div>
              </div>
              <span className="mt-3 text-sm text-cyan font-medium">Funds Locked</span>
            </div>

            {/* Path 2 */}
            <svg className="hidden md:block w-[200px] h-[4px]" viewBox="0 0 200 4">
              <line x1="0" y1="2" x2="200" y2="2" stroke="#0072F5" strokeWidth="3" strokeLinecap="round"
                strokeDasharray="200" strokeDashoffset={phase >= 3 ? 0 : 200}
                className="transition-all duration-700" />
              {phase >= 3 && (
                <circle cx="180" cy="2" r="4" fill="#00C6FF" className="animate-pulse" />
              )}
            </svg>

            {/* Contractor Node */}
            <div className="ef-node flex flex-col items-center opacity-0">
              <div className="w-[120px] h-[120px] rounded-full border-2 flex items-center justify-center"
                style={{ borderImage: 'linear-gradient(135deg, #0072F5, #7C3AED) 1', borderStyle: 'solid' }}>
                <div className="w-full h-full rounded-full bg-navy flex items-center justify-center">
                  <HardHat className="w-10 h-10 text-white" />
                </div>
              </div>
              <span className="mt-3 text-base font-semibold text-soft-white">Contractor</span>
              <span className="text-sm text-muted-blue">Gets Paid</span>
            </div>
          </div>

          {/* Phase Content */}
          <div className="mt-16 text-center">
            <div className="flex items-center justify-center gap-4 mb-4">
              <span className="font-display text-[clamp(80px,10vw,120px)] font-bold brand-gradient-text leading-none">
                {phases[phase].num}
              </span>
              <div className="text-left">
                <h3 className="font-display text-2xl md:text-3xl font-bold text-white">
                  {phases[phase].title}
                </h3>
              </div>
            </div>
            <p className="text-soft-white/70 max-w-[560px] mx-auto text-base leading-relaxed">
              {phases[phase].desc}
            </p>

            {/* Progress bar */}
            <div className="mt-8 w-full max-w-[400px] mx-auto h-1 bg-[rgba(91,110,138,0.15)] rounded-full overflow-hidden">
              <div
                className="h-full brand-gradient rounded-full transition-all duration-500"
                style={{ width: `${((phase + 1) / 4) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ═════════════════════════════════════════════════════════════════
   Section 7 — Platform Features (3 Columns)
   ═════════════════════════════════════════════════════════════════ */
function PlatformFeatures() {
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('.pf-label, .pf-headline', { opacity: 0, y: 30 }, {
        opacity: 1, y: 0, duration: 0.7, ease: 'power3.out', stagger: 0.1,
        scrollTrigger: { trigger: sectionRef.current, start: 'top 80%' },
      })
      gsap.fromTo('.pf-col', { opacity: 0, y: 60 }, {
        opacity: 1, y: 0, duration: 0.8, ease: 'power3.out', stagger: 0.15,
        scrollTrigger: { trigger: '.pf-grid', start: 'top 70%' },
      })
      gsap.fromTo('.pf-item', { opacity: 0, y: 15 }, {
        opacity: 1, y: 0, duration: 0.5, ease: 'power3.out', stagger: 0.06,
        scrollTrigger: { trigger: '.pf-grid', start: 'top 55%' },
      })
    }, sectionRef)
    return () => ctx.revert()
  }, [])

  const columns = [
    {
      icon: HomeIcon,
      title: 'For Homeowners',
      items: [
        'Post a project with requirements',
        'Compare contractor bids side-by-side',
        'Fund milestone escrow securely',
        'Release payments only after approval',
        'Dispute resolution in our system',
      ],
    },
    {
      icon: HardHat,
      title: 'For Contractors',
      items: [
        'Bid on verified, funded projects',
        'Submit milestone evidence',
        'Receive automatic payment release',
        'Build verified reputation',
        'Zero platform fees',
      ],
    },
    {
      icon: Globe,
      title: 'For Everyone',
      items: [
        'GCSC Network settlement',
        'Verified identity',
        'Clear milestone records',
        'Permanent transaction history',
        '24/7 escrow agreement access',
      ],
    },
  ]

  return (
    <section ref={sectionRef} className="py-[120px] px-6 md:px-12 bg-void">
      <div className="max-w-[1280px] mx-auto">
        <div className="text-center mb-16">
          <span className="pf-label block text-xs font-mono font-medium tracking-[0.12em] text-brand-blue uppercase opacity-0">
            <DecryptText text="BUILT FOR EVERYONE" trigger="inView" />
          </span>
          <h2 className="pf-headline mt-4 font-display font-bold text-white opacity-0"
            style={{ fontSize: 'clamp(40px, 5vw, 72px)', lineHeight: 1, letterSpacing: '-0.03em' }}>
            One Platform. <span className="brand-gradient-text">All Players.</span>
          </h2>
        </div>

        <div className="pf-grid grid grid-cols-1 md:grid-cols-3 gap-8">
          {columns.map((col) => (
            <div
              key={col.title}
              className="pf-col bg-deep-navy border border-[rgba(91,110,138,0.1)] rounded-3xl p-10 md:p-12 opacity-0 hover:border-[rgba(0,114,245,0.25)] hover:-translate-y-1 hover:shadow-[0_20px_60px_rgba(0,114,245,0.08)] transition-all duration-300"
            >
              <FeatureIcon icon={col.icon} />
              <h3 className="font-display text-2xl font-bold text-white mb-6">{col.title}</h3>
              <ul className="space-y-4">
                {col.items.map((item) => (
                  <li key={item} className="pf-item flex items-start gap-3 opacity-0">
                    <CheckCircle2 className="w-4 h-4 text-cyan mt-0.5 shrink-0" />
                    <span className="text-sm text-soft-white/75">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ═════════════════════════════════════════════════════════════════
   Section 8 — FAQ (shadcn Accordion)
   ═════════════════════════════════════════════════════════════════ */
function FAQ() {
  const sectionRef = useRef<HTMLElement>(null)
  const [openIdx, setOpenIdx] = useState<number | null>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('.faq-label, .faq-headline, .faq-subtext', { opacity: 0, y: 30 }, {
        opacity: 1, y: 0, duration: 0.7, ease: 'power3.out', stagger: 0.1,
        scrollTrigger: { trigger: sectionRef.current, start: 'top 80%' },
      })
      gsap.fromTo('.faq-item', { opacity: 0, y: 20 }, {
        opacity: 1, y: 0, duration: 0.5, ease: 'power3.out', stagger: 0.08,
        scrollTrigger: { trigger: '.faq-list', start: 'top 70%' },
      })
    }, sectionRef)
    return () => ctx.revert()
  }, [])

  const faqs = [
    { q: 'What is GCSC?', a: 'GCSC is a trust-powered construction escrow platform built on our secure network. It connects homeowners and contractors with milestone-based escrow, verified profiles, and transparent payment workflows protected by escrow agreements.' },
    { q: 'How does the escrow process work?', a: 'The homeowner deposits funds into an escrow agreement in our secure escrow system. The contractor completes work milestones, and payments are automatically released upon homeowner approval. Every step is securely recorded in our system.' },
    { q: 'Is GCSC free to use?', a: 'Yes, GCSC is free to join and post projects. We charge a small service fee only when escrow payments are released, and there are zero transaction fees thanks to GCSC Network.' },
    { q: 'What network does GCSC use?', a: 'GCSC is built on our secure network, a high-performance system offering zero transaction fees, instant settlement, and enterprise-grade security.' },
    { q: 'How are contractors verified?', a: 'All contractors go through a multi-step verification process including identity verification via verified identity, license validation, portfolio review, and background checks.' },
    { q: "What happens if there's a dispute?", a: 'GCSC includes an in-system dispute resolution mechanism. Both parties submit evidence, and a verified arbitration process reviews the case. The escrow agreement enforces the final decision automatically.' },
    { q: 'Can I use GCSC for any type of construction project?', a: 'GCSC supports residential, commercial, and renovation projects of all sizes. Whether you\'re remodeling a kitchen or building a commercial complex, milestone-based escrow protects every payment.' },
  ]

  const toggle = (i: number) => setOpenIdx(openIdx === i ? null : i)

  return (
    <section ref={sectionRef} className="py-[120px] px-6 md:px-12 bg-navy">
      <div className="max-w-[800px] mx-auto">
        <div className="text-center mb-12">
          <span className="faq-label block text-xs font-mono font-medium tracking-[0.12em] text-brand-blue uppercase opacity-0">
            <DecryptText text="FAQ" trigger="inView" />
          </span>
          <h2 className="faq-headline mt-4 font-display font-bold text-white opacity-0"
            style={{ fontSize: 'clamp(40px, 5vw, 72px)', lineHeight: 1, letterSpacing: '-0.03em' }}>
            Frequently Asked Questions
          </h2>
          <p className="faq-subtext mt-4 text-soft-white/70 opacity-0"
            style={{ fontSize: 'clamp(18px, 1.5vw, 22px)' }}>
            Everything you need to know about GCSC and secure construction escrow.
          </p>
        </div>

        <div className="faq-list space-y-3">
          {faqs.map((faq, i) => {
            const isOpen = openIdx === i
            return (
              <div
                key={i}
                className={`faq-item bg-deep-navy rounded-2xl border transition-all duration-300 opacity-0 ${
                  isOpen ? 'border-[rgba(0,114,245,0.2)] bg-[rgba(0,114,245,0.03)]' : 'border-[rgba(91,110,138,0.1)]'
                }`}
              >
                <button
                  onClick={() => toggle(i)}
                  className="w-full flex items-center justify-between px-6 py-5 md:px-7 text-left"
                >
                  <span className="text-base font-semibold text-soft-white pr-4">{faq.q}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-muted-blue shrink-0 transition-transform duration-300 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                <div
                  className="overflow-hidden transition-all duration-400"
                  style={{
                    maxHeight: isOpen ? '300px' : '0',
                    opacity: isOpen ? 1 : 0,
                  }}
                >
                  <div className="px-6 md:px-7 pb-5">
                    <p className="text-sm text-soft-white/70 leading-relaxed">{faq.a}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/* ═════════════════════════════════════════════════════════════════
   Section 9 — CTA (Aurora)
   ═════════════════════════════════════════════════════════════════ */
function CTASection() {
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('.cta-aurora', { opacity: 0 }, {
        opacity: 1, duration: 1.2,
        scrollTrigger: { trigger: sectionRef.current, start: 'top 75%' },
      })
      gsap.fromTo('.cta-headline', { opacity: 0, y: 40 }, {
        opacity: 1, y: 0, duration: 0.8, ease: 'power3.out',
        scrollTrigger: { trigger: sectionRef.current, start: 'top 70%' },
      })
      gsap.fromTo('.cta-subtext', { opacity: 0, y: 30 }, {
        opacity: 1, y: 0, duration: 0.7, ease: 'power3.out',
        scrollTrigger: { trigger: sectionRef.current, start: 'top 60%' },
      })
      gsap.fromTo('.cta-btn', { opacity: 0, y: 20, scale: 0.9 }, {
        opacity: 1, y: 0, scale: 1, duration: 0.6, ease: 'power3.out', stagger: 0.15,
        scrollTrigger: { trigger: sectionRef.current, start: 'top 55%' },
      })
      gsap.fromTo('.cta-trust', { opacity: 0, y: 15 }, {
        opacity: 1, y: 0, duration: 0.6, ease: 'power3.out',
        scrollTrigger: { trigger: sectionRef.current, start: 'top 50%' },
      })
    }, sectionRef)
    return () => ctx.revert()
  }, [])

  return (
    <section ref={sectionRef} className="relative py-[160px] px-6 overflow-hidden">
      <div className="cta-aurora opacity-0">
        <AuroraBackground />
      </div>
      <div
        className="absolute inset-0 z-[1]"
        style={{
          backgroundImage: 'url(/aurora-cta-bg.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.3,
        }}
      />
      <div
        className="absolute inset-0 z-[2] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at center, transparent 30%, #02040A 100%)' }}
      />

      <div className="relative z-[3] max-w-[800px] mx-auto text-center">
        <h2 className="cta-headline font-display font-bold text-white opacity-0"
          style={{ fontSize: 'clamp(40px, 5vw, 72px)', lineHeight: 1, letterSpacing: '-0.03em' }}>
          Ready to Build with Confidence?
        </h2>
        <p className="cta-subtext mt-6 text-soft-white/75 max-w-[600px] mx-auto opacity-0"
          style={{ fontSize: 'clamp(18px, 1.5vw, 22px)' }}>
          Join thousands of homeowners and contractors already using GCSC to protect construction payments with secure escrow.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
          <div className="cta-btn opacity-0">
            <MagneticButton variant="primary" size="large" to="/dashboard">
              Get Started for Free
            </MagneticButton>
          </div>
          <div className="cta-btn opacity-0">
            <MagneticButton variant="secondary" size="large" to="/pricing">
              View Pricing
            </MagneticButton>
          </div>
        </div>
        <p className="cta-trust mt-8 text-sm text-muted-blue opacity-0">
          ✦ Free to join &middot; No credit card required &middot; Instant setup
        </p>
      </div>
    </section>
  )
}

/* ═════════════════════════════════════════════════════════════════
   Scroll Progress Bar
   ═════════════════════════════════════════════════════════════════ */
function ScrollProgress() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const onScroll = () => {
      const scrollTop = window.scrollY
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      setProgress(docHeight > 0 ? scrollTop / docHeight : 0)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] h-[2px] bg-transparent">
      <div
        className="h-full brand-gradient"
        style={{ width: `${progress * 100}%`, transition: 'width 0.1s linear' }}
      />
    </div>
  )
}

/* ═════════════════════════════════════════════════════════════════
   Home Page — All Sections
   ═════════════════════════════════════════════════════════════════ */
export default function Home() {
  return (
    <>
      <ScrollProgress />
      <HeroSection />
      <TrustTicker />
      <FeatureGrid />
      <HowItWorks />
      <EscrowFlowDemo />
      <PlatformFeatures />
      <FAQ />
      <CTASection />
    </>
  )
}

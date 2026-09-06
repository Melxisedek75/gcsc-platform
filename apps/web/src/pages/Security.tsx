import { useRef, useEffect } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Shield, Zap, Lock, Fingerprint, CheckCircle, ArrowRight } from 'lucide-react'
import StarBorder from '@/components/StarBorder'
import MagneticButton from '@/components/MagneticButton'
import DecryptText from '@/components/DecryptText'

gsap.registerPlugin(ScrollTrigger)

const SECURITY_FEATURES = [
  {
    icon: Shield,
    title: 'Secure Escrow',
    description: 'Escrow agreements hold funds securely until milestones are completed. No single point of failure — funds are locked in our system until all parties agree.',
  },
  {
    icon: Zap,
    title: 'Zero Transaction Fees',
    description: 'Powered by GCSC Network with zero transaction fees and 3-second processing. Fast, frictionless transactions without the cost overhead of traditional payment systems.',
  },
  {
    icon: Lock,
    title: 'AES-256 Encryption',
    description: 'Sensitive data is protected with strong AES-256 encryption, applied in transit and designed to protect information at rest using a widely adopted industry standard.',
  },
  {
    icon: Fingerprint,
    title: 'Verified Identity',
    description: 'Verified identity ensures trust. Every user is thoroughly verified, eliminating impersonation and ensuring accountability.',
  },
]

const COMPLIANCE_BADGES = [
  { name: 'SOC 2', description: 'Type II (Target)', icon: '🔒' },
  { name: 'ISO 27001', description: 'Information Security (Target)', icon: '🛡️' },
  { name: 'GDPR', description: 'Data Protection (Planned)', icon: '🇪🇺' },
]

const AUDIT_TIMELINE = [
  {
    date: 'Planned',
    title: 'Escrow Agreement Audit',
    org: 'Independent auditor (TBD)',
    status: 'Planned',
  },
  {
    date: 'Planned',
    title: 'Penetration Testing',
    org: 'Independent auditor (TBD)',
    status: 'Planned',
  },
  {
    date: 'Planned',
    title: 'Formal Verification',
    org: 'Independent auditor (TBD)',
    status: 'Planned',
  },
  {
    date: 'Planned',
    title: 'Bug Bounty Program',
    org: 'Independent auditor (TBD)',
    status: 'Scheduled',
  },
]

export default function Security() {
  const pageRef = useRef<HTMLDivElement>(null)
  const heroRef = useRef<HTMLDivElement>(null)
  const featuresRef = useRef<HTMLDivElement>(null)
  const complianceRef = useRef<HTMLDivElement>(null)
  const processRef = useRef<HTMLDivElement>(null)
  const auditRef = useRef<HTMLDivElement>(null)
  const ctaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Hero entrance
      gsap.fromTo(
        heroRef.current?.querySelectorAll('.hero-animate') || [],
        { opacity: 0, y: 40 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          stagger: 0.15,
          ease: 'power3.out',
          delay: 0.3,
        }
      )

      // Feature cards
      gsap.fromTo(
        featuresRef.current?.querySelectorAll('.feature-card') || [],
        { opacity: 0, y: 50 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          stagger: 0.1,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: featuresRef.current,
            start: 'top 80%',
          },
        }
      )

      // Compliance badges
      gsap.fromTo(
        complianceRef.current?.querySelectorAll('.compliance-badge') || [],
        { opacity: 0, scale: 0.8 },
        {
          opacity: 1,
          scale: 1,
          duration: 0.5,
          stagger: 0.1,
          ease: 'back.out(1.5)',
          scrollTrigger: {
            trigger: complianceRef.current,
            start: 'top 80%',
          },
        }
      )

      // Process steps
      gsap.fromTo(
        processRef.current?.querySelectorAll('.process-step') || [],
        { opacity: 0, x: -30 },
        {
          opacity: 1,
          x: 0,
          duration: 0.7,
          stagger: 0.15,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: processRef.current,
            start: 'top 75%',
          },
        }
      )

      // Process arrows
      gsap.fromTo(
        processRef.current?.querySelectorAll('.process-arrow') || [],
        { opacity: 0, scaleX: 0 },
        {
          opacity: 1,
          scaleX: 1,
          duration: 0.5,
          stagger: 0.15,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: processRef.current,
            start: 'top 70%',
          },
        }
      )

      // Audit timeline
      gsap.fromTo(
        auditRef.current?.querySelectorAll('.audit-item') || [],
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          duration: 0.7,
          stagger: 0.12,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: auditRef.current,
            start: 'top 80%',
          },
        }
      )

      // CTA section
      gsap.fromTo(
        ctaRef.current?.querySelectorAll('.cta-animate') || [],
        { opacity: 0, y: 40 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          stagger: 0.12,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: ctaRef.current,
            start: 'top 80%',
          },
        }
      )
    }, pageRef)

    return () => ctx.revert()
  }, [])

  return (
    <div ref={pageRef} className="min-h-[100dvh] bg-void">
      {/* Hero Section */}
      <section
        ref={heroRef}
        className="relative pt-[72px] overflow-hidden"
        style={{
          background:
            'radial-gradient(ellipse at 20% 30%, rgba(0,114,245,0.12) 0%, transparent 60%), radial-gradient(ellipse at 80% 70%, rgba(124,58,237,0.08) 0%, transparent 60%)',
        }}
      >
        <div
          className="absolute inset-0 z-0 pointer-events-none"
          style={{
            backgroundImage: 'url(/bg_security.webp)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: 0.14,
          }}
        />
        <div className="relative z-10 max-w-[1280px] mx-auto px-6 md:px-12 py-[120px] md:py-[160px] text-center">
          <div className="hero-animate inline-block mb-6">
            <span className="gradient-badge">
              <DecryptText text="SECURITY-FIRST ARCHITECTURE" delay={200} />
            </span>
          </div>
          <h1 className="hero-animate font-display font-bold leading-[0.95] tracking-[-0.04em] text-[clamp(48px,7vw,100px)] mb-6">
            <span className="brand-gradient-text">Bank-Grade</span>
            <br />
            <span className="text-soft-white">Security</span>
          </h1>
          <p className="hero-animate text-muted-blue text-[clamp(16px,1.4vw,20px)] leading-relaxed max-w-[640px] mx-auto mb-10">
            Your construction funds are protected by the same encryption standards
            used by the world's largest financial institutions — enhanced by
            system reliability.
          </p>
          <div className="hero-animate flex flex-col sm:flex-row items-center justify-center gap-4">
            <MagneticButton variant="primary" size="large" to="/contact">
              View Security Roadmap
            </MagneticButton>
            <MagneticButton variant="secondary" size="large">
              Learn More
            </MagneticButton>
          </div>
        </div>

        {/* Decorative gradient orb */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-[0.04] pointer-events-none"
          style={{ background: 'radial-gradient(circle, #0072F5 0%, transparent 70%)' }}
        />
      </section>

      {/* Security Features Section */}
      <section ref={featuresRef} className="py-[120px] px-6 md:px-12">
        <div className="max-w-[1280px] mx-auto">
          <div className="text-center mb-16">
            <span className="gradient-badge inline-block mb-4">
              <DecryptText text="SECURITY FEATURES" trigger="inView" />
            </span>
            <h2 className="font-display font-bold text-[clamp(32px,4vw,56px)] text-soft-white tracking-[-0.03em] leading-tight mb-4">
              Multi-Layered Protection
            </h2>
            <p className="text-muted-blue text-[clamp(16px,1.2vw,20px)] max-w-[560px] mx-auto">
              Four independent security layers work together to ensure your funds and data remain untouchable.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {SECURITY_FEATURES.map((feature, i) => (
              <div key={i} className="feature-card">
                <StarBorder>
                  <div 
                    className="rounded-2xl border border-[rgba(255,255,255,0.15)] backdrop-blur-sm transition-all duration-400 ease-out hover:-translate-y-3 hover:scale-[1.03] hover:border-[rgba(0,198,255,0.4)] hover:shadow-[0_12px_40px_rgba(0,114,245,0.15)] p-8 md:p-10"
                    style={{ background: 'linear-gradient(135deg, rgba(7,11,20,0.25) 0%, rgba(2,4,10,0.20) 100%)' }}
                    data-hover
                  >
                    <div className="w-14 h-14 rounded-full brand-gradient flex items-center justify-center mb-6">
                      <feature.icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-display font-bold text-xl md:text-2xl text-soft-white mb-3 tracking-[-0.02em]">
                      {feature.title}
                    </h3>
                    <p className="text-muted-blue text-sm md:text-base leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </StarBorder>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Compliance Badges Section */}
      <section ref={complianceRef} className="py-[80px] px-6 md:px-12">
        <div className="max-w-[1280px] mx-auto text-center">
          <span className="gradient-badge inline-block mb-4">
            <DecryptText text="COMPLIANCE ROADMAP" trigger="inView" />
          </span>
          <h2 className="font-display font-bold text-[clamp(28px,3vw,44px)] text-soft-white tracking-[-0.03em] mb-4">
            Compliance Roadmap &amp; Target Standards
          </h2>
          <p className="text-muted-blue text-base md:text-lg max-w-[640px] mx-auto mb-4">
            These are the standards we are building toward. No completed third-party production audit has been published yet.
          </p>
          <p className="text-muted-blue text-sm md:text-base max-w-[640px] mx-auto mb-12">
            Legal and regulatory review is planned before any digital asset custody or financial-service expansion.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-[900px] mx-auto">
            {COMPLIANCE_BADGES.map((badge, i) => (
              <div
                key={i}
                className="compliance-badge group relative rounded-2xl border border-[rgba(255,255,255,0.15)] backdrop-blur-sm transition-all duration-400 ease-out hover:-translate-y-3 hover:scale-[1.03] hover:border-[rgba(0,198,255,0.4)] hover:shadow-[0_12px_40px_rgba(0,114,245,0.15)] p-8"
                style={{ background: 'linear-gradient(135deg, rgba(7,11,20,0.25) 0%, rgba(2,4,10,0.20) 100%)' }}
                data-hover
              >
                <div className="w-16 h-16 mx-auto mb-4 rounded-full brand-gradient flex items-center justify-center text-2xl">
                  <Shield className="w-7 h-7 text-white" />
                </div>
                <h3 className="font-display font-bold text-xl text-soft-white mb-1">
                  {badge.name}
                </h3>
                <p className="text-muted-blue text-sm">{badge.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security Process Visualization */}
      <section ref={processRef} className="py-[120px] px-6 md:px-12">
        <div className="max-w-[1280px] mx-auto">
          <div className="text-center mb-16">
            <span className="gradient-badge inline-block mb-4">
              <DecryptText text="HOW FUNDS ARE PROTECTED" trigger="inView" />
            </span>
            <h2 className="font-display font-bold text-[clamp(32px,4vw,56px)] text-soft-white tracking-[-0.03em] leading-tight mb-4">
              The Escrow Security Flow
            </h2>
            <p className="text-muted-blue text-[clamp(16px,1.2vw,20px)] max-w-[560px] mx-auto">
              Every transaction follows a securely enforced workflow that eliminates risk at each step.
            </p>
          </div>

          {/* Process Flow */}
          <div className="relative max-w-[1000px] mx-auto">
            {/* Desktop: horizontal flow */}
            <div className="hidden md:grid grid-cols-4 gap-4 relative">
              {[
                { step: '1', title: 'Deposit', desc: 'Funds held in escrow' },
                { step: '2', title: 'Verify', desc: 'Milestone proof submitted' },
                { step: '3', title: 'Approve', desc: 'Multi-sig authorization' },
                { step: '4', title: 'Release', desc: 'Funds disbursed from escrow' },
              ].map((item, i) => (
                <div key={i} className="relative">
                  <div className="process-step text-center">
                    <div 
                      className="w-20 h-20 mx-auto mb-4 rounded-full border border-[rgba(255,255,255,0.15)] backdrop-blur-sm flex items-center justify-center relative z-10"
                      style={{ background: 'linear-gradient(135deg, rgba(7,11,20,0.25) 0%, rgba(2,4,10,0.20) 100%)' }}
                      data-hover
                    >
                      <span className="font-display font-bold text-2xl brand-gradient-text">
                        {item.step}
                      </span>
                    </div>
                    <h4 className="font-display font-bold text-lg text-soft-white mb-1">
                      {item.title}
                    </h4>
                    <p className="text-muted-blue text-sm">{item.desc}</p>
                  </div>
                  {i < 3 && (
                    <div className="process-arrow absolute top-10 right-[-50%] w-full flex items-center justify-center z-0">
                      <ArrowRight className="w-6 h-6 text-brand-blue/40" />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Mobile: vertical flow */}
            <div className="md:hidden space-y-6">
              {[
                { step: '1', title: 'Deposit', desc: 'Funds held in escrow' },
                { step: '2', title: 'Verify', desc: 'Milestone proof submitted' },
                { step: '3', title: 'Approve', desc: 'Multi-sig authorization' },
                { step: '4', title: 'Release', desc: 'Funds disbursed from escrow' },
              ].map((item, i) => (
                <div key={i} className="process-step flex items-center gap-4">
                  <div 
                    className="w-14 h-14 shrink-0 rounded-full border border-[rgba(255,255,255,0.15)] backdrop-blur-sm flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, rgba(7,11,20,0.25) 0%, rgba(2,4,10,0.20) 100%)' }}
                    data-hover
                  >
                    <span className="font-display font-bold text-xl brand-gradient-text">
                      {item.step}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-display font-bold text-lg text-soft-white">
                      {item.title}
                    </h4>
                    <p className="text-muted-blue text-sm">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Animated SVG connection line (desktop only) */}
            <svg
              className="hidden md:block absolute top-10 left-0 w-full h-2 pointer-events-none"
              viewBox="0 0 1000 8"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#0072F5" stopOpacity="0.6" />
                  <stop offset="50%" stopColor="#7C3AED" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#00C6FF" stopOpacity="0.6" />
                </linearGradient>
              </defs>
              <line
                x1="60"
                y1="4"
                x2="940"
                y2="4"
                stroke="url(#lineGrad)"
                strokeWidth="2"
                strokeDasharray="8 6"
                className="process-arrow"
              >
                <animate
                  attributeName="stroke-dashoffset"
                  from="0"
                  to="-28"
                  dur="2s"
                  repeatCount="indefinite"
                />
              </line>
            </svg>
          </div>
        </div>
      </section>

      {/* Audit & Transparency Section */}
      <section ref={auditRef} className="py-[120px] px-6 md:px-12">
        <div className="max-w-[1280px] mx-auto">
          <div className="text-center mb-16">
            <span className="gradient-badge inline-block mb-4">
              <DecryptText text="TRANSPARENCY" trigger="inView" />
            </span>
            <h2 className="font-display font-bold text-[clamp(32px,4vw,56px)] text-soft-white tracking-[-0.03em] leading-tight mb-4">
              Security Audit Timeline
            </h2>
            <p className="text-muted-blue text-[clamp(16px,1.2vw,20px)] max-w-[560px] mx-auto">
              Our planned third-party audit program is designed to help maintain high security standards as the platform grows.
            </p>
          </div>

          <div className="max-w-[800px] mx-auto relative">
            {/* Timeline line */}
            <div className="absolute left-4 md:left-1/2 md:-translate-x-px top-0 bottom-0 w-0.5 bg-gradient-to-b from-brand-blue via-vivid-violet to-transparent" />

            <div className="space-y-8">
              {AUDIT_TIMELINE.map((audit, i) => (
                <div
                  key={i}
                  className={`audit-item relative flex items-start gap-6 ${
                    i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'
                  }`}
                >
                  {/* Timeline dot */}
                  <div 
                    className="absolute left-4 md:left-1/2 -translate-x-1/2 w-4 h-4 rounded-full border border-[rgba(255,255,255,0.15)] z-10 mt-1.5"
                    style={{ background: 'linear-gradient(135deg, rgba(7,11,20,0.25) 0%, rgba(2,4,10,0.20) 100%)' }}
                  />

                  <div className={`ml-12 md:ml-0 md:w-[calc(50%-32px)] ${i % 2 === 0 ? 'md:text-right' : 'md:text-left'}`}>
                    <div 
                      className="rounded-2xl border border-[rgba(255,255,255,0.15)] backdrop-blur-sm transition-all duration-400 ease-out hover:-translate-y-3 hover:scale-[1.03] hover:border-[rgba(0,198,255,0.4)] hover:shadow-[0_12px_40px_rgba(0,114,245,0.15)] p-6"
                      style={{ background: 'linear-gradient(135deg, rgba(7,11,20,0.25) 0%, rgba(2,4,10,0.20) 100%)' }}
                      data-hover
                    >
                      <div className={`flex items-center gap-2 mb-2 ${i % 2 === 0 ? 'md:justify-end' : 'md:justify-start'}`}>
                        <span className="text-xs font-mono text-brand-blue">{audit.date}</span>
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                          audit.status === 'Completed'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : audit.status === 'In Progress'
                            ? 'bg-amber-500/10 text-amber-400'
                            : 'bg-muted-blue/10 text-muted-blue'
                        }`}>
                          {audit.status === 'Completed' && <CheckCircle className="w-3 h-3" />}
                          {audit.status}
                        </span>
                      </div>
                      <h4 className="font-display font-bold text-lg text-soft-white mb-1">
                        {audit.title}
                      </h4>
                      <p className="text-muted-blue text-sm">by {audit.org}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section ref={ctaRef} className="py-[120px] md:py-[160px] px-6 md:px-12">
        <div
          className="max-w-[1280px] mx-auto rounded-[24px] p-12 md:p-20 text-center relative overflow-hidden border border-[rgba(255,255,255,0.15)] backdrop-blur-sm transition-all duration-400 ease-out hover:-translate-y-3 hover:scale-[1.03] hover:border-[rgba(0,198,255,0.4)] hover:shadow-[0_12px_40px_rgba(0,114,245,0.15)]"
          style={{ background: 'linear-gradient(135deg, rgba(7,11,20,0.25) 0%, rgba(2,4,10,0.20) 100%)' }}
          data-hover
        >
          <div className="cta-animate">
            <span className="gradient-badge inline-block mb-6">
              <DecryptText text="GET STARTED" trigger="inView" />
            </span>
          </div>
          <h2 className="cta-animate font-display font-bold text-[clamp(32px,4.5vw,64px)] text-soft-white tracking-[-0.03em] leading-tight mb-4">
            Ready for <span className="brand-gradient-text">Secure</span> Escrow?
          </h2>
          <p className="cta-animate text-muted-blue text-[clamp(16px,1.3vw,20px)] max-w-[520px] mx-auto mb-10">
            Join the next generation of construction payments — protected by our secure system, trusted by industry leaders.
          </p>
          <div className="cta-animate flex flex-col sm:flex-row items-center justify-center gap-4">
            <MagneticButton variant="primary" size="large">
              Launch App
            </MagneticButton>
            <MagneticButton variant="secondary" size="large">
              Contact Security Team
            </MagneticButton>
          </div>

          {/* Decorative glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(ellipse, rgba(0,114,245,0.08) 0%, transparent 70%)' }}
          />
        </div>
      </section>
    </div>
  )
}

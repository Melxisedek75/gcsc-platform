import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Sparkles } from 'lucide-react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import StarBorder from '@/components/StarBorder'
import MagneticButton from '@/components/MagneticButton'


gsap.registerPlugin(ScrollTrigger)

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

interface PricingTier {
  name: string
  priceMonthly: string
  priceAnnual: string
  period: string
  description: string
  features: string[]
  cta: string
  highlighted?: boolean
  badge?: string
}

const TIERS: PricingTier[] = [
  {
    name: 'Free',
    priceMonthly: '$0',
    priceAnnual: '$0',
    period: '/month',
    description: 'Perfect for getting started with secure milestone escrow.',
    features: [
      'Post 1 active project',
      'Basic escrow protection',
      'Community support',
      'Standard verification',
      'Email notifications',
    ],
    cta: 'Get Started',
  },
  {
    name: 'Pro',
    priceMonthly: '$49',
    priceAnnual: '$39',
    period: '/month',
    description: 'Everything you need to scale your construction business.',
    features: [
      'Unlimited projects',
      'Priority escrow processing',
      'Verified contractor badge',
      'Advanced analytics dashboard',
      'Priority customer support',
      'Custom contract templates',
      'API access (1,000 calls/mo)',
    ],
    cta: 'Start Pro Trial',
    highlighted: true,
    badge: 'Most Popular',
  },
  {
    name: 'Enterprise',
    priceMonthly: 'Custom',
    priceAnnual: 'Custom',
    period: '',
    description: 'Tailored solutions for large-scale operations.',
    features: [
      'Custom workflows',
      'Full API access',
      'Dedicated account manager',
      'SLA guarantee',
      'On-premise deployment option',
      'White-label solution',
      'Custom integrations',
      '24/7 phone support',
    ],
    cta: 'Contact Sales',
  },
]

/* ------------------------------------------------------------------ */
/*  Animated Check Icon (isolated, GSAP-driven)                        */
/* ------------------------------------------------------------------ */

function AnimatedCheck({ delay = 0 }: { delay?: number }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return
    const ctx = gsap.context(() => {
      gsap.from(ref.current, {
        scale: 0,
        opacity: 0,
        duration: 0.4,
        delay,
        ease: 'back.out(2)',
        scrollTrigger: {
          trigger: ref.current!,
          start: 'top 85%',
          once: true,
        },
      })
    })
    return () => ctx.revert()
  }, [delay])

  return (
    <div ref={ref} className="w-5 h-5 rounded-full bg-[#22D3EE]/15 flex items-center justify-center shrink-0 mt-0.5">
      <Check className="w-3 h-3 text-[#22D3EE]" strokeWidth={3} />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Pricing Card (isolated GSAP scroll animation)                      */
/* ------------------------------------------------------------------ */

function PricingCard({
  tier,
  index,
  isAnnual,
}: {
  tier: PricingTier
  index: number
  isAnnual: boolean
}) {
  const cardRef = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    if (!cardRef.current) return
    gsap.from(cardRef.current, {
      y: 60,
      opacity: 0,
      duration: 0.8,
      delay: index * 0.12,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: cardRef.current,
        start: 'top 85%',
        once: true,
      },
    })
  }, { scope: cardRef })

  const price = isAnnual ? tier.priceAnnual : tier.priceMonthly

  const innerContent = (
    <div
      ref={cardRef}
      className="relative h-full rounded-[20px] p-8 md:p-10 flex flex-col transition-all duration-400 ease-out hover:-translate-y-3 hover:scale-[1.03] hover:border-[rgba(0,198,255,0.4)] hover:shadow-[0_12px_40px_rgba(0,114,245,0.15)] border border-[rgba(255,255,255,0.15)] backdrop-blur-sm"
      style={{ background: 'linear-gradient(135deg, rgba(7,11,20,0.25) 0%, rgba(2,4,10,0.20) 100%)' }}
      data-hover
    >
      {/* Badge */}
      {tier.badge && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20">
          <span className="gradient-badge flex items-center gap-1.5 whitespace-nowrap">
            <Sparkles className="w-3 h-3" />
            {tier.badge}
          </span>
        </div>
      )}

      {/* Tier name */}
      <h3 className="font-display text-xl font-bold text-soft-white mb-2">
        {tier.name}
      </h3>

      {/* Price */}
      <div className="flex items-baseline gap-1 mb-3">
        <AnimatePresence mode="wait">
          <motion.span
            key={price + isAnnual}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.25 }}
            className="font-display text-[clamp(40px,4vw,56px)] font-bold brand-gradient-text leading-none"
          >
            {price}
          </motion.span>
        </AnimatePresence>
        {tier.period && (
          <span className="text-muted-blue text-sm">{tier.period}</span>
        )}
      </div>

      {/* Description */}
      <p className="text-sm text-muted-blue leading-relaxed mb-6">
        {tier.description}
      </p>

      {/* Divider */}
      <div className="w-full h-px bg-[rgba(91,110,138,0.12)] mb-6" />

      {/* Features */}
      <ul className="flex flex-col gap-3 mb-8 flex-1">
        {tier.features.map((feature, fi) => (
          <li key={feature} className="flex items-start gap-3">
            <AnimatedCheck delay={fi * 0.06} />
            <span className="text-sm text-soft-white/80 leading-relaxed">
              {feature}
            </span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      <MagneticButton
        variant={tier.highlighted ? 'primary' : 'secondary'}
        size="large"
        className="w-full"
      >
        {tier.cta}
      </MagneticButton>
    </div>
  )

  if (tier.highlighted) {
    return (
      <div className="relative lg:-mt-4 lg:mb-4">
        <StarBorder speed={4}>{innerContent}</StarBorder>
      </div>
    )
  }

  return (
    <div className="rounded-[20px] p-[1px] bg-[rgba(91,110,138,0.15)] hover:bg-[rgba(0,114,245,0.3)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_60px_rgba(0,114,245,0.12)]">
      {innerContent}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main Pricing Page                                                  */
/* ------------------------------------------------------------------ */

export default function Pricing() {
  const [isAnnual, setIsAnnual] = useState(false)
  const heroRef = useRef<HTMLDivElement>(null)
  const sectionRef = useRef<HTMLDivElement>(null)

  /* Hero GSAP entrance */
  useGSAP(() => {
    if (!heroRef.current) return
    const tl = gsap.timeline()
    tl.from(heroRef.current!.querySelectorAll('.hero-animate'), {
      y: 50,
      opacity: 0,
      duration: 0.8,
      stagger: 0.1,
      ease: 'power3.out',
    })
  }, { scope: heroRef })

  /* Stagger cards on scroll - handled per-card in PricingCard */

  const toggle = useCallback(() => setIsAnnual((p) => !p), [])

  return (
    <div className="relative min-h-[100dvh] bg-void overflow-hidden">
      {/* Photographic backdrop */}
      <div
        className="absolute inset-x-0 top-0 h-[80vh] z-0 pointer-events-none"
        style={{
          backgroundImage: 'url(/bg_features.webp)',
          backgroundSize: 'cover',
          backgroundPosition: 'center top',
          opacity: 0.12,
          maskImage: 'linear-gradient(to bottom, black 40%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, black 40%, transparent 100%)',
        }}
      />
      {/* Subtle mesh gradient background */}
      <div className="absolute inset-0 mesh-gradient-bg pointer-events-none" />

      {/* ── Hero ── */}
      <section
        ref={heroRef}
        className="relative pt-[72px] pb-20 md:pb-28 px-6 md:px-12"
      >
        <div className="max-w-[1280px] mx-auto text-center pt-16 md:pt-24">
          {/* Badge */}
          <div className="hero-animate inline-block mb-6">
            <span className="gradient-badge">Transparent Pricing</span>
          </div>

          {/* Headline */}
          <h1 className="hero-animate font-display text-[clamp(40px,6vw,80px)] font-bold leading-[0.95] tracking-[-0.03em] mb-6">
            <span className="brand-gradient-text">Simple, Transparent</span>
            <br />
            <span className="text-soft-white">Pricing</span>
          </h1>

          {/* Subtitle */}
          <p className="hero-animate text-muted-blue text-[clamp(16px,1.3vw,20px)] leading-relaxed max-w-[560px] mx-auto mb-10">
            Choose the plan that fits your needs. Upgrade or downgrade at any
            time with no hidden fees.
          </p>

          {/* Monthly / Annual toggle — Framer Motion (isolated UI interaction) */}
          <div className="hero-animate flex items-center justify-center gap-4">
            <span
              className={`text-sm font-medium transition-colors duration-200 ${
                !isAnnual ? 'text-soft-white' : 'text-muted-blue'
              }`}
            >
              Monthly
            </span>
            <button
              onClick={toggle}
              className="relative w-14 h-7 rounded-full bg-[#0D1220] border border-[rgba(91,110,138,0.2)] cursor-pointer"
              aria-label="Toggle annual billing"
            >
              <motion.div
                className="absolute top-0.5 left-0.5 w-6 h-6 rounded-full brand-gradient shadow-[0_2px_8px_rgba(0,114,245,0.4)]"
                animate={{ x: isAnnual ? 26 : 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              />
            </button>
            <span
              className={`text-sm font-medium transition-colors duration-200 ${
                isAnnual ? 'text-soft-white' : 'text-muted-blue'
              }`}
            >
              Annual
            </span>
            {isAnnual && (
              <motion.span
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-xs font-semibold text-[#22D3EE] bg-[#22D3EE]/10 px-2.5 py-1 rounded-full"
              >
                Save 20%
              </motion.span>
            )}
          </div>
        </div>
      </section>

      {/* ── Pricing Cards ── */}
      <section ref={sectionRef} className="relative px-6 md:px-12 pb-32">
        <div className="max-w-[1280px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {TIERS.map((tier, i) => (
            <PricingCard key={tier.name} tier={tier} index={i} isAnnual={isAnnual} />
          ))}
        </div>
      </section>

      {/* ── FAQ teaser ── */}
      <section className="relative px-6 md:px-12 pb-32">
        <div className="max-w-[720px] mx-auto text-center">
          <h2 className="font-display text-[clamp(28px,3vw,40px)] font-bold text-soft-white mb-4">
            Questions?
          </h2>
          <p className="text-muted-blue mb-8">
            Our team is here to help you find the perfect plan.
          </p>
          <MagneticButton variant="secondary" to="/contact">
            Contact Support
          </MagneticButton>
        </div>
      </section>
    </div>
  )
}

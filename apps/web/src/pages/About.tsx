import { useRef, useState } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import {
  Twitter,
  Linkedin,
  Github,
  Globe,
  Rocket,
  Users,
  TrendingUp,
  Zap,
} from 'lucide-react'
import MagneticButton from '@/components/MagneticButton'
import DecryptText from '@/components/DecryptText'

gsap.registerPlugin(ScrollTrigger, SplitText)

/* ------------------------------------------------------------------ */
/*  DATA                                                               */
/* ------------------------------------------------------------------ */

const STATS = [
  { label: 'Founded', value: 2024, suffix: '', prefix: '', isDate: true },
  { label: 'Projects', value: 500, suffix: '+', prefix: '', isDate: false },
  { label: 'Secured', value: 2, suffix: 'M+', prefix: '$', isDate: false },
  { label: 'Contractors', value: 50, suffix: '+', prefix: '', isDate: false },
]

interface TeamMember {
  name: string
  role: string
  bio: string
  initials: string
  color: string
  socials: { icon: 'twitter' | 'linkedin' | 'github'; href: string }[]
}

const TEAM: TeamMember[] = [
  {
    name: 'Marcus Chen',
    role: 'CEO & Co-Founder',
    bio: 'Former construction exec with 15+ years in project management. Technology advocate since 2017.',
    initials: 'MC',
    color: 'from-[#0072F5] to-[#00C6FF]',
    socials: [
      { icon: 'twitter', href: 'https://twitter.com' },
      { icon: 'linkedin', href: 'https://linkedin.com' },
    ],
  },
  {
    name: 'Sarah Kim',
    role: 'CTO & Co-Founder',
    bio: 'Escrow system architect and GCSC Network contributor. Previously lead engineer at a fintech protocol.',
    initials: 'SK',
    color: 'from-[#7C3AED] to-[#0072F5]',
    socials: [
      { icon: 'twitter', href: 'https://twitter.com' },
      { icon: 'github', href: 'https://github.com' },
      { icon: 'linkedin', href: 'https://linkedin.com' },
    ],
  },
  {
    name: 'David Okonkwo',
    role: 'Head of Product',
    bio: 'Product leader focused on B2B SaaS platforms. Passionate about transforming legacy industries.',
    initials: 'DO',
    color: 'from-[#00C6FF] to-[#7C3AED]',
    socials: [
      { icon: 'twitter', href: 'https://twitter.com' },
      { icon: 'linkedin', href: 'https://linkedin.com' },
    ],
  },
  {
    name: 'Elena Vasquez',
    role: 'Lead Developer',
    bio: 'Full-stack engineer specializing in secure payment integrations and financial systems.',
    initials: 'EV',
    color: 'from-[#0072F5] to-[#7C3AED]',
    socials: [
      { icon: 'github', href: 'https://github.com' },
      { icon: 'linkedin', href: 'https://linkedin.com' },
    ],
  },
]

const TIMELINE = [
  {
    quarter: 'Q1 2024',
    title: 'Concept & Research',
    desc: 'Identified the escrow gap in construction. Conducted 100+ interviews with contractors and homeowners. Defined the secure escrow solution.',
    icon: Zap,
    highlight: false,
  },
  {
    quarter: 'Q2 2024',
    title: 'Development Kickoff',
    desc: 'Built core escrow agreements on our secure network. Assembled founding team. Raised initial seed funding from construction-tech VCs.',
    icon: Rocket,
    highlight: false,
  },
  {
    quarter: 'Q3 2024',
    title: 'Platform Launch',
    desc: 'Deployed beta with 50 contractors. Processed first $1M in escrow transactions. Achieved 99.9% platform uptime.',
    icon: Globe,
    highlight: true,
  },
  {
    quarter: 'Q4 2024',
    title: 'Rapid Growth',
    desc: 'Scaled to 500+ projects. Launched GCSC credit system. Partnered with MetalPay for payment processing. Expanded to 3 states.',
    icon: TrendingUp,
    highlight: false,
  },
  {
    quarter: '2025',
    title: 'Global Expansion',
    desc: 'Expanding nationwide across the US. Introducing AI-powered contractor matching. Multi-network integration for broader accessibility.',
    icon: Users,
    highlight: false,
  },
]

/* ------------------------------------------------------------------ */
/*  SOCIAL ICON HELPER                                                 */
/* ------------------------------------------------------------------ */

function SocialIcon({ type }: { type: 'twitter' | 'linkedin' | 'github' }) {
  const cls =
    'w-4 h-4 text-muted-blue hover:text-soft-white transition-colors duration-200'
  if (type === 'twitter') return <Twitter className={cls} />
  if (type === 'linkedin') return <Linkedin className={cls} />
  return <Github className={cls} />
}

/* ------------------------------------------------------------------ */
/*  MAIN COMPONENT                                                     */
/* ------------------------------------------------------------------ */

export default function About() {
  const containerRef = useRef<HTMLDivElement>(null)
  const heroHeadlineRef = useRef<HTMLHeadingElement>(null)
  const heroSubRef = useRef<HTMLParagraphElement>(null)
  const missionQuoteRef = useRef<HTMLParagraphElement>(null)
  const statsRef = useRef<HTMLDivElement>(null)
  const teamRef = useRef<HTMLDivElement>(null)
  const timelineRef = useRef<HTMLDivElement>(null)

  const [statValues, setStatValues] = useState<number[]>(STATS.map(() => 0))

  useGSAP(
    () => {
      /* ---- Hero headline SplitText ---- */
      if (heroHeadlineRef.current) {
        const split = new SplitText(heroHeadlineRef.current, {
          type: 'chars,words',
        })
        gsap.set(split.chars, {
          opacity: 0,
          y: 60,
          rotateX: 40,
          transformPerspective: 600,
        })
        gsap.to(split.chars, {
          opacity: 1,
          y: 0,
          rotateX: 0,
          duration: 0.6,
          stagger: 0.03,
          ease: 'cubic-bezier(0.16, 1, 0.3, 1)',
          delay: 0.3,
        })
      }

      /* ---- Hero subtitle fade-up ---- */
      if (heroSubRef.current) {
        gsap.from(heroSubRef.current, {
          opacity: 0,
          y: 30,
          duration: 0.8,
          ease: 'cubic-bezier(0.16, 1, 0.3, 1)',
          delay: 0.8,
        })
      }

      /* ---- Mission quote SplitText ---- */
      if (missionQuoteRef.current) {
        const split = new SplitText(missionQuoteRef.current, {
          type: 'chars,words',
        })
        gsap.set(split.chars, {
          opacity: 0,
          y: 40,
          rotateX: 30,
          transformPerspective: 500,
        })
        gsap.to(split.chars, {
          opacity: 1,
          y: 0,
          rotateX: 0,
          duration: 0.5,
          stagger: 0.02,
          ease: 'cubic-bezier(0.16, 1, 0.3, 1)',
          scrollTrigger: {
            trigger: missionQuoteRef.current,
            start: 'top 80%',
            toggleActions: 'play none none none',
          },
        })
      }

      /* ---- Stats count-up ---- */
      if (statsRef.current) {
        const statEls = statsRef.current.querySelectorAll('.stat-item')
        gsap.from(statEls, {
          opacity: 0,
          y: 40,
          duration: 0.8,
          stagger: 0.12,
          ease: 'cubic-bezier(0.16, 1, 0.3, 1)',
          scrollTrigger: {
            trigger: statsRef.current,
            start: 'top 80%',
            toggleActions: 'play none none none',
            onEnter: () => {
              STATS.forEach((stat, i) => {
                const obj = { val: 0 }
                gsap.to(obj, {
                  val: stat.value,
                  duration: 2,
                  ease: 'power2.out',
                  delay: i * 0.15,
                  onUpdate: () => {
                    setStatValues((prev) => {
                      const next = [...prev]
                      next[i] =
                        stat.isDate
                          ? Math.round(obj.val)
                          : Math.round(obj.val * 10) / 10
                      return next
                    })
                  },
                })
              })
            },
          },
        })
      }

      /* ---- Team cards stagger ---- */
      if (teamRef.current) {
        const cards = teamRef.current.querySelectorAll('.team-card')
        gsap.from(cards, {
          opacity: 0,
          y: 50,
          scale: 0.95,
          duration: 0.8,
          stagger: 0.1,
          ease: 'cubic-bezier(0.16, 1, 0.3, 1)',
          scrollTrigger: {
            trigger: teamRef.current,
            start: 'top 80%',
            toggleActions: 'play none none none',
          },
        })
      }

      /* ---- Timeline items ---- */
      if (timelineRef.current) {
        const items = timelineRef.current.querySelectorAll('.timeline-item')
        gsap.from(items, {
          opacity: 0,
          x: -40,
          duration: 0.8,
          stagger: 0.15,
          ease: 'cubic-bezier(0.16, 1, 0.3, 1)',
          scrollTrigger: {
            trigger: timelineRef.current,
            start: 'top 80%',
            toggleActions: 'play none none none',
          },
        })

        /* Timeline line draw */
        const line = timelineRef.current.querySelector('.timeline-line')
        if (line) {
          gsap.from(line, {
            scaleY: 0,
            transformOrigin: 'top center',
            duration: 2,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: timelineRef.current,
              start: 'top 80%',
              end: 'bottom 60%',
              scrub: 0.5,
            },
          })
        }
      }
    },
    { scope: containerRef }
  )

  /* ---- SplitText revert on unmount handled by useGSAP ---- */

  return (
    <div ref={containerRef} className="bg-void">
      {/* ============================================================ */}
      {/* HERO                                                          */}
      {/* ============================================================ */}
      <section className="relative min-h-[100dvh] flex flex-col items-center justify-center px-6 md:px-12 overflow-hidden">
        {/* Photographic backdrop */}
        <div
          className="absolute inset-0 z-0 pointer-events-none"
          style={{
            backgroundImage: 'url(/scene_family_modern.webp)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: 0.14,
          }}
        />
        {/* Mesh gradient background */}
        <div
          className="absolute inset-0 z-0"
          style={{
            background:
              'radial-gradient(ellipse at 20% 30%, rgba(0,114,245,0.12) 0%, transparent 60%), radial-gradient(ellipse at 80% 70%, rgba(124,58,237,0.08) 0%, transparent 60%)',
          }}
        />

        <div className="relative z-10 text-center max-w-[900px] mx-auto">
          <div className="gradient-badge inline-block mb-8">
            <DecryptText text="ABOUT GCSC" delay={200} />
          </div>

          <h1
            ref={heroHeadlineRef}
            className="font-display font-bold leading-[0.95] tracking-[-0.04em] brand-gradient-text"
            style={{ fontSize: 'clamp(56px, 8vw, 120px)' }}
          >
            Building Trust in Construction
          </h1>

          <p
            ref={heroSubRef}
            className="mt-8 text-muted-blue max-w-[640px] mx-auto leading-relaxed"
            style={{ fontSize: 'clamp(18px, 1.5vw, 22px)' }}
          >
            We are on a mission to eliminate payment disputes and fraud in the
            construction industry through secure escrow agreements. Every
            project deserves trust, transparency, and timely payments.
          </p>

          <div className="mt-12 flex items-center justify-center gap-4 flex-wrap">
            <MagneticButton variant="primary" to="/contact">
              Contact Us
            </MagneticButton>
            <MagneticButton variant="secondary" to="/dashboard">
              Explore Platform
            </MagneticButton>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* MISSION                                                       */}
      {/* ============================================================ */}
      <section className="relative py-[120px] md:py-[160px] px-6 md:px-12 overflow-hidden">
        <div className="max-w-[1280px] mx-auto">
          <div className="max-w-[900px] mx-auto text-center">
            <div className="gradient-badge inline-block mb-10">
              <DecryptText text="OUR MISSION" delay={0} trigger="inView" />
            </div>

            <p
              ref={missionQuoteRef}
              className="font-display font-bold text-white leading-[1.1] tracking-[-0.03em]"
              style={{ fontSize: 'clamp(28px, 4vw, 56px)' }}
            >
              &ldquo;To make every construction payment secure, transparent,
              and instant — eliminating trust gaps between contractors and
              clients forever.&rdquo;
            </p>

            <p className="mt-10 text-muted-blue max-w-[600px] mx-auto leading-relaxed text-base">
              The construction industry loses billions annually to payment
              disputes, fraud, and delayed settlements. GCSC leverages our
              secure network to create binding escrow agreements that
              automatically release funds when milestones are verified —
              no middlemen, no delays, no disputes.
            </p>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* STATS                                                         */}
      {/* ============================================================ */}
      <section className="relative py-[80px] px-6 md:px-12 border-t border-b border-[rgba(91,110,138,0.08)]">
        <div className="max-w-[1280px] mx-auto">
          <div
            ref={statsRef}
            className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-6"
          >
            {STATS.map((stat, i) => (
              <div key={stat.label} className="stat-item text-center">
                {/* Stat card — glassmorphism */}
                <div
                  className="rounded-2xl border border-[rgba(255,255,255,0.15)] backdrop-blur-sm transition-all duration-400 ease-out hover:-translate-y-3 hover:scale-[1.03] hover:border-[rgba(0,198,255,0.4)] hover:shadow-[0_12px_40px_rgba(0,114,245,0.15)] p-6"
                  style={{ background: 'linear-gradient(135deg, rgba(7,11,20,0.25) 0%, rgba(2,4,10,0.20) 100%)' }}
                  data-hover
                >
                  <div
                    className="font-display font-bold brand-gradient-text leading-none"
                    style={{ fontSize: 'clamp(48px, 6vw, 80px)' }}
                  >
                    {stat.prefix}
                    {stat.isDate
                      ? statValues[i]
                      : statValues[i].toLocaleString()}
                    {stat.suffix}
                  </div>
                  <div className="mt-3 text-[12px] font-medium uppercase tracking-[0.06em] text-muted-blue">
                    {stat.label}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* TEAM                                                          */}
      {/* ============================================================ */}
      <section className="relative py-[120px] md:py-[160px] px-6 md:px-12">
        <div className="max-w-[1280px] mx-auto">
          <div className="text-center mb-16">
            <div className="gradient-badge inline-block mb-6">
              <DecryptText text="THE TEAM" delay={0} trigger="inView" />
            </div>
            <h2
              className="font-display font-bold text-white leading-[1.0] tracking-[-0.03em]"
              style={{ fontSize: 'clamp(40px, 5vw, 72px)' }}
            >
              Meet the Builders
            </h2>
            <p className="mt-4 text-muted-blue max-w-[480px] mx-auto text-base">
              A passionate team of engineers, product thinkers, and industry
              veterans united by one goal: transforming construction payments.
            </p>
          </div>

          <div
            ref={teamRef}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {TEAM.map((member) => (
              <div key={member.name} className="team-card">
                {/* Team member card — glassmorphism with hover lift */}
                <div
                  className="rounded-2xl border border-[rgba(255,255,255,0.15)] backdrop-blur-sm transition-all duration-400 ease-out hover:-translate-y-3 hover:scale-[1.03] hover:border-[rgba(0,198,255,0.4)] hover:shadow-[0_12px_40px_rgba(0,114,245,0.15)] p-8 flex flex-col items-center text-center h-full"
                  style={{ background: 'linear-gradient(135deg, rgba(7,11,20,0.25) 0%, rgba(2,4,10,0.20) 100%)' }}
                  data-hover
                >
                  {/* Avatar */}
                  <div
                    className={`w-20 h-20 rounded-full bg-gradient-to-br ${member.color} flex items-center justify-center text-white font-display font-bold text-xl shadow-lg mb-5`}
                  >
                    {member.initials}
                  </div>

                  <h3 className="font-display font-bold text-white text-lg tracking-[-0.02em]">
                    {member.name}
                  </h3>
                  <p className="text-brand-blue text-sm font-medium mt-1">
                    {member.role}
                  </p>
                  <p className="text-muted-blue text-sm leading-relaxed mt-3 flex-1">
                    {member.bio}
                  </p>

                  {/* Social links */}
                  <div className="flex items-center gap-3 mt-5">
                    {member.socials.map((s) => (
                      <a
                        key={s.icon + s.href}
                        href={s.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:scale-110 transition-transform duration-200"
                      >
                        <SocialIcon type={s.icon} />
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* TIMELINE / ROADMAP                                            */}
      {/* ============================================================ */}
      <section className="relative py-[120px] md:py-[160px] px-6 md:px-12 border-t border-[rgba(91,110,138,0.08)]">
        <div className="max-w-[1280px] mx-auto">
          <div className="text-center mb-16">
            <div className="gradient-badge inline-block mb-6">
              <DecryptText text="OUR JOURNEY" delay={0} trigger="inView" />
            </div>
            <h2
              className="font-display font-bold text-white leading-[1.0] tracking-[-0.03em]"
              style={{ fontSize: 'clamp(40px, 5vw, 72px)' }}
            >
              Roadmap
            </h2>
            <p className="mt-4 text-muted-blue max-w-[480px] mx-auto text-base">
              From concept to global expansion — our journey to revolutionize
              construction payments.
            </p>
          </div>

          <div ref={timelineRef} className="relative max-w-[800px] mx-auto">
            {/* Vertical line */}
            <div
              className="timeline-line absolute left-4 md:left-1/2 top-0 bottom-0 w-[2px] md:-translate-x-1/2"
              style={{
                background:
                  'linear-gradient(to bottom, #0072F5, #7C3AED, #00C6FF)',
              }}
            />

            {TIMELINE.map((item, i) => {
              const Icon = item.icon
              const isLeft = i % 2 === 0
              return (
                <div
                  key={item.quarter}
                  className={`timeline-item relative flex items-start gap-6 md:gap-0 mb-12 last:mb-0 ${
                    isLeft
                      ? 'md:flex-row'
                      : 'md:flex-row-reverse'
                  }`}
                >
                  {/* Timeline dot */}
                  <div className="absolute left-4 md:left-1/2 -translate-x-1/2 z-10">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        item.highlight
                          ? 'bg-gradient-to-br from-[#0072F5] to-[#7C3AED] shadow-[0_0_20px_rgba(0,114,245,0.5)]'
                          : 'bg-navy border border-[rgba(91,110,138,0.3)]'
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 ${
                          item.highlight
                            ? 'text-white'
                            : 'text-muted-blue'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Content card — glassmorphism */}
                  <div
                    className={`ml-14 md:ml-0 md:w-[45%] ${
                      isLeft ? 'md:pr-12 md:text-right' : 'md:pl-12'
                    }`}
                  >
                    <div
                      className="rounded-2xl border border-[rgba(255,255,255,0.15)] backdrop-blur-sm transition-all duration-400 ease-out hover:-translate-y-3 hover:scale-[1.03] hover:border-[rgba(0,198,255,0.4)] hover:shadow-[0_12px_40px_rgba(0,114,245,0.15)] p-6"
                      style={{ background: 'linear-gradient(135deg, rgba(7,11,20,0.25) 0%, rgba(2,4,10,0.20) 100%)' }}
                      data-hover
                    >
                      <div
                        className={`inline-block px-3 py-1 rounded-full text-[12px] font-semibold uppercase tracking-[0.06em] mb-3 ${
                          item.highlight
                            ? 'bg-gradient-to-r from-[rgba(0,114,245,0.2)] to-[rgba(124,58,237,0.2)] text-light-blue border border-[rgba(0,114,245,0.3)]'
                            : 'bg-[rgba(91,110,138,0.1)] text-muted-blue'
                        }`}
                      >
                        {item.quarter}
                      </div>
                      <h3 className="font-display font-bold text-white text-xl tracking-[-0.02em]">
                        {item.title}
                      </h3>
                      <p className="mt-2 text-muted-blue text-sm leading-relaxed">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* CTA                                                           */}
      {/* ============================================================ */}
      <section className="relative py-[120px] md:py-[160px] px-6 md:px-12 overflow-hidden">
        <div
          className="absolute inset-0 z-0"
          style={{
            background:
              'radial-gradient(ellipse at 50% 50%, rgba(0,114,245,0.1) 0%, transparent 60%), radial-gradient(ellipse at 70% 60%, rgba(124,58,237,0.08) 0%, transparent 50%)',
          }}
        />
        <div className="relative z-10 max-w-[700px] mx-auto text-center">
          <h2
            className="font-display font-bold leading-[1.0] tracking-[-0.03em] brand-gradient-text"
            style={{ fontSize: 'clamp(36px, 4vw, 64px)' }}
          >
            Join the Future of Construction Payments
          </h2>
          <p className="mt-6 text-muted-blue text-base max-w-[500px] mx-auto leading-relaxed">
            Whether you are a contractor, homeowner, or enterprise — GCSC is
            built to make your construction projects smoother and more secure.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4 flex-wrap">
            <MagneticButton variant="primary" to="/contact">
              Get in Touch
            </MagneticButton>
            <MagneticButton variant="secondary" to="/dashboard">
              Launch App
            </MagneticButton>
          </div>
        </div>
      </section>
    </div>
  )
}

import { useRef, useState } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import {
  Mail,
  MapPin,
  Twitter,
  Linkedin,
  Github,
  Send,
  Clock,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  Globe,
  HelpCircle,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import MagneticButton from '@/components/MagneticButton'
import DecryptText from '@/components/DecryptText'

gsap.registerPlugin(ScrollTrigger)

/* ------------------------------------------------------------------ */
/*  DATA                                                               */
/* ------------------------------------------------------------------ */

const SUBJECTS = [
  { value: 'general', label: 'General Inquiry' },
  { value: 'support', label: 'Technical Support' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'enterprise', label: 'Enterprise' },
]

const CONTACT_INFO = [
  {
    icon: Mail,
    title: 'Email',
    value: 'hello@gcsc.store',
    href: 'mailto:hello@gcsc.store',
    color: 'from-[#0072F5] to-[#00C6FF]',
  },
  {
    icon: MapPin,
    title: 'Location',
    value: 'San Francisco, CA',
    href: null,
    color: 'from-[#7C3AED] to-[#0072F5]',
  },
  {
    icon: Clock,
    title: 'Response Time',
    value: 'Within 24 hours',
    href: null,
    color: 'from-[#00C6FF] to-[#7C3AED]',
  },
]

const SOCIAL_LINKS = [
  {
    icon: Twitter,
    label: 'Twitter / X',
    href: 'https://twitter.com',
    handle: '@gcsc_protocol',
  },
  {
    icon: Linkedin,
    label: 'LinkedIn',
    href: 'https://linkedin.com',
    handle: 'GCSC Escrow Platform',
  },
  {
    icon: Github,
    label: 'GitHub',
    href: 'https://github.com',
    handle: 'gcsc-protocol',
  },
]

const FAQS = [
  {
    question: 'How quickly can I get started with GCSC?',
    answer:
      'Most contractors and homeowners can complete onboarding in under 10 minutes. Simply set up your account, verify your identity, and create your first escrow agreement. Our system handles the rest.',
  },
  {
    question: 'What payment infrastructure does GCSC use?',
    answer:
      'GCSC runs on the GCSC Network for zero transaction fees and instant processing. We are actively expanding our infrastructure to support additional payment networks and banking partners in 2025.',
  },
  {
    question: 'Is there a minimum project size for using GCSC escrow?',
    answer:
      'No minimum. Whether it is a $5,000 bathroom renovation or a $50M commercial build, GCSC scales to fit your needs. Our tiered pricing ensures small projects remain economical while large projects get enterprise-grade support.',
  },
]

/* ------------------------------------------------------------------ */
/*  TYPES                                                              */
/* ------------------------------------------------------------------ */

interface FormData {
  name: string
  email: string
  subject: string
  message: string
}

interface FormErrors {
  name?: string
  email?: string
  subject?: string
  message?: string
}

/* ------------------------------------------------------------------ */
/*  MAIN COMPONENT                                                     */
/* ------------------------------------------------------------------ */

export default function Contact() {
  const containerRef = useRef<HTMLDivElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const infoCardsRef = useRef<HTMLDivElement>(null)
  const socialRef = useRef<HTMLDivElement>(null)
  const faqRef = useRef<HTMLDivElement>(null)

  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    subject: '',
    message: '',
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitted, setSubmitted] = useState(false)

  /* ---- GSAP scroll animations ---- */
  useGSAP(
    () => {
      /* Hero headline */
      const heroTitle = containerRef.current?.querySelector('.hero-title')
      if (heroTitle) {
        gsap.from(heroTitle, {
          opacity: 0,
          y: 50,
          duration: 0.8,
          ease: 'cubic-bezier(0.16, 1, 0.3, 1)',
          delay: 0.2,
        })
      }

      const heroSub = containerRef.current?.querySelector('.hero-sub')
      if (heroSub) {
        gsap.from(heroSub, {
          opacity: 0,
          y: 30,
          duration: 0.8,
          ease: 'cubic-bezier(0.16, 1, 0.3, 1)',
          delay: 0.5,
        })
      }

      /* Form section */
      if (formRef.current) {
        gsap.from(formRef.current, {
          opacity: 0,
          y: 50,
          duration: 0.8,
          ease: 'cubic-bezier(0.16, 1, 0.3, 1)',
          scrollTrigger: {
            trigger: formRef.current,
            start: 'top 85%',
            toggleActions: 'play none none none',
          },
        })
      }

      /* Info cards */
      if (infoCardsRef.current) {
        const cards = infoCardsRef.current.querySelectorAll('.info-card')
        gsap.from(cards, {
          opacity: 0,
          y: 40,
          scale: 0.96,
          duration: 0.7,
          stagger: 0.1,
          ease: 'cubic-bezier(0.16, 1, 0.3, 1)',
          scrollTrigger: {
            trigger: infoCardsRef.current,
            start: 'top 85%',
            toggleActions: 'play none none none',
          },
        })
      }

      /* Social links */
      if (socialRef.current) {
        const items = socialRef.current.querySelectorAll('.social-item')
        gsap.from(items, {
          opacity: 0,
          y: 30,
          duration: 0.6,
          stagger: 0.08,
          ease: 'cubic-bezier(0.16, 1, 0.3, 1)',
          scrollTrigger: {
            trigger: socialRef.current,
            start: 'top 85%',
            toggleActions: 'play none none none',
          },
        })
      }

      /* FAQ items */
      if (faqRef.current) {
        const items = faqRef.current.querySelectorAll('.faq-item')
        gsap.from(items, {
          opacity: 0,
          y: 30,
          duration: 0.7,
          stagger: 0.12,
          ease: 'cubic-bezier(0.16, 1, 0.3, 1)',
          scrollTrigger: {
            trigger: faqRef.current,
            start: 'top 85%',
            toggleActions: 'play none none none',
          },
        })
      }
    },
    { scope: containerRef }
  )

  /* ---- Validation ---- */
  const validate = (): boolean => {
    const newErrors: FormErrors = {}
    if (!formData.name.trim()) newErrors.name = 'Name is required'
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email'
    }
    if (!formData.subject) newErrors.subject = 'Please select a subject'
    if (!formData.message.trim()) {
      newErrors.message = 'Message is required'
    } else if (formData.message.trim().length < 10) {
      newErrors.message = 'Message must be at least 10 characters'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  /* ---- Submit ---- */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validate()) {
      setSubmitted(true)
      setTimeout(() => {
        setFormData({ name: '', email: '', subject: '', message: '' })
        setSubmitted(false)
        setErrors({})
      }, 4000)
    }
  }

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
  }

  return (
    <div ref={containerRef} className="bg-void">
      {/* ============================================================ */}
      {/* HERO                                                          */}
      {/* ============================================================ */}
      <section className="relative min-h-[60dvh] md:min-h-[70dvh] flex flex-col items-center justify-center px-6 md:px-12 pt-[72px] overflow-hidden">
        <div
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: 'url(/bg_contact.webp)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: 0.16,
          }}
        />
        <div
          className="absolute inset-0 z-0"
          style={{
            background:
              'radial-gradient(ellipse at 30% 40%, rgba(0,114,245,0.12) 0%, transparent 60%), radial-gradient(ellipse at 70% 60%, rgba(124,58,237,0.08) 0%, transparent 60%)',
          }}
        />

        <div className="relative z-10 text-center max-w-[800px] mx-auto">
          <div className="gradient-badge inline-block mb-8">
            <DecryptText text="CONTACT US" delay={200} />
          </div>

          <h1
            className="hero-title font-display font-bold leading-[0.95] tracking-[-0.04em] brand-gradient-text"
            style={{ fontSize: 'clamp(56px, 8vw, 120px)' }}
          >
            Get in Touch
          </h1>

          <p
            className="hero-sub mt-8 text-muted-blue max-w-[560px] mx-auto leading-relaxed"
            style={{ fontSize: 'clamp(18px, 1.5vw, 22px)' }}
          >
            Have a question, partnership idea, or need enterprise support?
            We would love to hear from you. Our team is here to help.
          </p>
        </div>
      </section>

      {/* ============================================================ */}
      {/* FORM + INFO                                                   */}
      {/* ============================================================ */}
      <section className="relative py-[80px] md:py-[120px] px-6 md:px-12 border-t border-[rgba(91,110,138,0.08)]">
        <div className="max-w-[1280px] mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 lg:gap-16">
            {/* ---- Contact Form ---- */}
            <div className="lg:col-span-3">
              <div className="mb-8">
                <h2
                  className="font-display font-bold text-white tracking-[-0.02em]"
                  style={{ fontSize: 'clamp(28px, 3vw, 40px)' }}
                >
                  Send a Message
                </h2>
                <p className="mt-2 text-muted-blue text-sm">
                  Fill out the form below and we will get back to you within 24
                  hours.
                </p>
              </div>

              {submitted ? (
                /* Success message — glassmorphism */
                <div
                  className="flex flex-col items-center justify-center py-16 rounded-[20px] border border-[rgba(0,198,255,0.4)] backdrop-blur-sm transition-all duration-400 ease-out hover:-translate-y-3 hover:scale-[1.03] hover:shadow-[0_12px_40px_rgba(0,114,245,0.15)]"
                  style={{ background: 'linear-gradient(135deg, rgba(7,11,20,0.25) 0%, rgba(2,4,10,0.20) 100%)' }}
                  data-hover
                >
                  <CheckCircle2 className="w-16 h-16 text-[#00C6FF] mb-4" />
                  <h3 className="font-display font-bold text-white text-xl">
                    Message Sent!
                  </h3>
                  <p className="text-muted-blue text-sm mt-2 text-center max-w-[360px]">
                    Thank you for reaching out. Our team will review your
                    message and respond within 24 hours.
                  </p>
                </div>
              ) : (
                /* Form container — glassmorphism card */
                <div
                  className="rounded-2xl border border-[rgba(255,255,255,0.15)] backdrop-blur-sm transition-all duration-400 ease-out hover:border-[rgba(0,198,255,0.3)] p-6 md:p-8"
                  style={{ background: 'linear-gradient(135deg, rgba(7,11,20,0.25) 0%, rgba(2,4,10,0.20) 100%)' }}
                >
                  <form
                    ref={formRef}
                    onSubmit={handleSubmit}
                    className="space-y-6"
                    noValidate
                  >
                    {/* Name */}
                    <div>
                      <label className="block text-sm font-medium text-soft-white mb-2">
                        Name
                      </label>
                      <Input
                        type="text"
                        placeholder="Your full name"
                        value={formData.name}
                        onChange={(e) => handleChange('name', e.target.value)}
                        className={`h-12 rounded-xl bg-navy border-[rgba(91,110,138,0.2)] text-soft-white placeholder:text-muted-blue/50 focus:border-brand-blue focus:ring-[3px] focus:ring-[rgba(0,114,245,0.15)] transition-all ${
                          errors.name
                            ? 'border-red-500 focus:border-red-500'
                            : ''
                        }`}
                      />
                      {errors.name && (
                        <p className="mt-1.5 text-sm text-red-400 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          {errors.name}
                        </p>
                      )}
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-sm font-medium text-soft-white mb-2">
                        Email
                      </label>
                      <Input
                        type="email"
                        placeholder="you@example.com"
                        value={formData.email}
                        onChange={(e) => handleChange('email', e.target.value)}
                        className={`h-12 rounded-xl bg-navy border-[rgba(91,110,138,0.2)] text-soft-white placeholder:text-muted-blue/50 focus:border-brand-blue focus:ring-[3px] focus:ring-[rgba(0,114,245,0.15)] transition-all ${
                          errors.email
                            ? 'border-red-500 focus:border-red-500'
                            : ''
                        }`}
                      />
                      {errors.email && (
                        <p className="mt-1.5 text-sm text-red-400 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          {errors.email}
                        </p>
                      )}
                    </div>

                    {/* Subject dropdown */}
                    <div>
                      <label className="block text-sm font-medium text-soft-white mb-2">
                        Subject
                      </label>
                      <Select
                        value={formData.subject}
                        onValueChange={(value) =>
                          handleChange('subject', value)
                        }
                      >
                        <SelectTrigger
                          className={`h-12 w-full rounded-xl bg-navy border-[rgba(91,110,138,0.2)] text-soft-white focus:border-brand-blue focus:ring-[3px] focus:ring-[rgba(0,114,245,0.15)] ${
                            !formData.subject
                              ? 'text-muted-blue/50'
                              : 'text-soft-white'
                          } ${
                            errors.subject
                              ? 'border-red-500 focus:border-red-500'
                              : ''
                          }`}
                        >
                          <SelectValue placeholder="Select a topic" />
                        </SelectTrigger>
                        <SelectContent className="bg-navy border-[rgba(91,110,138,0.2)] rounded-xl">
                          {SUBJECTS.map((s) => (
                            <SelectItem
                              key={s.value}
                              value={s.value}
                              className="text-soft-white focus:bg-[rgba(0,114,245,0.1)] focus:text-soft-white rounded-lg"
                            >
                              {s.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.subject && (
                        <p className="mt-1.5 text-sm text-red-400 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          {errors.subject}
                        </p>
                      )}
                    </div>

                    {/* Message */}
                    <div>
                      <label className="block text-sm font-medium text-soft-white mb-2">
                        Message
                      </label>
                      <Textarea
                        placeholder="Tell us how we can help..."
                        value={formData.message}
                        onChange={(e) => handleChange('message', e.target.value)}
                        rows={6}
                        className={`rounded-xl bg-navy border-[rgba(91,110,138,0.2)] text-soft-white placeholder:text-muted-blue/50 focus:border-brand-blue focus:ring-[3px] focus:ring-[rgba(0,114,245,0.15)] resize-none transition-all ${
                          errors.message
                            ? 'border-red-500 focus:border-red-500'
                            : ''
                        }`}
                      />
                      {errors.message && (
                        <p className="mt-1.5 text-sm text-red-400 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          {errors.message}
                        </p>
                      )}
                    </div>

                    <Button
                      type="submit"
                      className="w-full h-12 rounded-xl brand-gradient text-white font-semibold text-base shadow-[0_4px_24px_rgba(0,114,245,0.3)] hover:shadow-[0_8px_40px_rgba(0,114,245,0.5)] transition-shadow cursor-pointer"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Send Message
                    </Button>
                  </form>
                </div>
              )}
            </div>

            {/* ---- Contact Info Sidebar ---- */}
            <div className="lg:col-span-2 space-y-8">
              <div>
                <h2
                  className="font-display font-bold text-white tracking-[-0.02em]"
                  style={{ fontSize: 'clamp(28px, 3vw, 40px)' }}
                >
                  Contact Info
                </h2>
                <p className="mt-2 text-muted-blue text-sm">
                  Reach out through any of these channels.
                </p>
              </div>

              {/* Info cards — glassmorphism */}
              <div ref={infoCardsRef} className="space-y-4">
                {CONTACT_INFO.map((info) => {
                  const Icon = info.icon
                  const inner = (
                    <div
                      className="info-card flex items-center gap-4 p-5 rounded-[16px] border border-[rgba(255,255,255,0.15)] backdrop-blur-sm transition-all duration-400 ease-out hover:-translate-y-3 hover:scale-[1.03] hover:border-[rgba(0,198,255,0.4)] hover:shadow-[0_12px_40px_rgba(0,114,245,0.15)] group"
                      style={{ background: 'linear-gradient(135deg, rgba(7,11,20,0.25) 0%, rgba(2,4,10,0.20) 100%)' }}
                      data-hover
                    >
                      <div
                        className={`w-12 h-12 rounded-xl bg-gradient-to-br ${info.color} flex items-center justify-center shrink-0 shadow-lg`}
                      >
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-[12px] font-medium uppercase tracking-[0.06em] text-muted-blue">
                          {info.title}
                        </p>
                        <p className="text-soft-white font-medium text-sm mt-0.5 group-hover:text-light-blue transition-colors">
                          {info.value}
                        </p>
                      </div>
                    </div>
                  )
                  return info.href ? (
                    <a
                      key={info.title}
                      href={info.href}
                      className="block"
                    >
                      {inner}
                    </a>
                  ) : (
                    <div key={info.title}>{inner}</div>
                  )
                })}
              </div>

              {/* Social links — glassmorphism */}
              <div ref={socialRef}>
                <p className="text-[12px] font-medium uppercase tracking-[0.06em] text-muted-blue mb-4">
                  Follow Us
                </p>
                <div className="space-y-3">
                  {SOCIAL_LINKS.map((social) => {
                    const Icon = social.icon
                    return (
                      <a
                        key={social.label}
                        href={social.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="social-item flex items-center gap-3 p-3 rounded-xl border border-[rgba(255,255,255,0.15)] backdrop-blur-sm transition-all duration-400 ease-out hover:-translate-y-3 hover:scale-[1.03] hover:border-[rgba(0,198,255,0.4)] hover:shadow-[0_12px_40px_rgba(0,114,245,0.15)] group"
                        style={{ background: 'linear-gradient(135deg, rgba(7,11,20,0.25) 0%, rgba(2,4,10,0.20) 100%)' }}
                        data-hover
                      >
                        <div className="w-10 h-10 rounded-lg bg-[rgba(91,110,138,0.1)] flex items-center justify-center group-hover:bg-[rgba(0,114,245,0.1)] transition-colors">
                          <Icon className="w-4 h-4 text-muted-blue group-hover:text-light-blue transition-colors" />
                        </div>
                        <div>
                          <p className="text-soft-white text-sm font-medium">
                            {social.label}
                          </p>
                          <p className="text-muted-blue text-xs">
                            {social.handle}
                          </p>
                        </div>
                      </a>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* FAQ                                                           */}
      {/* ============================================================ */}
      <section className="relative py-[80px] md:py-[120px] px-6 md:px-12 border-t border-[rgba(91,110,138,0.08)]">
        <div className="max-w-[800px] mx-auto">
          <div className="text-center mb-12">
            <div className="gradient-badge inline-block mb-6">
              <DecryptText text="FAQ" delay={0} trigger="inView" />
            </div>
            <h2
              className="font-display font-bold text-white leading-[1.0] tracking-[-0.03em]"
              style={{ fontSize: 'clamp(40px, 5vw, 72px)' }}
            >
              Common Questions
            </h2>
          </div>

          <div ref={faqRef} className="space-y-4">
            {FAQS.map((faq, i) => (
              <details
                key={i}
                className="faq-item group rounded-[16px] border border-[rgba(255,255,255,0.15)] backdrop-blur-sm transition-all duration-400 ease-out hover:-translate-y-3 hover:scale-[1.03] hover:border-[rgba(0,198,255,0.4)] hover:shadow-[0_12px_40px_rgba(0,114,245,0.15)] overflow-hidden cursor-pointer"
                style={{ background: 'linear-gradient(135deg, rgba(7,11,20,0.25) 0%, rgba(2,4,10,0.20) 100%)' }}
                data-hover
              >
                <summary className="flex items-center justify-between p-6 list-none select-none">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-lg bg-[rgba(0,114,245,0.1)] flex items-center justify-center shrink-0">
                      <HelpCircle className="w-4 h-4 text-light-blue" />
                    </div>
                    <span className="font-display font-semibold text-white text-base pr-4">
                      {faq.question}
                    </span>
                  </div>
                  <ChevronDown className="w-5 h-5 text-muted-blue group-open:rotate-180 transition-transform duration-300 shrink-0" />
                </summary>
                <div className="px-6 pb-6 pt-0 ml-12">
                  <p className="text-muted-blue text-sm leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              </details>
            ))}
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
          <Globe className="w-12 h-12 text-light-blue mx-auto mb-6 opacity-60" />
          <h2
            className="font-display font-bold leading-[1.0] tracking-[-0.03em] brand-gradient-text"
            style={{ fontSize: 'clamp(36px, 4vw, 64px)' }}
          >
            Ready to Transform Your Payments?
          </h2>
          <p className="mt-6 text-muted-blue text-base max-w-[500px] mx-auto leading-relaxed">
            Join hundreds of contractors and homeowners already using GCSC to
            secure their construction projects with digital escrow.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4 flex-wrap">
            <MagneticButton variant="primary" to="/dashboard">
              Launch App
            </MagneticButton>
            <MagneticButton variant="secondary" to="/about">
              Learn More
            </MagneticButton>
          </div>
        </div>
      </section>
    </div>
  )
}

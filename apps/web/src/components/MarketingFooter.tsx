import { useRef, useEffect, useState } from 'react'
import { Link } from 'react-router'
import { motion } from 'framer-motion'

const PRODUCT_LINKS = [
  { label: 'Features', href: '/' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Security', href: '/security' },
  { label: 'Dashboard', href: '/dashboard' },
]

const COMPANY_LINKS = [
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
]

const LEGAL_LINKS = [
  { label: 'Terms of Service', href: '/contact' },
  { label: 'Privacy Policy', href: '/contact' },
  { label: 'Cookie Policy', href: '/contact' },
]

export default function MarketingFooter() {
  const ref = useRef<HTMLElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (!ref.current) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.1 }
    )
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  const columnVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
    }),
  }

  return (
    <footer
      ref={ref}
      className="w-full bg-void border-t border-[rgba(91,110,138,0.08)] pt-20 pb-10 px-6 md:px-12"
    >
      <div className="max-w-[1280px] mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 md:gap-8">
          <motion.div
            custom={0}
            initial="hidden"
            animate={isVisible ? 'visible' : 'hidden'}
            variants={columnVariants}
            className="col-span-2 md:col-span-1"
          >
            <Link to="/" className="flex flex-col items-start">
              <span className="font-display text-xl font-bold brand-gradient-text leading-none">
                GCSC
              </span>
              <span className="text-[10px] font-mono font-medium tracking-[0.12em] text-muted-blue uppercase leading-none mt-0.5">
                SMART CONTRACTOR
              </span>
            </Link>
            <p className="mt-4 text-sm text-soft-white/50 max-w-[280px] leading-relaxed">
              Secure construction escrow. Milestone payments, verified contractors, and protected project agreements.
            </p>
            <div className="flex items-center gap-4 mt-6">
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-blue hover:text-soft-white hover:scale-110 transition-all duration-200"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-blue hover:text-soft-white hover:scale-110 transition-all duration-200"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </a>
            </div>
          </motion.div>

          <motion.div
            custom={1}
            initial="hidden"
            animate={isVisible ? 'visible' : 'hidden'}
            variants={columnVariants}
          >
            <h4 className="text-xs font-mono font-medium tracking-[0.12em] text-muted-blue uppercase mb-5">
              Product
            </h4>
            <ul className="space-y-3">
              {PRODUCT_LINKS.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.href}
                    className="text-sm text-soft-white/60 hover:text-soft-white hover:translate-x-1 transition-all duration-200 inline-block"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            custom={2}
            initial="hidden"
            animate={isVisible ? 'visible' : 'hidden'}
            variants={columnVariants}
          >
            <h4 className="text-xs font-mono font-medium tracking-[0.12em] text-muted-blue uppercase mb-5">
              Company
            </h4>
            <ul className="space-y-3">
              {COMPANY_LINKS.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.href}
                    className="text-sm text-soft-white/60 hover:text-soft-white hover:translate-x-1 transition-all duration-200 inline-block"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            custom={3}
            initial="hidden"
            animate={isVisible ? 'visible' : 'hidden'}
            variants={columnVariants}
          >
            <h4 className="text-xs font-mono font-medium tracking-[0.12em] text-muted-blue uppercase mb-5">
              Legal
            </h4>
            <ul className="space-y-3">
              {LEGAL_LINKS.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.href}
                    className="text-sm text-soft-white/60 hover:text-soft-white hover:translate-x-1 transition-all duration-200 inline-block"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={isVisible ? { opacity: 1 } : { opacity: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="mt-16 pt-6 border-t border-[rgba(91,110,138,0.06)] flex flex-col sm:flex-row items-center justify-between gap-4"
        >
          <p className="text-sm text-soft-white/40">
            &copy; 2026 GCSC Smart Contractor. All rights reserved.
          </p>
          <div className="flex items-center gap-2 text-sm text-muted-blue">
            <span>Secure Escrow Infrastructure</span>
          </div>
        </motion.div>
      </div>
    </footer>
  )
}

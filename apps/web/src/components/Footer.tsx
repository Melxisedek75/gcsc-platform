import { Link } from 'react-router'
import { X, Linkedin, MessageCircle, Github } from 'lucide-react'

const productLinks = [
  { label: 'Features', path: '/#features' },
  { label: 'Pricing', path: '/pricing' },
  { label: 'Security', path: '/security' },
  { label: 'API', path: '/#api' },
]

const companyLinks = [
  { label: 'About', path: '/about' },
  { label: 'Careers', path: '/#careers' },
  { label: 'Blog', path: '/#blog' },
  { label: 'Contact', path: '/contact' },
]

const legalLinks = [
  { label: 'Terms of Service', path: '/#terms' },
  { label: 'Privacy Policy', path: '/#privacy' },
  { label: 'Cookie Policy', path: '/#cookies' },
]

const socialLinks = [
  { icon: X, label: 'X (Twitter)', href: '#' },
  { icon: Linkedin, label: 'LinkedIn', href: '#' },
  { icon: MessageCircle, label: 'Discord', href: '#' },
  { icon: Github, label: 'GitHub', href: '#' },
]

export default function Footer() {
  return (
    <footer className="w-full bg-white border-t" style={{ borderColor: 'rgba(123,47,247,0.12)' }}>
      <div className="mx-auto max-w-container container-padding pt-20 pb-10">
        {/* 4-column grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8 mb-16">
          {/* Brand column */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Link to="/" className="inline-flex items-center gap-2 mb-4">
              <img
                src="/gcsc-logo-round-64.png"
                alt="GCSC Smart Contract"
                className="w-12 h-12 rounded-full object-cover brand-logo-wave"
              />
            </Link>
            <p className="font-inter text-body-sm text-[#475569] leading-body-sm mb-6 max-w-[260px]">
              Blockchain-powered construction escrow. Secure payments, verified contractors, immutable trust.
            </p>
            <div className="flex items-center gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  className="w-10 h-10 flex items-center justify-center rounded-lg border text-[#475569] hover:text-violet hover:border-violet/40 hover:scale-[1.15] transition-all duration-300"
                  style={{ borderColor: 'rgba(123,47,247,0.2)' }}
                >
                  <social.icon size={18} />
                </a>
              ))}
            </div>
          </div>

          {/* Product column */}
          <div>
            <h4 className="font-outfit font-semibold text-label gradient-text uppercase tracking-label mb-5">
              Product
            </h4>
            <ul className="flex flex-col gap-3">
              {productLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.path}
                    className="font-inter text-body-sm text-[#475569] hover:text-[#0F172A] hover:translate-x-1 inline-block transition-all duration-200"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company column */}
          <div>
            <h4 className="font-outfit font-semibold text-label gradient-text uppercase tracking-label mb-5">
              Company
            </h4>
            <ul className="flex flex-col gap-3">
              {companyLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.path}
                    className="font-inter text-body-sm text-[#475569] hover:text-[#0F172A] hover:translate-x-1 inline-block transition-all duration-200"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal + Connect column */}
          <div>
            <h4 className="font-outfit font-semibold text-label gradient-text uppercase tracking-label mb-5">
              Legal
            </h4>
            <ul className="flex flex-col gap-3 mb-8">
              {legalLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.path}
                    className="font-inter text-body-sm text-[#475569] hover:text-[#0F172A] hover:translate-x-1 inline-block transition-all duration-200"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
            <h4 className="font-outfit font-semibold text-label gradient-text uppercase tracking-label mb-5">
              Connect
            </h4>
            <ul className="flex flex-col gap-3">
              {socialLinks.slice(0, 2).map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="font-inter text-body-sm text-[#475569] hover:text-[#0F172A] hover:translate-x-1 inline-block transition-all duration-200"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 border-t"
          style={{ borderColor: 'rgba(123,47,247,0.08)' }}
        >
          <p className="font-inter text-[0.8125rem] text-[#94A3B8]">
            &copy; 2026 GCSC Smart Contract. All rights reserved.
          </p>
          <p className="font-inter text-[0.8125rem] text-[#94A3B8]">
            Built on XPR Network &middot; Secured by Blockchain
          </p>
        </div>
      </div>
    </footer>
  )
}

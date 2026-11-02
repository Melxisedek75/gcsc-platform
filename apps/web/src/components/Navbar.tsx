import { useState, useEffect } from 'react'
import { Link } from 'react-router'
import { Menu, X } from 'lucide-react'

const navLinks = [
  { label: 'Home', path: '/' },
  { label: 'Pricing', path: '/pricing' },
  { label: 'About', path: '/about' },
  { label: 'Contact', path: '/contact' },
  { label: 'Security', path: '/security' },
  { label: 'Token', path: '/token' },
  { label: 'Wallet', path: '/wallet' },
]

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  return (
    <nav
      className="sticky top-0 left-0 right-0 z-50 transition-all duration-300 bg-[#0A1633]/90 backdrop-blur-xl border-b border-white/10"
    >
      <div className="mx-auto max-w-container container-padding">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center h-[72px]">
          <Link to="/" className="flex items-center" aria-label="GCSC home">
            <img src="/gcsc-logo-round-64.png" alt="GCSC Smart Contract" className="h-10 w-10 rounded-full object-cover" />
          </Link>
          {/* Desktop Nav Links */}
          <div className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className="relative font-inter font-medium text-nav text-[#A9BCD6] hover:text-white transition-colors duration-200"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop CTA */}
          <div className="hidden lg:flex justify-end">
            <Link
              to="/dashboard"
              className="inline-flex items-center justify-center gradient-primary text-white font-inter font-semibold text-[0.875rem] px-6 py-2.5 rounded-full hover:scale-[1.04] hover:shadow-glow transition-all duration-300"
              style={{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
            >
              Dashboard
            </Link>
          </div>

          {/* Mobile Hamburger */}
          <button
            className="lg:hidden relative z-50 col-start-3 justify-self-end w-10 h-10 flex items-center justify-center text-white"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle menu"
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Overlay Menu */}
      <div
        className="lg:hidden fixed inset-0 top-[72px] bg-[#020612] transition-all duration-500"
        style={{
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
          transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <div className="flex flex-col items-center justify-center gap-8 pt-16">
          {navLinks.map((link, index) => (
            <Link
              key={link.path}
              to={link.path}
              onClick={() => setIsOpen(false)}
              className="font-outfit font-semibold text-[1.75rem] text-white hover:text-violet transition-colors duration-200"
              style={{
                opacity: isOpen ? 1 : 0,
                transform: isOpen ? 'translateY(0)' : 'translateY(20px)',
                transition: `all 0.4s cubic-bezier(0.16, 1, 0.3, 1) ${index * 0.08 + 0.1}s`,
              }}
            >
              {link.label}
            </Link>
          ))}
          <Link
            to="/dashboard"
            onClick={() => setIsOpen(false)}
            className="mt-4 inline-flex items-center justify-center gradient-primary text-white font-inter font-semibold text-[1rem] px-8 py-3.5 rounded-full"
            style={{
              opacity: isOpen ? 1 : 0,
              transform: isOpen ? 'translateY(0)' : 'translateY(20px)',
              transition: `all 0.4s cubic-bezier(0.16, 1, 0.3, 1) ${navLinks.length * 0.08 + 0.1}s`,
            }}
          >
            Dashboard
          </Link>
        </div>
      </div>
    </nav>
  )
}

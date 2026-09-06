import { useEffect, useRef, type ReactNode } from 'react'
import { useLocation } from 'react-router'
import Lenis from 'lenis'
import MarketingNavbar from './MarketingNavbar'
import MarketingFooter from './MarketingFooter'

export default function MarketingLayout({ children }: { children: ReactNode }) {
  const lenisRef = useRef<Lenis | null>(null)
  const location = useLocation()

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    })
    lenisRef.current = lenis

    function raf(time: number) {
      lenis.raf(time)
      requestAnimationFrame(raf)
    }
    requestAnimationFrame(raf)

    return () => {
      lenis.destroy()
    }
  }, [])

  useEffect(() => {
    window.scrollTo(0, 0)
    lenisRef.current?.scrollTo(0, { immediate: true })
  }, [location.pathname])

  return (
    <div className="relative min-h-[100dvh] bg-void">
      <MarketingNavbar />
      <main>{children}</main>
      <MarketingFooter />
    </div>
  )
}

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useRef, type ReactNode, type CSSProperties } from 'react'
import { motion, useMotionValue, useSpring } from 'framer-motion'
import { Link } from 'react-router'

const MotionLink = motion.create(Link)

interface MagneticButtonProps {
  children: ReactNode
  className?: string
  onClick?: () => void
  variant?: 'primary' | 'secondary'
  size?: 'default' | 'compact' | 'large'
  style?: CSSProperties
  href?: string
  to?: string
}

export default function MagneticButton({
  children,
  className = '',
  onClick,
  variant = 'primary',
  size = 'default',
  style,
  href,
  to,
}: MagneticButtonProps) {
  const ref = useRef<HTMLButtonElement | HTMLAnchorElement>(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const springX = useSpring(x, { stiffness: 150, damping: 15 })
  const springY = useSpring(y, { stiffness: 150, damping: 15 })

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    const distX = e.clientX - centerX
    const distY = e.clientY - centerY
    const dist = Math.sqrt(distX * distX + distY * distY)
    const maxDist = 100
    if (dist < maxDist) {
      const factor = 0.15
      x.set(distX * factor)
      y.set(distY * factor)
    }
  }

  const handleMouseLeave = () => {
    x.set(0)
    y.set(0)
  }

  const sizeClasses = {
    compact: 'px-6 py-3 text-sm',
    default: 'px-9 py-4 text-base',
    large: 'px-12 py-5 text-lg',
  }

  const baseClasses = `
    inline-flex items-center justify-center font-semibold rounded-xl
    transition-shadow duration-300 cursor-pointer select-none
    ${sizeClasses[size]}
  `

  const variantClasses = {
    primary: `
      brand-gradient text-white
      shadow-[0_4px_24px_rgba(0,114,245,0.3)]
      hover:shadow-[0_8px_40px_rgba(0,114,245,0.5)]
      active:scale-[0.98]
    `,
    secondary: `
      bg-transparent border border-[rgba(226,232,240,0.2)]
      text-soft-white
      hover:border-[rgba(0,114,245,0.6)] hover:bg-[rgba(0,114,245,0.08)]
      active:scale-[0.98]
    `,
  }

  const classes = `${baseClasses} ${variantClasses[variant]} ${className}`.trim()

  const motionProps = {
    ref: ref as React.RefObject<HTMLButtonElement & HTMLAnchorElement>,
    style: { x: springX, y: springY, ...style },
    onMouseMove: handleMouseMove,
    onMouseLeave: handleMouseLeave,
    onClick,
    className: classes,
    whileHover: { scale: 1.02 },
    whileTap: { scale: 0.98 },
  }

  if (to) {
    return (
      <MotionLink
        {...(motionProps as any)}
        to={to}
        ref={ref as React.RefObject<HTMLAnchorElement>}
      >
        {children}
      </MotionLink>
    )
  }

  if (href) {
    return (
      <motion.a
        {...(motionProps as any)}
        href={href}
        ref={ref as React.RefObject<HTMLAnchorElement>}
      >
        {children}
      </motion.a>
    )
  }

  return (
    <motion.button
      {...(motionProps as any)}
      ref={ref as React.RefObject<HTMLButtonElement>}
    >
      {children}
    </motion.button>
  )
}

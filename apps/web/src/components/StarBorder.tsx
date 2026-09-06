import { type ReactNode, useState } from 'react'

interface StarBorderProps {
  children: ReactNode
  className?: string
  speed?: number
}

export default function StarBorder({ children, className = '', speed = 4 }: StarBorderProps) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      className={`relative rounded-[20px] p-[1px] overflow-hidden ${className}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className="absolute inset-0 z-0"
        style={{
          background: 'conic-gradient(from 0deg, #0072F5, #7C3AED, #00C6FF, #0072F5)',
          animation: `spin ${hovered ? speed / 2 : speed}s linear infinite`,
          opacity: 0.7,
        }}
      />
      <div className="relative z-10 bg-deep-navy rounded-[19px] h-full backdrop-blur-xl">
        {children}
      </div>
    </div>
  )
}

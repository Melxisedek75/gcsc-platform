import { useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'

interface DecryptTextProps {
  text: string
  className?: string
  delay?: number
  duration?: number
  trigger?: 'mount' | 'inView'
}

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'

export default function DecryptText({
  text,
  className = '',
  delay = 0,
  duration = 1500,
  trigger = 'mount',
}: DecryptTextProps) {
  const [display, setDisplay] = useState(text)
  const [hasTriggered, setHasTriggered] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const startAnimation = useCallback(() => {
    if (hasTriggered) return
    setHasTriggered(true)

    const staggerPerChar = 40
    const scrambleDuration = 400
    const totalDuration = duration

    const startTime = Date.now() + delay

    const tick = () => {
      const now = Date.now()
      const elapsed = now - startTime

      if (elapsed < 0) {
        requestAnimationFrame(tick)
        return
      }

      let result = ''
      let allResolved = true

      for (let i = 0; i < text.length; i++) {
        const charDelay = i * staggerPerChar
        const charElapsed = elapsed - charDelay

        if (text[i] === ' ') {
          result += ' '
          continue
        }

        if (charElapsed < 0) {
          result += CHARS[Math.floor(Math.random() * CHARS.length)]
          allResolved = false
        } else if (charElapsed < scrambleDuration) {
          if (Math.random() > charElapsed / scrambleDuration) {
            result += CHARS[Math.floor(Math.random() * CHARS.length)]
            allResolved = false
          } else {
            result += text[i]
          }
        } else {
          result += text[i]
        }
      }

      setDisplay(result)

      if (!allResolved && elapsed < totalDuration + text.length * staggerPerChar) {
        requestAnimationFrame(tick)
      } else {
        setDisplay(text)
      }
    }

    const timeout = setTimeout(() => {
      requestAnimationFrame(tick)
    }, delay)

    return () => clearTimeout(timeout)
  }, [text, delay, duration, hasTriggered])

  useEffect(() => {
    if (trigger === 'mount') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      const cleanup = startAnimation()
      return cleanup
    }

    if (trigger === 'inView' && ref.current) {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            startAnimation()
            observer.disconnect()
          }
        },
        { threshold: 0.5 }
      )
      observer.observe(ref.current)
      return () => observer.disconnect()
    }
  }, [trigger, startAnimation])

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  return (
    <motion.span
      ref={ref}
      className={className}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay: delay / 1000 }}
    >
      {display}
    </motion.span>
  )
}

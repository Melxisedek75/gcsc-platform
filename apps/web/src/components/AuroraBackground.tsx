import { useRef, useEffect } from 'react'

export default function AuroraBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let width = 0
    let height = 0
    let time = 0

    const resize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect()
      if (!rect) return
      width = rect.width
      height = rect.height
      canvas.width = width * Math.min(window.devicePixelRatio, 2)
      canvas.height = height * Math.min(window.devicePixelRatio, 2)
      ctx.scale(Math.min(window.devicePixelRatio, 2), Math.min(window.devicePixelRatio, 2))
    }

    resize()
    window.addEventListener('resize', resize)

    const draw = () => {
      time += 0.0003
      ctx.clearRect(0, 0, width, height)

      const cx1 = width * (0.3 + Math.sin(time) * 0.15)
      const cy1 = height * (0.4 + Math.cos(time * 0.7) * 0.1)
      const cx2 = width * (0.7 + Math.cos(time * 0.8) * 0.1)
      const cy2 = height * (0.5 + Math.sin(time * 0.5) * 0.15)
      const cx3 = width * (0.5 + Math.sin(time * 1.2) * 0.1)
      const cy3 = height * (0.6 + Math.cos(time * 0.9) * 0.1)

      const r = Math.max(width, height) * 0.5

      const g1 = ctx.createRadialGradient(cx1, cy1, 0, cx1, cy1, r)
      g1.addColorStop(0, 'rgba(0, 198, 255, 0.4)')
      g1.addColorStop(1, 'rgba(0, 198, 255, 0)')

      const g2 = ctx.createRadialGradient(cx2, cy2, 0, cx2, cy2, r)
      g2.addColorStop(0, 'rgba(124, 58, 237, 0.35)')
      g2.addColorStop(1, 'rgba(124, 58, 237, 0)')

      const g3 = ctx.createRadialGradient(cx3, cy3, 0, cx3, cy3, r * 0.8)
      g3.addColorStop(0, 'rgba(76, 29, 149, 0.25)')
      g3.addColorStop(1, 'rgba(76, 29, 149, 0)')

      ctx.fillStyle = g1
      ctx.fillRect(0, 0, width, height)
      ctx.fillStyle = g2
      ctx.fillRect(0, 0, width, height)
      ctx.fillStyle = g3
      ctx.fillRect(0, 0, width, height)

      animRef.current = requestAnimationFrame(draw)
    }

    animRef.current = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(animRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        filter: 'blur(120px)',
        opacity: 0.6,
        pointerEvents: 'none',
      }}
    />
  )
}

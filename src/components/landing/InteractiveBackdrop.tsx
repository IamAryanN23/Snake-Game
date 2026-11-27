import { useEffect, useRef } from 'react'
import { usePrefersReducedMotion } from './usePrefersReducedMotion.ts'

const DOT_SPACING = 24
const INFLUENCE_RADIUS = 150

export function InteractiveBackdrop() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const reducedMotion = usePrefersReducedMotion()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      return
    }

    let width = 0
    let height = 0
    let dpr = 1
    let rafId = 0
    let pointerX = -9999
    let pointerY = -9999
    let smoothX = -9999
    let smoothY = -9999
    let lastTime = performance.now()
    let hasMoved = false

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const onPointerMove = (e: PointerEvent) => {
      pointerX = e.clientX
      pointerY = e.clientY
      if (!hasMoved) {
        smoothX = pointerX
        smoothY = pointerY
        hasMoved = true
      }
    }

    const onPointerLeave = () => {
      pointerX = -9999
      pointerY = -9999
    }

    const drawFrame = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000)
      lastTime = now

      if (!reducedMotion && hasMoved) {
        const lerp = 1 - Math.exp(-dt * 12)
        smoothX += (pointerX - smoothX) * lerp
        smoothY += (pointerY - smoothY) * lerp
      }

      ctx.clearRect(0, 0, width, height)

      const cols = Math.ceil(width / DOT_SPACING) + 1
      const rows = Math.ceil(height / DOT_SPACING) + 1

      for (let r = 0; r < rows; r += 1) {
        const y = r * DOT_SPACING
        for (let c = 0; c < cols; c += 1) {
          const x = c * DOT_SPACING
          let boost = 0

          if (!reducedMotion && smoothX > -500) {
            const dist = Math.hypot(x - smoothX, y - smoothY)
            if (dist < INFLUENCE_RADIUS) {
              const t = 1 - dist / INFLUENCE_RADIUS
              boost = t * t
            }
          }

          const radius = 1 + boost * 1.35
          const alpha = 0.08 + boost * 0.28
          ctx.fillStyle = boost > 0.2 ? `rgba(142, 247, 67, ${alpha})` : `rgba(154, 214, 178, ${alpha})`
          ctx.beginPath()
          ctx.arc(x, y, radius, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      if (!reducedMotion) {
        rafId = window.requestAnimationFrame(drawFrame)
      }
    }

    resize()
    window.addEventListener('resize', resize)
    window.addEventListener('pointermove', onPointerMove, { passive: true })
    window.addEventListener('pointerleave', onPointerLeave)

    if (reducedMotion) {
      drawFrame(performance.now())
    } else {
      rafId = window.requestAnimationFrame(drawFrame)
    }

    return () => {
      window.cancelAnimationFrame(rafId)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerleave', onPointerLeave)
    }
  }, [reducedMotion])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0"
    />
  )
}

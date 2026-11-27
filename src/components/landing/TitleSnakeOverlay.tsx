import { useEffect, useRef, useState } from 'react'
import type { SpeedPreset } from '../../game/engine/types.ts'
import { usePrefersReducedMotion } from './usePrefersReducedMotion.ts'

interface TitleSnakeOverlayProps {
  readonly speedPreset: SpeedPreset
}

const LETTERS = ['S', 'N', 'A', 'K', 'E'] as const

const SLITHER_SPEED: Record<SpeedPreset, number> = {
  relaxed: 0.14,
  standard: 0.22,
  turbo: 0.34,
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  color: string
}

interface PathSample {
  x: number
  y: number
  tx: number
  ty: number
  front: boolean
}

const CANVAS_PAD_X = 28
const CANVAS_PAD_Y = 24
const SEGMENT_COUNT = 18
const SEGMENT_SPACING = 0.0115

/**
 * Evaluates a smooth closed weaving loop around the measured heading box.
 * The loop travels clockwise around the perimeter with a gentle vertical wave
 * so it dips behind and in front of letters for subtle 3D depth.
 */
function sampleLoop(tNorm: number, boxW: number, boxH: number): PathSample {
  const t = ((tNorm % 1) + 1) % 1
  const angle = t * Math.PI * 2

  const rx = boxW * 0.53
  const ry = boxH * 0.56
  const cx = CANVAS_PAD_X + boxW / 2
  const cy = CANVAS_PAD_Y + boxH / 2

  // Superellipse-like rounded rectangle perimeter + gentle 3-lobe weave
  const cosA = Math.cos(angle)
  const sinA = Math.sin(angle)
  const signX = Math.sign(cosA)
  const signY = Math.sign(sinA)
  const p = 0.62

  const x = cx + signX * Math.pow(Math.abs(cosA), p) * rx
  const y =
    cy +
    signY * Math.pow(Math.abs(sinA), p) * ry +
    Math.sin(angle * 3) * (boxH * 0.08)

  // Finite-difference tangent for smooth eye/head orientation
  const eps = 0.002
  const a2 = ((t + eps) % 1) * Math.PI * 2
  const c2 = Math.cos(a2)
  const s2 = Math.sin(a2)
  const x2 = cx + Math.sign(c2) * Math.pow(Math.abs(c2), p) * rx
  const y2 =
    cy +
    Math.sign(s2) * Math.pow(Math.abs(s2), p) * ry +
    Math.sin(a2 * 3) * (boxH * 0.08)

  const dx = x2 - x
  const dy = y2 - y
  const len = Math.hypot(dx, dy) || 1

  // Alternate front/back depth smoothly around the perimeter
  const front = Math.sin(angle * 2 + 0.6) > -0.05

  return { x, y, tx: dx / len, ty: dy / len, front }
}

export function TitleSnakeOverlay({ speedPreset }: TitleSnakeOverlayProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const headingRef = useRef<HTMLHeadingElement | null>(null)
  const backCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const frontCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const letterRefs = useRef<(HTMLSpanElement | null)[]>([])
  const speedRef = useRef<SpeedPreset>(speedPreset)
  const reducedMotion = usePrefersReducedMotion()
  const [pulsingIndex, setPulsingIndex] = useState<number | null>(null)

  useEffect(() => {
    speedRef.current = speedPreset
  }, [speedPreset])

  useEffect(() => {
    const container = containerRef.current
    const heading = headingRef.current
    const backCanvas = backCanvasRef.current
    const frontCanvas = frontCanvasRef.current
    if (!container || !heading || !backCanvas || !frontCanvas) {
      return
    }
    const backCtx = backCanvas.getContext('2d')
    const frontCtx = frontCanvas.getContext('2d')
    if (!backCtx || !frontCtx) {
      return
    }

    let boxW = heading.offsetWidth || 280
    let boxH = heading.offsetHeight || 88
    let dpr = 1

    const syncSize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      boxW = heading.offsetWidth || 280
      boxH = heading.offsetHeight || 88
      const totalW = boxW + CANVAS_PAD_X * 2
      const totalH = boxH + CANVAS_PAD_Y * 2

      for (const canvas of [backCanvas, frontCanvas]) {
        canvas.width = Math.floor(totalW * dpr)
        canvas.height = Math.floor(totalH * dpr)
        canvas.style.width = `${totalW}px`
        canvas.style.height = `${totalH}px`
      }
      backCtx.setTransform(dpr, 0, 0, dpr, 0, 0)
      frontCtx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    syncSize()
    const resizeObserver = new ResizeObserver(syncSize)
    resizeObserver.observe(heading)
    window.addEventListener('resize', syncSize)

    let headProgress = 0.08
    let foodProgress: number | null = 0.42
    let foodCooldown = 0
    let pulseClock = 0
    let particles: Particle[] = []
    let cursorLocal: { x: number; y: number } | null = null
    let cursorNear = false
    let rafId = 0
    let lastTime = performance.now()
    let pulseTimer: number | null = null

    const onPointerMove = (e: PointerEvent) => {
      const rect = backCanvas.getBoundingClientRect()
      const lx = e.clientX - rect.left
      const ly = e.clientY - rect.top
      cursorLocal = { x: lx, y: ly }
      const margin = 70
      cursorNear =
        lx >= -margin &&
        lx <= rect.width + margin &&
        ly >= -margin &&
        ly <= rect.height + margin
    }

    const onPointerLeave = () => {
      cursorNear = false
      cursorLocal = null
    }

    window.addEventListener('pointermove', onPointerMove, { passive: true })
    window.addEventListener('pointerleave', onPointerLeave)

    const triggerNearestLetterPulse = (canvasX: number, canvasY: number) => {
      const canvasRect = backCanvas.getBoundingClientRect()
      const targetClientX = canvasRect.left + canvasX
      const targetClientY = canvasRect.top + canvasY
      let bestIdx = 0
      let bestDist = Infinity

      letterRefs.current.forEach((el, idx) => {
        if (!el) return
        const r = el.getBoundingClientRect()
        const cx = r.left + r.width / 2
        const cy = r.top + r.height / 2
        const d = Math.hypot(cx - targetClientX, cy - targetClientY)
        if (d < bestDist) {
          bestDist = d
          bestIdx = idx
        }
      })

      setPulsingIndex(bestIdx)
      if (pulseTimer !== null) {
        window.clearTimeout(pulseTimer)
      }
      pulseTimer = window.setTimeout(() => {
        setPulsingIndex(null)
      }, 280)
    }

    const drawFrame = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000)
      lastTime = now
      pulseClock += dt

      const totalW = boxW + CANVAS_PAD_X * 2
      const totalH = boxH + CANVAS_PAD_Y * 2

      if (!reducedMotion) {
        const baseSpeed = SLITHER_SPEED[speedRef.current]
        const speedBoost = cursorNear ? 1.24 : 1
        const prevProgress = headProgress
        headProgress = (headProgress + baseSpeed * speedBoost * dt) % 1

        if (foodProgress !== null) {
          const distWrapped = Math.min(
            Math.abs(headProgress - foodProgress),
            1 - Math.abs(headProgress - foodProgress),
          )
          const crossed =
            prevProgress < foodProgress && headProgress >= foodProgress
          if (distWrapped < 0.018 || crossed) {
            const fp = sampleLoop(foodProgress, boxW, boxH)
            for (let i = 0; i < 10; i += 1) {
              const ang = (Math.PI * 2 * i) / 10 + Math.random() * 0.3
              const spd = 45 + Math.random() * 65
              particles.push({
                x: fp.x,
                y: fp.y,
                vx: Math.cos(ang) * spd,
                vy: Math.sin(ang) * spd,
                life: 0,
                maxLife: 0.36,
                color: i % 3 === 0 ? '#2ce6d6' : '#ff6b4a',
              })
            }
            triggerNearestLetterPulse(fp.x, fp.y)
            foodProgress = null
            foodCooldown = 1.8
          }
        } else {
          foodCooldown -= dt
          if (foodCooldown <= 0) {
            foodProgress = (headProgress + 0.36 + Math.random() * 0.25) % 1
          }
        }

        if (particles.length > 0) {
          particles = particles
            .map((p) => ({
              ...p,
              x: p.x + p.vx * dt,
              y: p.y + p.vy * dt,
              vx: p.vx * 0.93,
              vy: p.vy * 0.93,
              life: p.life + dt,
            }))
            .filter((p) => p.life < p.maxLife)
        }
      }

      backCtx.clearRect(0, 0, totalW, totalH)
      frontCtx.clearRect(0, 0, totalW, totalH)

      // Draw food dot on its appropriate depth layer
      if (foodProgress !== null) {
        const foodPt = sampleLoop(foodProgress, boxW, boxH)
        const fCtx = foodPt.front ? frontCtx : backCtx
        const pulse = reducedMotion ? 0 : Math.sin(pulseClock * 5)
        fCtx.fillStyle = 'rgba(255, 107, 74, 0.22)'
        fCtx.beginPath()
        fCtx.arc(foodPt.x, foodPt.y, 9 + pulse * 1.6, 0, Math.PI * 2)
        fCtx.fill()

        fCtx.fillStyle = '#ff6b4a'
        fCtx.beginPath()
        fCtx.arc(foodPt.x, foodPt.y, 4.4 + pulse * 0.4, 0, Math.PI * 2)
        fCtx.fill()
      }

      // Draw particles on front canvas for crisp pop
      for (const p of particles) {
        const alpha = 1 - p.life / p.maxLife
        frontCtx.globalAlpha = alpha
        frontCtx.fillStyle = p.color
        frontCtx.beginPath()
        frontCtx.arc(p.x, p.y, 2.4 * alpha, 0, Math.PI * 2)
        frontCtx.fill()
      }
      frontCtx.globalAlpha = 1

      // Sample snake segments tail -> head
      const samples: PathSample[] = []
      for (let i = 0; i < SEGMENT_COUNT; i += 1) {
        samples.push(sampleLoop(headProgress - i * SEGMENT_SPACING, boxW, boxH))
      }

      for (let i = samples.length - 1; i >= 0; i -= 1) {
        const t = i / (samples.length - 1)
        const s = samples[i]
        const ctx = s.front ? frontCtx : backCtx
        const radius = i === 0 ? 6.8 : 6.4 * (1 - t * 0.42)
        const color = i === 0 ? '#9eff52' : t < 0.45 ? '#7ef03b' : '#3ba84b'

        if (i === 0) {
          ctx.fillStyle = 'rgba(142, 247, 67, 0.18)'
          ctx.beginPath()
          ctx.arc(s.x, s.y, radius * 1.7, 0, Math.PI * 2)
          ctx.fill()
        }

        if (i > 0) {
          const next = samples[i - 1]
          if (next.front === s.front) {
            ctx.strokeStyle = color
            ctx.lineWidth = radius * 2
            ctx.lineCap = 'round'
            ctx.beginPath()
            ctx.moveTo(s.x, s.y)
            ctx.lineTo(next.x, next.y)
            ctx.stroke()
          }
        }

        ctx.fillStyle = color
        ctx.beginPath()
        ctx.arc(s.x, s.y, radius, 0, Math.PI * 2)
        ctx.fill()
      }

      // Eyes on head with subtle cursor curiosity
      const head = samples[0]
      const headCtx = head.front ? frontCtx : backCtx
      let lookX = head.tx
      let lookY = head.ty

      if (cursorNear && cursorLocal && !reducedMotion) {
        const dx = cursorLocal.x - head.x
        const dy = cursorLocal.y - head.y
        const d = Math.hypot(dx, dy) || 1
        lookX = head.tx * 0.45 + (dx / d) * 0.55
        lookY = head.ty * 0.45 + (dy / d) * 0.55
        const norm = Math.hypot(lookX, lookY) || 1
        lookX /= norm
        lookY /= norm
      }

      const perpX = -head.ty
      const perpY = head.tx
      for (const side of [-1, 1]) {
        const ex = head.x + head.tx * 2.2 + perpX * 2.9 * side
        const ey = head.y + head.ty * 2.2 + perpY * 2.9 * side
        headCtx.fillStyle = '#0b100e'
        headCtx.beginPath()
        headCtx.arc(ex, ey, 1.55, 0, Math.PI * 2)
        headCtx.fill()

        headCtx.fillStyle = '#eaffdc'
        headCtx.beginPath()
        headCtx.arc(ex + lookX * 0.55, ey + lookY * 0.55, 0.55, 0, Math.PI * 2)
        headCtx.fill()
      }

      if (!reducedMotion) {
        rafId = window.requestAnimationFrame(drawFrame)
      }
    }

    if (reducedMotion) {
      drawFrame(performance.now())
    } else {
      rafId = window.requestAnimationFrame(drawFrame)
    }

    return () => {
      window.cancelAnimationFrame(rafId)
      if (pulseTimer !== null) {
        window.clearTimeout(pulseTimer)
      }
      resizeObserver.disconnect()
      window.removeEventListener('resize', syncSize)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerleave', onPointerLeave)
    }
  }, [reducedMotion])

  return (
    <div ref={containerRef} className="relative inline-block">
      <canvas
        ref={backCanvasRef}
        aria-hidden="true"
        style={{ left: -CANVAS_PAD_X, top: -CANVAS_PAD_Y }}
        className="pointer-events-none absolute z-0"
      />

      <h1
        ref={headingRef}
        aria-label="SNAKE"
        className="relative z-10 inline-flex select-none text-6xl leading-[0.92] font-bold tracking-[-0.04em] text-[#f3faf5] sm:text-8xl"
      >
        {LETTERS.map((char, idx) => (
          <span
            key={char}
            ref={(el) => {
              letterRefs.current[idx] = el
            }}
            className={`inline-block transition-transform duration-200 ease-out ${
              pulsingIndex === idx ? 'scale-[1.09] text-[#a7ff63]' : 'scale-100'
            }`}
          >
            {char}
          </span>
        ))}
      </h1>

      <canvas
        ref={frontCanvasRef}
        aria-hidden="true"
        style={{ left: -CANVAS_PAD_X, top: -CANVAS_PAD_Y }}
        className="pointer-events-none absolute z-20"
      />
    </div>
  )
}

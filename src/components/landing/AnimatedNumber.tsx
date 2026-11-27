import { useEffect, useState } from 'react'
import { usePrefersReducedMotion } from './usePrefersReducedMotion.ts'

interface AnimatedNumberProps {
  readonly value: number
  readonly durationMs?: number
}

export function AnimatedNumber({ value, durationMs = 650 }: AnimatedNumberProps) {
  const reducedMotion = usePrefersReducedMotion()
  const [display, setDisplay] = useState<number>(() => (reducedMotion ? value : 0))

  useEffect(() => {
    if (reducedMotion || value <= 0) {
      return
    }

    let rafId = 0
    const startTime = performance.now()

    const tick = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(1, elapsed / durationMs)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(value * eased))
      if (progress < 1) {
        rafId = window.requestAnimationFrame(tick)
      }
    }

    rafId = window.requestAnimationFrame(tick)
    return () => {
      window.cancelAnimationFrame(rafId)
    }
  }, [value, durationMs, reducedMotion])

  return <>{reducedMotion || value <= 0 ? value : display}</>
}

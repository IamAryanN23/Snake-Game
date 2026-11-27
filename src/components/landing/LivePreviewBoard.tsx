import { useEffect, useRef } from 'react'
import {
  DIRECTION_VECTORS,
  OPPOSITE_DIRECTION,
} from '../../game/engine/constants.ts'
import { interpolateWrappedPoint } from '../../game/engine/snakeEngine.ts'
import type { Direction, GridPoint, SpeedPreset } from '../../game/engine/types.ts'
import { usePrefersReducedMotion } from './usePrefersReducedMotion.ts'

interface LivePreviewBoardProps {
  readonly speedPreset: SpeedPreset
}

const COLS = 12
const ROWS = 8
const TARGET_LENGTH = 6
const ALL_DIRECTIONS: readonly Direction[] = ['up', 'right', 'down', 'left']

const PREVIEW_STEP_MS: Record<SpeedPreset, number> = {
  relaxed: 210,
  standard: 145,
  turbo: 95,
}

interface PopSpark {
  x: number
  y: number
  vx: number
  vy: number
  lifeMs: number
  maxLifeMs: number
}

function wrapPoint(x: number, y: number): GridPoint {
  return {
    x: (x + COLS) % COLS,
    y: (y + ROWS) % ROWS,
  }
}

function wrappedDistance(a: GridPoint, b: GridPoint): number {
  const dx = Math.min(Math.abs(a.x - b.x), COLS - Math.abs(a.x - b.x))
  const dy = Math.min(Math.abs(a.y - b.y), ROWS - Math.abs(a.y - b.y))
  return dx + dy
}

function pickNextDirection(
  snake: readonly GridPoint[],
  currentDir: Direction,
  food: GridPoint,
): Direction {
  const head = snake[0]
  const bodySet = new Set(snake.slice(0, -1).map((s) => `${s.x},${s.y}`))
  const candidates = ALL_DIRECTIONS.filter((dir) => {
    if (dir === OPPOSITE_DIRECTION[currentDir]) {
      return false
    }
    const vec = DIRECTION_VECTORS[dir]
    const next = wrapPoint(head.x + vec.x, head.y + vec.y)
    return !bodySet.has(`${next.x},${next.y}`)
  })

  const pool = candidates.length > 0 ? candidates : [currentDir]
  let bestDir = pool[0]
  let bestDist = Infinity

  for (const dir of pool) {
    const vec = DIRECTION_VECTORS[dir]
    const next = wrapPoint(head.x + vec.x, head.y + vec.y)
    const dist = wrappedDistance(next, food)
    if (dist < bestDist) {
      bestDist = dist
      bestDir = dir
    }
  }
  return bestDir
}

function spawnPreviewFood(snake: readonly GridPoint[]): GridPoint {
  const occupied = new Set(snake.map((s) => `${s.x},${s.y}`))
  const free: GridPoint[] = []
  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      if (!occupied.has(`${x},${y}`)) {
        free.push({ x, y })
      }
    }
  }
  if (free.length === 0) {
    return { x: 0, y: 0 }
  }
  return free[Math.floor(Math.random() * free.length)]
}

export function LivePreviewBoard({ speedPreset }: LivePreviewBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const speedRef = useRef<SpeedPreset>(speedPreset)
  const reducedMotion = usePrefersReducedMotion()

  useEffect(() => {
    speedRef.current = speedPreset
  }, [speedPreset])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      return
    }

    const width = 240
    const height = 160
    const cellW = width / COLS
    const cellH = height / ROWS
    const dpr = Math.min(window.devicePixelRatio || 1, 2)

    canvas.width = Math.floor(width * dpr)
    canvas.height = Math.floor(height * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    let snake: GridPoint[] = [
      { x: 6, y: 4 },
      { x: 5, y: 4 },
      { x: 4, y: 4 },
      { x: 3, y: 4 },
      { x: 2, y: 4 },
    ]
    let prevSnake: GridPoint[] = [...snake]
    let direction: Direction = 'right'
    let food: GridPoint = { x: 9, y: 4 }
    let accumulatorMs = 0
    let pulseMs = 0
    let eatPopMs = 0
    let sparks: PopSpark[] = []
    let rafId = 0
    let lastTime = performance.now()

    const step = () => {
      prevSnake = [...snake]
      direction = pickNextDirection(snake, direction, food)
      const vec = DIRECTION_VECTORS[direction]
      const nextHead = wrapPoint(snake[0].x + vec.x, snake[0].y + vec.y)
      const ate = nextHead.x === food.x && nextHead.y === food.y

      if (ate && snake.length < TARGET_LENGTH) {
        snake = [nextHead, ...snake]
        prevSnake = [...prevSnake, prevSnake[prevSnake.length - 1]]
      } else {
        snake = [nextHead, ...snake.slice(0, -1)]
      }

      if (ate) {
        eatPopMs = 260
        const fx = (food.x + 0.5) * cellW
        const fy = (food.y + 0.5) * cellH
        for (let i = 0; i < 8; i += 1) {
          const angle = (Math.PI * 2 * i) / 8
          const speed = 34 + Math.random() * 44
          sparks.push({
            x: fx,
            y: fy,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            lifeMs: 0,
            maxLifeMs: 260,
          })
        }
        food = spawnPreviewFood(snake)
      }
    }

    const render = (now: number) => {
      const dtMs = Math.min(80, now - lastTime)
      lastTime = now
      pulseMs += dtMs

      const stepMs = PREVIEW_STEP_MS[speedRef.current]
      if (!reducedMotion) {
        accumulatorMs += dtMs
        while (accumulatorMs >= stepMs) {
          accumulatorMs -= stepMs
          step()
        }
      }

      if (eatPopMs > 0) {
        eatPopMs = Math.max(0, eatPopMs - dtMs)
      }
      if (sparks.length > 0) {
        const dtSec = dtMs / 1000
        sparks = sparks
          .map((s) => ({
            ...s,
            x: s.x + s.vx * dtSec,
            y: s.y + s.vy * dtSec,
            vx: s.vx * 0.92,
            vy: s.vy * 0.92,
            lifeMs: s.lifeMs + dtMs,
          }))
          .filter((s) => s.lifeMs < s.maxLifeMs)
      }

      ctx.clearRect(0, 0, width, height)

      // Background grid
      ctx.fillStyle = '#0c1310'
      ctx.fillRect(0, 0, width, height)
      ctx.strokeStyle = '#182720'
      ctx.lineWidth = 1
      for (let c = 1; c < COLS; c += 1) {
        const x = c * cellW
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, height)
        ctx.stroke()
      }
      for (let r = 1; r < ROWS; r += 1) {
        const y = r * cellH
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(width, y)
        ctx.stroke()
      }

      // Coral food dot
      const foodX = (food.x + 0.5) * cellW
      const foodY = (food.y + 0.5) * cellH
      const pulse = reducedMotion ? 0 : Math.sin(pulseMs * 0.006)
      ctx.fillStyle = 'rgba(255, 107, 74, 0.2)'
      ctx.beginPath()
      ctx.arc(foodX, foodY, 9.5 + pulse * 1.4, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = '#ff6b4a'
      ctx.beginPath()
      ctx.arc(foodX, foodY, 5.2 + pulse * 0.4, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = 'rgba(255, 213, 200, 0.85)'
      ctx.beginPath()
      ctx.arc(foodX - 1.5, foodY - 1.5, 1.6, 0, Math.PI * 2)
      ctx.fill()

      // Sparks
      for (const s of sparks) {
        const a = 1 - s.lifeMs / s.maxLifeMs
        ctx.fillStyle = `rgba(255, 133, 102, ${a})`
        ctx.beginPath()
        ctx.arc(s.x, s.y, 2 * a, 0, Math.PI * 2)
        ctx.fill()
      }

      // Snake segments
      const alpha = reducedMotion ? 1 : Math.min(1, accumulatorMs / stepMs)
      const pts = snake.map((seg, idx) => {
        const prev = prevSnake[idx] ?? seg
        const pos = interpolateWrappedPoint(prev, seg, alpha, COLS, ROWS)
        return {
          x: (pos.x + 0.5) * cellW,
          y: (pos.y + 0.5) * cellH,
        }
      })

      for (let i = pts.length - 1; i >= 0; i -= 1) {
        const t = pts.length > 1 ? i / (pts.length - 1) : 0
        const radius = (7.2 - t * 1.6) + (i === 0 && eatPopMs > 0 ? Math.sin((eatPopMs / 260) * Math.PI) * 1.8 : 0)
        const curr = pts[i]
        const color = i === 0 ? '#9eff52' : t < 0.5 ? '#7ae838' : '#3ea848'

        if (i > 0) {
          const next = pts[i - 1]
          if (Math.abs(curr.x - next.x) < cellW * 1.5 && Math.abs(curr.y - next.y) < cellH * 1.5) {
            ctx.strokeStyle = color
            ctx.lineWidth = radius * 2
            ctx.lineCap = 'round'
            ctx.beginPath()
            ctx.moveTo(curr.x, curr.y)
            ctx.lineTo(next.x, next.y)
            ctx.stroke()
          }
        }

        ctx.fillStyle = color
        ctx.beginPath()
        ctx.arc(curr.x, curr.y, radius, 0, Math.PI * 2)
        ctx.fill()
      }

      // Eyes on head
      const head = pts[0]
      const dirVec = DIRECTION_VECTORS[direction]
      const perpX = -dirVec.y
      const perpY = dirVec.x
      for (const side of [-1, 1]) {
        const ex = head.x + dirVec.x * 2.4 + perpX * 3 * side
        const ey = head.y + dirVec.y * 2.4 + perpY * 3 * side
        ctx.fillStyle = '#0b100e'
        ctx.beginPath()
        ctx.arc(ex, ey, 1.5, 0, Math.PI * 2)
        ctx.fill()
      }

      if (!reducedMotion) {
        rafId = window.requestAnimationFrame(render)
      }
    }

    if (reducedMotion) {
      render(performance.now())
    } else {
      rafId = window.requestAnimationFrame(render)
    }

    return () => {
      window.cancelAnimationFrame(rafId)
    }
  }, [reducedMotion])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="block h-auto w-full rounded-xl"
    />
  )
}

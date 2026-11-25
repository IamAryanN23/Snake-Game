import Phaser from 'phaser'
import { DEFAULT_GRID_SIZE, DIRECTION_VECTORS } from './engine/constants.ts'
import {
  createInitialState,
  enqueueDirection,
  getStepIntervalMs,
  interpolatePoint,
  setPaused,
  stepGame,
  toSnapshot,
} from './engine/snakeEngine.ts'
import type { Direction, EngineSnapshot, EngineState, SpeedPreset } from './engine/types.ts'
import { BOARD_PALETTE, lerpColor } from './palette.ts'

export const BOARD_PIXELS = 640
const CELL_SIZE = BOARD_PIXELS / DEFAULT_GRID_SIZE
const SWIPE_THRESHOLD_PX = 22

interface SparkParticle {
  x: number
  y: number
  vx: number
  vy: number
  lifeMs: number
  maxLifeMs: number
  color: number
  radius: number
}

export interface SceneCallbacks {
  readonly onSnapshot: (snapshot: EngineSnapshot) => void
  readonly onEat: (snapshot: EngineSnapshot) => void
  readonly onTurn: () => void
  readonly onGameOver: (snapshot: EngineSnapshot, preset: SpeedPreset) => void
}

export interface SceneInitOptions {
  readonly speedPreset: SpeedPreset
  readonly showGrid: boolean
  readonly callbacks: SceneCallbacks
}

export class SnakeScene extends Phaser.Scene {
  private engineState: EngineState
  private callbacks: SceneCallbacks | null = null
  private showGrid = true
  private accumulatorMs = 0
  private pulseClockMs = 0
  private impactFlashMs = 0
  private bgGraphics: Phaser.GameObjects.Graphics | null = null
  private dynamicGraphics: Phaser.GameObjects.Graphics | null = null
  private sparks: SparkParticle[] = []
  private swipeOrigin: { x: number; y: number } | null = null
  private swipeConsumed = false
  private visibilityListener: (() => void) | null = null

  constructor(options?: SceneInitOptions) {
    super({ key: 'SnakeScene' })
    this.showGrid = options?.showGrid ?? true
    this.callbacks = options?.callbacks ?? null
    this.engineState = createInitialState({
      gridWidth: DEFAULT_GRID_SIZE,
      gridHeight: DEFAULT_GRID_SIZE,
      speedPreset: options?.speedPreset ?? 'standard',
    })
  }

  create(): void {
    this.bgGraphics = this.add.graphics()
    this.dynamicGraphics = this.add.graphics()
    this.drawBoardBackground()
    this.bindInputs()
    this.emitSnapshot()
    this.renderFrame(1)

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.cleanupListeners()
    })
    this.events.once(Phaser.Scenes.Events.DESTROY, () => {
      this.cleanupListeners()
    })
  }

  update(_time: number, delta: number): void {
    const clampedDelta = Math.min(delta, 100)
    this.pulseClockMs += clampedDelta
    this.updateSparks(clampedDelta)

    if (this.impactFlashMs > 0) {
      this.impactFlashMs = Math.max(0, this.impactFlashMs - clampedDelta)
    }

    const stepMs = getStepIntervalMs(this.engineState.speedPreset, this.engineState.foodEaten)

    if (this.engineState.status === 'playing') {
      this.accumulatorMs += clampedDelta

      while (this.accumulatorMs >= stepMs && this.engineState.status === 'playing') {
        const currentStepMs = getStepIntervalMs(
          this.engineState.speedPreset,
          this.engineState.foodEaten,
        )
        this.accumulatorMs -= currentStepMs
        const outcome = stepGame(this.engineState)
        this.engineState = outcome.state

        if (outcome.turned && !outcome.ended) {
          this.callbacks?.onTurn()
        }

        if (outcome.ateFood) {
          const head = this.engineState.snake[0]
          this.spawnEatSparks(head.x, head.y)
          this.callbacks?.onEat(toSnapshot(this.engineState))
        }

        if (outcome.ended) {
          this.impactFlashMs = 450
          this.accumulatorMs = 0
          const snap = toSnapshot(this.engineState)
          this.callbacks?.onSnapshot(snap)
          this.callbacks?.onGameOver(snap, this.engineState.speedPreset)
        } else if (outcome.ateFood) {
          this.emitSnapshot()
        }
      }
    }

    const activeStepMs = getStepIntervalMs(this.engineState.speedPreset, this.engineState.foodEaten)
    const alpha =
      this.engineState.status === 'playing' ? Math.min(1, this.accumulatorMs / activeStepMs) : 1
    this.renderFrame(alpha)
  }

  enqueueDirection(direction: Direction): void {
    this.engineState = enqueueDirection(this.engineState, direction)
  }

  togglePause(): void {
    if (this.engineState.status === 'playing') {
      this.setPausedState(true)
    } else if (this.engineState.status === 'paused') {
      this.setPausedState(false)
    }
  }

  setPausedState(paused: boolean): void {
    const next = setPaused(this.engineState, paused)
    if (next !== this.engineState) {
      this.engineState = next
      this.emitSnapshot()
    }
  }

  restart(speedPreset?: SpeedPreset): void {
    const preset = speedPreset ?? this.engineState.speedPreset
    this.engineState = createInitialState({
      gridWidth: DEFAULT_GRID_SIZE,
      gridHeight: DEFAULT_GRID_SIZE,
      speedPreset: preset,
    })
    this.accumulatorMs = 0
    this.impactFlashMs = 0
    this.sparks = []
    this.emitSnapshot()
  }

  applySettings(speedPreset: SpeedPreset, showGrid: boolean): void {
    const gridChanged = this.showGrid !== showGrid
    this.showGrid = showGrid
    if (gridChanged) {
      this.drawBoardBackground()
    }

    if (this.engineState.speedPreset !== speedPreset) {
      this.engineState = {
        ...this.engineState,
        speedPreset,
      }
      this.emitSnapshot()
    }
  }

  private emitSnapshot(): void {
    this.callbacks?.onSnapshot(toSnapshot(this.engineState))
  }

  private bindInputs(): void {
    const keyboard = this.input.keyboard
    if (keyboard) {
      keyboard.on('keydown', this.handleKeyDown, this)
    }

    this.input.on('pointerdown', this.handlePointerDown, this)
    this.input.on('pointermove', this.handlePointerMove, this)
    this.input.on('pointerup', this.handlePointerUp, this)

    if (typeof document !== 'undefined') {
      this.visibilityListener = () => {
        if (document.hidden && this.engineState.status === 'playing') {
          this.setPausedState(true)
        }
      }
      document.addEventListener('visibilitychange', this.visibilityListener)
    }
  }

  private cleanupListeners(): void {
    this.input.keyboard?.off('keydown', this.handleKeyDown, this)
    this.input.off('pointerdown', this.handlePointerDown, this)
    this.input.off('pointermove', this.handlePointerMove, this)
    this.input.off('pointerup', this.handlePointerUp, this)

    if (this.visibilityListener && typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.visibilityListener)
      this.visibilityListener = null
    }
  }

  private handleKeyDown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
      return
    }

    const code = event.code
    let direction: Direction | null = null

    if (code === 'ArrowUp' || code === 'KeyW') direction = 'up'
    else if (code === 'ArrowDown' || code === 'KeyS') direction = 'down'
    else if (code === 'ArrowLeft' || code === 'KeyA') direction = 'left'
    else if (code === 'ArrowRight' || code === 'KeyD') direction = 'right'

    if (direction) {
      event.preventDefault()
      this.enqueueDirection(direction)
      return
    }

    if (code === 'Space' || code === 'KeyP' || code === 'Escape') {
      if (this.engineState.status === 'playing' || this.engineState.status === 'paused') {
        event.preventDefault()
        this.togglePause()
        return
      }
    }

    if (code === 'KeyR' || (code === 'Enter' && this.engineState.status !== 'playing')) {
      if (
        this.engineState.status === 'gameover' ||
        this.engineState.status === 'won' ||
        this.engineState.status === 'paused'
      ) {
        event.preventDefault()
        this.restart()
      }
    }
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    this.swipeOrigin = { x: pointer.x, y: pointer.y }
    this.swipeConsumed = false
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    if (!pointer.isDown || !this.swipeOrigin || this.swipeConsumed) {
      return
    }
    const dx = pointer.x - this.swipeOrigin.x
    const dy = pointer.y - this.swipeOrigin.y
    if (Math.hypot(dx, dy) < SWIPE_THRESHOLD_PX) {
      return
    }

    if (Math.abs(dx) > Math.abs(dy)) {
      this.enqueueDirection(dx > 0 ? 'right' : 'left')
    } else {
      this.enqueueDirection(dy > 0 ? 'down' : 'up')
    }

    // Reset origin so continuous swiping without lifting works smoothly.
    this.swipeOrigin = { x: pointer.x, y: pointer.y }
    this.swipeConsumed = true
    this.time.delayedCall(90, () => {
      this.swipeConsumed = false
    })
  }

  private handlePointerUp(): void {
    this.swipeOrigin = null
    this.swipeConsumed = false
  }

  private drawBoardBackground(): void {
    const g = this.bgGraphics
    if (!g) {
      return
    }
    g.clear()
    g.fillStyle(BOARD_PALETTE.background, 1)
    g.fillRect(0, 0, BOARD_PIXELS, BOARD_PIXELS)

    // Subtle alternating cell tone for effortless spatial alignment.
    g.fillStyle(BOARD_PALETTE.cellAlt, 0.72)
    for (let y = 0; y < DEFAULT_GRID_SIZE; y += 1) {
      for (let x = 0; x < DEFAULT_GRID_SIZE; x += 1) {
        if ((x + y) % 2 === 1) {
          g.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE)
        }
      }
    }

    if (this.showGrid) {
      g.lineStyle(1, BOARD_PALETTE.gridLine, 0.55)
      for (let i = 1; i < DEFAULT_GRID_SIZE; i += 1) {
        const pos = i * CELL_SIZE
        g.lineBetween(pos, 0, pos, BOARD_PIXELS)
        g.lineBetween(0, pos, BOARD_PIXELS, pos)
      }
    }

    // Crisp inner perimeter and subtle cyan corner brackets.
    g.lineStyle(2, BOARD_PALETTE.border, 0.9)
    g.strokeRect(1, 1, BOARD_PIXELS - 2, BOARD_PIXELS - 2)

    const bracket = 16
    g.lineStyle(2, BOARD_PALETTE.cornerAccent, 0.55)
    g.lineBetween(2, bracket, 2, 2)
    g.lineBetween(2, 2, bracket, 2)
    g.lineBetween(BOARD_PIXELS - bracket, 2, BOARD_PIXELS - 2, 2)
    g.lineBetween(BOARD_PIXELS - 2, 2, BOARD_PIXELS - 2, bracket)
    g.lineBetween(2, BOARD_PIXELS - bracket, 2, BOARD_PIXELS - 2)
    g.lineBetween(2, BOARD_PIXELS - 2, bracket, BOARD_PIXELS - 2)
    g.lineBetween(BOARD_PIXELS - bracket, BOARD_PIXELS - 2, BOARD_PIXELS - 2, BOARD_PIXELS - 2)
    g.lineBetween(BOARD_PIXELS - 2, BOARD_PIXELS - bracket, BOARD_PIXELS - 2, BOARD_PIXELS - 2)
  }

  private spawnEatSparks(gridX: number, gridY: number): void {
    const cx = (gridX + 0.5) * CELL_SIZE
    const cy = (gridY + 0.5) * CELL_SIZE
    const count = 10

    for (let i = 0; i < count; i += 1) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4
      const speed = 75 + Math.random() * 115
      this.sparks.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        lifeMs: 0,
        maxLifeMs: 280 + Math.random() * 140,
        color: i % 3 === 0 ? BOARD_PALETTE.cyanAccent : BOARD_PALETTE.foodCore,
        radius: 2 + Math.random() * 2.2,
      })
    }
  }

  private updateSparks(deltaMs: number): void {
    if (this.sparks.length === 0) {
      return
    }
    const dt = deltaMs / 1000
    const next: SparkParticle[] = []
    for (const spark of this.sparks) {
      const lifeMs = spark.lifeMs + deltaMs
      if (lifeMs < spark.maxLifeMs) {
        spark.x += spark.vx * dt
        spark.y += spark.vy * dt
        spark.vx *= 0.94
        spark.vy *= 0.94
        spark.lifeMs = lifeMs
        next.push(spark)
      }
    }
    this.sparks = next
  }

  private renderFrame(alpha: number): void {
    const g = this.dynamicGraphics
    if (!g) {
      return
    }
    g.clear()

    this.drawFood(g)
    this.drawSnake(g, alpha)
    this.drawSparks(g)
  }

  private drawFood(g: Phaser.GameObjects.Graphics): void {
    const food = this.engineState.food
    if (!food) {
      return
    }
    const cx = (food.x + 0.5) * CELL_SIZE
    const cy = (food.y + 0.5) * CELL_SIZE
    const pulse = Math.sin(this.pulseClockMs * 0.0055)
    const haloRadius = CELL_SIZE * (0.46 + pulse * 0.07)
    const coreRadius = CELL_SIZE * (0.31 + pulse * 0.025)

    g.fillStyle(BOARD_PALETTE.foodGlow, 0.16)
    g.fillCircle(cx, cy, haloRadius * 1.35)

    g.lineStyle(1.5, BOARD_PALETTE.foodCore, 0.45)
    g.strokeCircle(cx, cy, haloRadius)

    g.fillStyle(BOARD_PALETTE.foodCore, 1)
    g.fillCircle(cx, cy, coreRadius)

    g.fillStyle(BOARD_PALETTE.foodHighlight, 0.78)
    g.fillCircle(cx - coreRadius * 0.28, cy - coreRadius * 0.28, coreRadius * 0.28)
  }

  private drawSnake(g: Phaser.GameObjects.Graphics, alpha: number): void {
    const { snake, previousSnake, direction, status } = this.engineState
    if (snake.length === 0) {
      return
    }

    const points = snake.map((seg, idx) => {
      const prev = previousSnake[idx] ?? seg
      const interpolated = interpolatePoint(prev, seg, alpha)
      return {
        x: (interpolated.x + 0.5) * CELL_SIZE,
        y: (interpolated.y + 0.5) * CELL_SIZE,
      }
    })

    // Draw connecting capsules from tail to head so the head renders crisp on top.
    for (let i = points.length - 1; i >= 0; i -= 1) {
      const t = points.length > 1 ? i / (points.length - 1) : 0
      const color =
        t < 0.45
          ? lerpColor(BOARD_PALETTE.snakeHead, BOARD_PALETTE.snakeMid, t / 0.45)
          : lerpColor(BOARD_PALETTE.snakeMid, BOARD_PALETTE.snakeTail, (t - 0.45) / 0.55)

      const taper = 1 - t * 0.22
      const radius = CELL_SIZE * 0.41 * taper
      const curr = points[i]

      if (i > 0) {
        const next = points[i - 1]
        g.lineStyle(radius * 2, color, 1)
        g.lineBetween(curr.x, curr.y, next.x, next.y)
      }

      g.fillStyle(color, 1)
      g.fillCircle(curr.x, curr.y, radius)
    }

    // Subtle dorsal highlight along head and upper body.
    const head = points[0]
    const headRadius = CELL_SIZE * 0.43

    // Head glow ring when alive
    if (status === 'playing' || status === 'paused') {
      g.fillStyle(BOARD_PALETTE.snakeHead, 0.14)
      g.fillCircle(head.x, head.y, headRadius * 1.45)
    }

    g.fillStyle(BOARD_PALETTE.snakeHead, 1)
    g.fillCircle(head.x, head.y, headRadius)

    // Directional eyes
    const dirVec = DIRECTION_VECTORS[direction]
    const perpX = -dirVec.y
    const perpY = dirVec.x
    const forwardOffset = headRadius * 0.34
    const eyeSpread = headRadius * 0.45
    const eyeRadius = Math.max(2.6, CELL_SIZE * 0.095)

    for (const side of [-1, 1]) {
      const ex = head.x + dirVec.x * forwardOffset + perpX * eyeSpread * side
      const ey = head.y + dirVec.y * forwardOffset + perpY * eyeSpread * side
      g.fillStyle(BOARD_PALETTE.snakeEye, 1)
      g.fillCircle(ex, ey, eyeRadius)
      g.fillStyle(BOARD_PALETTE.snakeEyeGlint, 0.9)
      g.fillCircle(ex + dirVec.x * 0.8, ey + dirVec.y * 0.8, eyeRadius * 0.36)
    }

    // Impact ring on game over
    if (status === 'gameover' && this.impactFlashMs > 0) {
      const progress = 1 - this.impactFlashMs / 450
      const ringRadius = headRadius * (1.1 + progress * 1.4)
      g.lineStyle(2.5, BOARD_PALETTE.impactRing, 1 - progress)
      g.strokeCircle(head.x, head.y, ringRadius)
    }
  }

  private drawSparks(g: Phaser.GameObjects.Graphics): void {
    for (const spark of this.sparks) {
      const alpha = 1 - spark.lifeMs / spark.maxLifeMs
      g.fillStyle(spark.color, alpha)
      g.fillCircle(spark.x, spark.y, spark.radius * alpha)
    }
  }
}

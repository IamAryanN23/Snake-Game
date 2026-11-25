import {
  DEFAULT_GRID_SIZE,
  DIRECTION_VECTORS,
  INITIAL_SNAKE_LENGTH,
  MAX_DIRECTION_QUEUE,
  OPPOSITE_DIRECTION,
  SPEED_PRESETS,
} from './constants.ts'
import type {
  Direction,
  EngineConfig,
  EngineSnapshot,
  EngineState,
  GridPoint,
  SpeedPreset,
  StepOutcome,
} from './types.ts'

export type RandomFn = () => number

export function pointsEqual(a: GridPoint, b: GridPoint): boolean {
  return a.x === b.x && a.y === b.y
}

export function isOppositeDirection(a: Direction, b: Direction): boolean {
  return OPPOSITE_DIRECTION[a] === b
}

export function isInsideGrid(point: GridPoint, gridWidth: number, gridHeight: number): boolean {
  return point.x >= 0 && point.x < gridWidth && point.y >= 0 && point.y < gridHeight
}

/**
 * Computes the fixed-timestep interval (ms) for the given preset and food count.
 */
export function getStepIntervalMs(preset: SpeedPreset, foodEaten: number): number {
  const cfg = SPEED_PRESETS[preset]
  const raw = cfg.baseStepMs - foodEaten * cfg.stepDecrementMs
  return Math.max(cfg.minStepMs, Math.round(raw))
}

/**
 * Returns a 1-based speed tier that rises smoothly as food is collected.
 */
export function getSpeedLevel(foodEaten: number): number {
  return 1 + Math.floor(foodEaten / 4)
}

/**
 * Picks a random unoccupied cell for food, returning null if the board is full.
 */
export function spawnFood(
  gridWidth: number,
  gridHeight: number,
  snake: readonly GridPoint[],
  obstacles: readonly GridPoint[] = [],
  rng: RandomFn = Math.random,
): GridPoint | null {
  const occupied = new Set<string>()
  for (const segment of snake) {
    occupied.add(`${segment.x},${segment.y}`)
  }
  for (const obstacle of obstacles) {
    occupied.add(`${obstacle.x},${obstacle.y}`)
  }

  const available: GridPoint[] = []
  for (let y = 0; y < gridHeight; y += 1) {
    for (let x = 0; x < gridWidth; x += 1) {
      if (!occupied.has(`${x},${y}`)) {
        available.push({ x, y })
      }
    }
  }

  if (available.length === 0) {
    return null
  }

  const index = Math.min(available.length - 1, Math.floor(rng() * available.length))
  return available[index]
}

/**
 * Creates a fresh Classic Snake game state centered vertically on the left half.
 */
export function createInitialState(
  config: Partial<EngineConfig> = {},
  rng: RandomFn = Math.random,
): EngineState {
  const gridWidth = config.gridWidth ?? DEFAULT_GRID_SIZE
  const gridHeight = config.gridHeight ?? DEFAULT_GRID_SIZE
  const speedPreset = config.speedPreset ?? 'standard'
  const obstacles = config.obstacles ?? []

  const centerY = Math.floor(gridHeight / 2)
  const headX = Math.max(INITIAL_SNAKE_LENGTH, Math.floor(gridWidth * 0.35))
  const snake: GridPoint[] = []

  for (let i = 0; i < INITIAL_SNAKE_LENGTH; i += 1) {
    snake.push({ x: headX - i, y: centerY })
  }

  const food = spawnFood(gridWidth, gridHeight, snake, obstacles, rng)

  return {
    gridWidth,
    gridHeight,
    speedPreset,
    snake,
    previousSnake: snake,
    direction: 'right',
    directionQueue: [],
    food,
    obstacles,
    pendingGrowth: 0,
    score: 0,
    foodEaten: 0,
    status: 'playing',
    lossReason: null,
    elapsedMs: 0,
    ticks: 0,
  }
}

/**
 * Safely queues a turn relative to the latest planned direction, blocking 180-degree reversals.
 */
export function enqueueDirection(state: EngineState, next: Direction): EngineState {
  if (state.status !== 'playing') {
    return state
  }

  const referenceDirection =
    state.directionQueue.length > 0
      ? state.directionQueue[state.directionQueue.length - 1]
      : state.direction

  if (next === referenceDirection || isOppositeDirection(next, referenceDirection)) {
    return state
  }

  if (state.directionQueue.length >= MAX_DIRECTION_QUEUE) {
    return state
  }

  return {
    ...state,
    directionQueue: [...state.directionQueue, next],
  }
}

/**
 * Advances the simulation by exactly one discrete grid tick.
 */
export function stepGame(state: EngineState, rng: RandomFn = Math.random): StepOutcome {
  if (state.status !== 'playing') {
    return { state, ateFood: false, turned: false, ended: false }
  }

  const [queuedNext, ...remainingQueue] = state.directionQueue
  const activeDirection = queuedNext ?? state.direction
  const turned = activeDirection !== state.direction
  const vector = DIRECTION_VECTORS[activeDirection]
  const currentHead = state.snake[0]
  const nextHead: GridPoint = {
    x: currentHead.x + vector.x,
    y: currentHead.y + vector.y,
  }

  const stepMs = getStepIntervalMs(state.speedPreset, state.foodEaten)
  const nextElapsedMs = state.elapsedMs + stepMs

  if (!isInsideGrid(nextHead, state.gridWidth, state.gridHeight)) {
    return {
      state: {
        ...state,
        direction: activeDirection,
        directionQueue: remainingQueue,
        previousSnake: state.snake,
        status: 'gameover',
        lossReason: 'wall',
        elapsedMs: nextElapsedMs,
      },
      ateFood: false,
      turned,
      ended: true,
    }
  }

  for (const obstacle of state.obstacles) {
    if (pointsEqual(nextHead, obstacle)) {
      return {
        state: {
          ...state,
          direction: activeDirection,
          directionQueue: remainingQueue,
          previousSnake: state.snake,
          status: 'gameover',
          lossReason: 'wall',
          elapsedMs: nextElapsedMs,
        },
        ateFood: false,
        turned,
        ended: true,
      }
    }
  }

  const willEat = state.food !== null && pointsEqual(nextHead, state.food)
  const willGrowThisTick = willEat || state.pendingGrowth > 0

  // The tail tip vacates its cell on non-growth ticks, so moving into it is legal.
  const bodyToCheck = willGrowThisTick ? state.snake : state.snake.slice(0, -1)
  for (const segment of bodyToCheck) {
    if (pointsEqual(nextHead, segment)) {
      return {
        state: {
          ...state,
          direction: activeDirection,
          directionQueue: remainingQueue,
          previousSnake: state.snake,
          status: 'gameover',
          lossReason: 'self',
          elapsedMs: nextElapsedMs,
        },
        ateFood: false,
        turned,
        ended: true,
      }
    }
  }

  const nextSnake = willGrowThisTick
    ? [nextHead, ...state.snake]
    : [nextHead, ...state.snake.slice(0, -1)]

  // Keep previousSnake equal in length so visual interpolation stays aligned on growth.
  const previousSnake = willGrowThisTick
    ? [...state.snake, state.snake[state.snake.length - 1]]
    : state.snake

  const nextPendingGrowth = Math.max(0, state.pendingGrowth + (willEat ? 1 : 0) - (willGrowThisTick ? 1 : 0))
  const nextFoodEaten = state.foodEaten + (willEat ? 1 : 0)
  const speedTierBonus = Math.floor(nextFoodEaten / 4) * 5
  const nextScore =
    state.score + (willEat ? SPEED_PRESETS[state.speedPreset].pointsPerFood + speedTierBonus : 0)

  const nextFood = willEat
    ? spawnFood(state.gridWidth, state.gridHeight, nextSnake, state.obstacles, rng)
    : state.food

  const wonBoard = willEat && nextFood === null

  return {
    state: {
      ...state,
      snake: nextSnake,
      previousSnake,
      direction: activeDirection,
      directionQueue: remainingQueue,
      food: nextFood,
      pendingGrowth: nextPendingGrowth,
      score: nextScore,
      foodEaten: nextFoodEaten,
      status: wonBoard ? 'won' : 'playing',
      lossReason: null,
      elapsedMs: nextElapsedMs,
      ticks: state.ticks + 1,
    },
    ateFood: willEat,
    turned,
    ended: wonBoard,
  }
}

export function setPaused(state: EngineState, paused: boolean): EngineState {
  if (paused && state.status === 'playing') {
    return { ...state, status: 'paused' }
  }
  if (!paused && state.status === 'paused') {
    return { ...state, status: 'playing' }
  }
  return state
}

export function interpolatePoint(from: GridPoint, to: GridPoint, alpha: number): GridPoint {
  const clamped = Math.max(0, Math.min(1, alpha))
  return {
    x: from.x + (to.x - from.x) * clamped,
    y: from.y + (to.y - from.y) * clamped,
  }
}

export function toSnapshot(state: EngineState): EngineSnapshot {
  return {
    score: state.score,
    length: state.snake.length,
    foodEaten: state.foodEaten,
    speedLevel: getSpeedLevel(state.foodEaten),
    stepMs: getStepIntervalMs(state.speedPreset, state.foodEaten),
    status: state.status,
    lossReason: state.lossReason,
    elapsedMs: state.elapsedMs,
  }
}

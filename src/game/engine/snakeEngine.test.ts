import { describe, expect, it } from 'vitest'
import {
  createInitialState,
  enqueueDirection,
  getSpeedLevel,
  getStepIntervalMs,
  interpolatePoint,
  interpolateWrappedPoint,
  setPaused,
  spawnFood,
  stepGame,
  toSnapshot,
} from './snakeEngine.ts'
import type { EngineState, GridPoint } from './types.ts'

describe('snakeEngine', () => {
  it('initializes snake centered vertically moving right with valid food', () => {
    const state = createInitialState({ gridWidth: 20, gridHeight: 20, speedPreset: 'standard' }, () => 0)

    expect(state.status).toBe('playing')
    expect(state.direction).toBe('right')
    expect(state.snake).toHaveLength(4)
    expect(state.snake[0]).toEqual({ x: 7, y: 10 })
    expect(state.food).not.toBeNull()
    expect(state.snake.some((seg) => seg.x === state.food?.x && seg.y === state.food?.y)).toBe(false)
  })

  it('moves forward one cell per tick and shifts body segments cleanly', () => {
    const initial = createInitialState({ gridWidth: 12, gridHeight: 12 }, () => 0)
    const { state, ateFood, ended } = stepGame(initial)

    expect(ateFood).toBe(false)
    expect(ended).toBe(false)
    expect(state.ticks).toBe(1)
    expect(state.snake[0]).toEqual({ x: initial.snake[0].x + 1, y: initial.snake[0].y })
    expect(state.snake).toHaveLength(initial.snake.length)
    expect(state.previousSnake).toEqual(initial.snake)
  })

  it('blocks immediate 180-degree reversal and safely buffers rapid double turns', () => {
    const initial = createInitialState({ gridWidth: 20, gridHeight: 20 }, () => 0)

    // Attempting direct reverse (right -> left) must be ignored.
    const blocked = enqueueDirection(initial, 'left')
    expect(blocked.directionQueue).toEqual([])

    // Rapid Up -> Left while moving Right is valid and executes across two ticks without self-collision.
    let queued = enqueueDirection(initial, 'up')
    queued = enqueueDirection(queued, 'left')
    expect(queued.directionQueue).toEqual(['up', 'left'])

    const tick1 = stepGame(queued)
    expect(tick1.turned).toBe(true)
    expect(tick1.state.direction).toBe('up')
    expect(tick1.state.snake[0]).toEqual({ x: initial.snake[0].x, y: initial.snake[0].y - 1 })

    const tick2 = stepGame(tick1.state)
    expect(tick2.turned).toBe(true)
    expect(tick2.ended).toBe(false)
    expect(tick2.state.direction).toBe('left')
    expect(tick2.state.snake[0]).toEqual({ x: initial.snake[0].x - 1, y: initial.snake[0].y - 1 })
  })

  it('caps direction queue length to prevent stale input lag', () => {
    let state = createInitialState({ gridWidth: 20, gridHeight: 20 }, () => 0)
    state = enqueueDirection(state, 'up')
    state = enqueueDirection(state, 'left')
    state = enqueueDirection(state, 'down')
    state = enqueueDirection(state, 'right')

    expect(state.directionQueue).toEqual(['up', 'left', 'down'])
  })

  it('grows snake, increments score, and respawns food off the snake when eating', () => {
    const base = createInitialState({ gridWidth: 10, gridHeight: 10, speedPreset: 'standard' }, () => 0)
    const foodInFront: GridPoint = { x: base.snake[0].x + 1, y: base.snake[0].y }
    const withFood: EngineState = { ...base, food: foodInFront }

    const { state, ateFood, ended } = stepGame(withFood, () => 0.5)

    expect(ateFood).toBe(true)
    expect(ended).toBe(false)
    expect(state.snake).toHaveLength(base.snake.length + 1)
    expect(state.previousSnake).toHaveLength(state.snake.length)
    expect(state.score).toBe(15)
    expect(state.foodEaten).toBe(1)
    expect(state.food).not.toBeNull()
    expect(state.snake.some((seg) => seg.x === state.food?.x && seg.y === state.food?.y)).toBe(false)
  })

  it('never spawns food on snake segments or obstacles and returns null on full board', () => {
    const snake: GridPoint[] = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
    ]
    const obstacles: GridPoint[] = [{ x: 0, y: 1 }]

    // Only (1, 1) is free on a 2x2 board
    expect(spawnFood(2, 2, snake, obstacles, () => 0.99)).toEqual({ x: 1, y: 1 })
    // Full board returns null
    expect(spawnFood(2, 2, [...snake, { x: 1, y: 1 }], obstacles, () => 0)).toBeNull()
  })

  it('wraps multi-segment snake cleanly across all four board edges', () => {
    const base = createInitialState({ gridWidth: 6, gridHeight: 6 }, () => 0)

    // Right -> Left
    const rightWrap = stepGame({
      ...base,
      snake: [
        { x: 5, y: 2 },
        { x: 4, y: 2 },
        { x: 3, y: 2 },
        { x: 2, y: 2 },
      ],
      direction: 'right',
      food: { x: 0, y: 0 },
    })
    expect(rightWrap.ended).toBe(false)
    expect(rightWrap.state.status).toBe('playing')
    expect(rightWrap.state.snake).toEqual([
      { x: 0, y: 2 },
      { x: 5, y: 2 },
      { x: 4, y: 2 },
      { x: 3, y: 2 },
    ])

    // Left -> Right (including second tick while straddling edge)
    const leftWrap1 = stepGame({
      ...base,
      snake: [
        { x: 0, y: 3 },
        { x: 1, y: 3 },
        { x: 2, y: 3 },
        { x: 3, y: 3 },
      ],
      direction: 'left',
      food: { x: 0, y: 0 },
    })
    expect(leftWrap1.ended).toBe(false)
    expect(leftWrap1.state.snake[0]).toEqual({ x: 5, y: 3 })
    const leftWrap2 = stepGame(leftWrap1.state)
    expect(leftWrap2.ended).toBe(false)
    expect(leftWrap2.state.snake).toEqual([
      { x: 4, y: 3 },
      { x: 5, y: 3 },
      { x: 0, y: 3 },
      { x: 1, y: 3 },
    ])

    // Top -> Bottom
    const topWrap = stepGame({
      ...base,
      snake: [
        { x: 2, y: 0 },
        { x: 2, y: 1 },
        { x: 2, y: 2 },
      ],
      direction: 'up',
      food: { x: 0, y: 0 },
    })
    expect(topWrap.ended).toBe(false)
    expect(topWrap.state.snake[0]).toEqual({ x: 2, y: 5 })

    // Bottom -> Top
    const bottomWrap = stepGame({
      ...base,
      snake: [
        { x: 4, y: 5 },
        { x: 4, y: 4 },
        { x: 4, y: 3 },
      ],
      direction: 'down',
      food: { x: 0, y: 0 },
    })
    expect(bottomWrap.ended).toBe(false)
    expect(bottomWrap.state.snake[0]).toEqual({ x: 4, y: 0 })
  })

  it('detects self-collision and edge food collection across wrapped boundaries', () => {
    const base = createInitialState({ gridWidth: 6, gridHeight: 6, speedPreset: 'standard' }, () => 0)

    // Wrapping from right edge into own body at left edge causes self-collision
    const wrapSelfHit = stepGame({
      ...base,
      snake: [
        { x: 5, y: 2 },
        { x: 4, y: 2 },
        { x: 4, y: 1 },
        { x: 0, y: 1 },
        { x: 0, y: 2 },
        { x: 0, y: 3 },
      ],
      direction: 'right',
      food: { x: 3, y: 3 },
    })
    expect(wrapSelfHit.ended).toBe(true)
    expect(wrapSelfHit.state.status).toBe('gameover')
    expect(wrapSelfHit.state.lossReason).toBe('self')

    // Wrapping onto food placed at the opposite edge eats it and grows
    const wrapEat = stepGame(
      {
        ...base,
        snake: [
          { x: 0, y: 5 },
          { x: 1, y: 5 },
          { x: 2, y: 5 },
        ],
        direction: 'down',
        food: { x: 0, y: 0 },
      },
      () => 0,
    )
    expect(wrapEat.ateFood).toBe(true)
    expect(wrapEat.ended).toBe(false)
    expect(wrapEat.state.snake[0]).toEqual({ x: 0, y: 0 })
    expect(wrapEat.state.snake).toHaveLength(4)
  })

  it('detects self collisions while allowing movement into a vacating tail tip', () => {
    const base = createInitialState({ gridWidth: 8, gridHeight: 8 }, () => 0)

    // 2x2 loop where head moves into current tail tip while not growing -> legal!
    const vacatingTailState: EngineState = {
      ...base,
      snake: [
        { x: 3, y: 3 },
        { x: 3, y: 4 },
        { x: 4, y: 4 },
        { x: 4, y: 3 },
      ],
      direction: 'right',
      food: { x: 0, y: 0 },
    }
    const safeMove = stepGame(vacatingTailState)
    expect(safeMove.ended).toBe(false)
    expect(safeMove.state.status).toBe('playing')
    expect(safeMove.state.snake[0]).toEqual({ x: 4, y: 3 })

    // Moving down hits own body segment (3,4) -> gameover!
    const selfHitState: EngineState = {
      ...base,
      snake: [
        { x: 3, y: 3 },
        { x: 4, y: 3 },
        { x: 4, y: 4 },
        { x: 3, y: 4 },
        { x: 2, y: 4 },
      ],
      direction: 'down',
      food: { x: 0, y: 0 },
    }
    const hit = stepGame(selfHitState)
    expect(hit.ended).toBe(true)
    expect(hit.state.status).toBe('gameover')
    expect(hit.state.lossReason).toBe('self')
  })

  it('ramps speed progressively down to preset floor and computes snapshot & interpolation', () => {
    expect(getStepIntervalMs('standard', 0)).toBe(120)
    expect(getStepIntervalMs('standard', 10)).toBe(95)
    expect(getStepIntervalMs('standard', 100)).toBe(65)
    expect(getSpeedLevel(0)).toBe(1)
    expect(getSpeedLevel(4)).toBe(2)

    expect(interpolatePoint({ x: 2, y: 4 }, { x: 3, y: 4 }, 0.5)).toEqual({ x: 2.5, y: 4 })
    expect(interpolatePoint({ x: 2, y: 4 }, { x: 3, y: 4 }, 2)).toEqual({ x: 3, y: 4 })
    expect(interpolateWrappedPoint({ x: 19, y: 4 }, { x: 0, y: 4 }, 0.25, 20, 20)).toEqual({
      x: 19.25,
      y: 4,
    })
    expect(interpolateWrappedPoint({ x: 19, y: 4 }, { x: 0, y: 4 }, 0.75, 20, 20)).toEqual({
      x: -0.25,
      y: 4,
    })

    const base = createInitialState({ speedPreset: 'turbo' }, () => 0)
    const paused = setPaused(base, true)
    expect(paused.status).toBe('paused')
    expect(stepGame(paused).state).toBe(paused)

    const resumed = setPaused(paused, false)
    expect(resumed.status).toBe('playing')
    expect(toSnapshot(resumed).speedLevel).toBe(1)
  })
})

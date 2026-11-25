import type { Direction, GridPoint, SpeedPreset, SpeedPresetConfig } from './types.ts'

export const DEFAULT_GRID_SIZE = 20

export const INITIAL_SNAKE_LENGTH = 4

export const MAX_DIRECTION_QUEUE = 3

export const DIRECTION_VECTORS: Record<Direction, GridPoint> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
}

export const OPPOSITE_DIRECTION: Record<Direction, Direction> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
}

export const SPEED_PRESETS: Record<SpeedPreset, SpeedPresetConfig> = {
  relaxed: {
    id: 'relaxed',
    label: 'Relaxed',
    description: 'Measured pace for strategic routing',
    baseStepMs: 155,
    minStepMs: 85,
    stepDecrementMs: 2.5,
    pointsPerFood: 10,
  },
  standard: {
    id: 'standard',
    label: 'Standard',
    description: 'Balanced arcade flow with steady ramp',
    baseStepMs: 120,
    minStepMs: 65,
    stepDecrementMs: 2.5,
    pointsPerFood: 15,
  },
  turbo: {
    id: 'turbo',
    label: 'Turbo',
    description: 'High-reflex speed from the opening move',
    baseStepMs: 90,
    minStepMs: 52,
    stepDecrementMs: 2,
    pointsPerFood: 20,
  },
}
